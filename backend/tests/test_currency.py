from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest

from app.services import currency as currency_service


@pytest.fixture(autouse=True)
def clear_rate_cache():
    currency_service._rate_cache.clear()
    yield
    currency_service._rate_cache.clear()


async def test_create_expense_same_currency_skips_fx_lookup(auth_client):
    # get_exchange_rate() short-circuits on same-currency before touching the
    # network — assert that HTTP layer is never reached for this case.
    with patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=AssertionError("should not be called"))):
        response = await auth_client.post(
            "/expenses",
            json={"amount": "100.00", "merchant": "Local Store", "payment_method": "cash", "date": "2026-07-01"},
        )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["currency"] == "INR"
    assert data["amount_home_currency"] == "100.00"


async def test_create_expense_different_currency_converts(auth_client):
    with patch.object(currency_service, "get_exchange_rate", new=AsyncMock(return_value=Decimal("90"))):
        response = await auth_client.post(
            "/expenses",
            json={
                "amount": "10.00",
                "currency": "USD",
                "merchant": "Overseas Shop",
                "payment_method": "card",
                "date": "2026-07-01",
            },
        )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["currency"] == "USD"
    assert data["amount"] == "10.00"
    assert data["amount_home_currency"] == "900.00"


async def test_create_expense_rejects_unsupported_currency(auth_client):
    response = await auth_client.post(
        "/expenses",
        json={"amount": "10.00", "currency": "ZZZ", "merchant": "Shop", "payment_method": "card", "date": "2026-07-01"},
    )
    assert response.status_code == 422


async def test_create_expense_returns_503_when_fx_unavailable(auth_client):
    with patch.object(
        currency_service,
        "get_exchange_rate",
        new=AsyncMock(side_effect=currency_service.CurrencyUnavailableError("rate service down")),
    ):
        response = await auth_client.post(
            "/expenses",
            json={
                "amount": "10.00",
                "currency": "USD",
                "merchant": "Overseas Shop",
                "payment_method": "card",
                "date": "2026-07-01",
            },
        )
    assert response.status_code == 503


async def test_update_expense_amount_recomputes_home_currency(auth_client):
    with patch.object(currency_service, "get_exchange_rate", new=AsyncMock(return_value=Decimal("90"))):
        create_response = await auth_client.post(
            "/expenses",
            json={
                "amount": "10.00",
                "currency": "USD",
                "merchant": "Overseas Shop",
                "payment_method": "card",
                "date": "2026-07-01",
            },
        )
        expense_id = create_response.json()["data"]["id"]

        update_response = await auth_client.put(
            f"/expenses/{expense_id}",
            json={"amount": "20.00"},
        )
    assert update_response.status_code == 200
    data = update_response.json()["data"]
    assert data["currency"] == "USD"
    assert data["amount"] == "20.00"
    assert data["amount_home_currency"] == "1800.00"


async def test_analytics_summary_sums_converted_amounts(auth_client):
    await auth_client.post(
        "/expenses",
        json={"amount": "100.00", "merchant": "Home Store", "payment_method": "cash", "date": "2026-07-01"},
    )
    with patch.object(currency_service, "get_exchange_rate", new=AsyncMock(return_value=Decimal("90"))):
        await auth_client.post(
            "/expenses",
            json={
                "amount": "10.00",
                "currency": "USD",
                "merchant": "Overseas Shop",
                "payment_method": "card",
                "date": "2026-07-05",
            },
        )

    response = await auth_client.get("/analytics/summary", params={"period": "2026-07"})
    assert response.status_code == 200
    assert response.json()["data"]["total_spent"] == "1000.00"


async def test_list_currencies_endpoint(auth_client):
    response = await auth_client.get("/currencies")
    assert response.status_code == 200
    codes = {c["code"] for c in response.json()["data"]}
    assert "INR" in codes
    assert "USD" in codes
