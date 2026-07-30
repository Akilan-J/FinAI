import logging
import time
from decimal import Decimal

import httpx

logger = logging.getLogger("finai.currency")

FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v1"

# Curated subset of what Frankfurter (ECB rates) supports — enough for a
# personal finance app without dumping every ISO code into a dropdown.
SUPPORTED_CURRENCIES: dict[str, dict[str, str]] = {
    "INR": {"symbol": "₹", "name": "Indian Rupee"},
    "USD": {"symbol": "$", "name": "US Dollar"},
    "EUR": {"symbol": "€", "name": "Euro"},
    "GBP": {"symbol": "£", "name": "British Pound"},
    "JPY": {"symbol": "¥", "name": "Japanese Yen"},
    "AUD": {"symbol": "A$", "name": "Australian Dollar"},
    "CAD": {"symbol": "C$", "name": "Canadian Dollar"},
    "SGD": {"symbol": "S$", "name": "Singapore Dollar"},
    "CNY": {"symbol": "¥", "name": "Chinese Yuan"},
    "CHF": {"symbol": "CHF", "name": "Swiss Franc"},
}

_RATE_CACHE_TTL_SECONDS = 6 * 60 * 60  # exchange rates don't need to be fresher than this
_rate_cache: dict[tuple[str, str], tuple[float, Decimal]] = {}


class CurrencyUnavailableError(RuntimeError):
    """Raised when an exchange rate can't be fetched. Never fall back to a fabricated rate."""


def is_supported_currency(code: str) -> bool:
    return code.upper() in SUPPORTED_CURRENCIES


async def get_exchange_rate(from_currency: str, to_currency: str) -> Decimal:
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    if from_currency == to_currency:
        return Decimal("1")

    cache_key = (from_currency, to_currency)
    cached = _rate_cache.get(cache_key)
    if cached and (time.monotonic() - cached[0]) < _RATE_CACHE_TTL_SECONDS:
        return cached[1]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{FRANKFURTER_BASE_URL}/latest",
                params={"from": from_currency, "to": to_currency},
            )
            response.raise_for_status()
            data = response.json()
            rate = Decimal(str(data["rates"][to_currency]))
    except Exception as e:
        logger.warning("Failed to fetch exchange rate %s->%s: %s", from_currency, to_currency, e)
        raise CurrencyUnavailableError(
            f"Could not fetch the exchange rate for {from_currency} to {to_currency}. "
            "Please try again shortly."
        ) from e

    _rate_cache[cache_key] = (time.monotonic(), rate)
    return rate


async def convert_amount(amount: Decimal, from_currency: str, to_currency: str) -> tuple[Decimal, Decimal]:
    """Returns (converted_amount, exchange_rate_used)."""
    rate = await get_exchange_rate(from_currency, to_currency)
    return (amount * rate).quantize(Decimal("0.01")), rate


async def resolve_home_currency_amount(
    amount: Decimal, currency: str | None, home_currency: str
) -> tuple[str, Decimal]:
    """Resolves the transaction currency (defaulting to the user's home currency)
    and converts the amount into that home currency for aggregation.

    Raises CurrencyUnavailableError if a needed exchange rate can't be fetched.
    """
    resolved_currency = (currency or home_currency).upper()
    amount_home_currency, _rate = await convert_amount(amount, resolved_currency, home_currency)
    return resolved_currency, amount_home_currency
