from unittest.mock import patch

from app.core.config import settings


async def test_login_cookie_is_lax_in_development(client, registered_user):
    response = await client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    set_cookie = response.headers.get("set-cookie", "")
    assert "samesite=lax" in set_cookie.lower()
    assert "secure" not in set_cookie.lower()


async def test_login_cookie_is_samesite_none_secure_in_production(client, registered_user):
    # Vercel (frontend) and Railway (backend) are different sites, so the
    # refresh-token cookie must be SameSite=None (paired with Secure) to be
    # sent on cross-site fetch calls at all.
    with patch.object(settings, "ENVIRONMENT", "production"):
        response = await client.post(
            "/auth/login",
            json={"email": registered_user["email"], "password": registered_user["password"]},
        )
    set_cookie = response.headers.get("set-cookie", "")
    assert "samesite=none" in set_cookie.lower()
    assert "secure" in set_cookie.lower()


async def test_register_creates_user(client):
    response = await client.post(
        "/auth/register",
        json={"email": "new@example.com", "password": "password123", "full_name": "New User"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["email"] == "new@example.com"
    assert "password" not in body["data"]


async def test_register_rejects_duplicate_email(client, registered_user):
    response = await client.post(
        "/auth/register",
        json={"email": registered_user["email"], "password": "another123"},
    )
    assert response.status_code == 400


async def test_login_succeeds_with_correct_credentials(client, registered_user):
    response = await client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()["data"]


async def test_login_fails_with_wrong_password(client, registered_user):
    response = await client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": "wrong-password"},
    )
    assert response.status_code == 401


async def test_me_requires_authentication(client):
    response = await client.get("/auth/me")
    assert response.status_code == 401


async def test_me_returns_current_user(auth_client, registered_user):
    response = await auth_client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["data"]["email"] == registered_user["email"]


async def test_forgot_password_never_leaks_token(client, registered_user):
    with patch("app.api.v1.auth.send_password_reset_email") as mock_send:
        response = await client.post("/auth/forgot-password", json={"email": registered_user["email"]})
    assert response.status_code == 200
    body = response.json()["data"]
    assert "token" not in str(body).lower()
    mock_send.assert_called_once()
    assert mock_send.call_args.args[0] == registered_user["email"]


async def test_forgot_password_unknown_email_gives_generic_response(client):
    response = await client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert response.status_code == 200
    assert "message" in response.json()["data"]


async def test_reset_password_with_valid_token_changes_password(client, registered_user):
    captured_link = {}

    def fake_send(to_email, reset_link):
        captured_link["link"] = reset_link

    with patch("app.api.v1.auth.send_password_reset_email", side_effect=fake_send):
        await client.post("/auth/forgot-password", json={"email": registered_user["email"]})

    token = captured_link["link"].split("token=")[1]

    response = await client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "brandnewpassword123"},
    )
    assert response.status_code == 200

    old_login = await client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": "brandnewpassword123"},
    )
    assert new_login.status_code == 200


async def test_reset_password_rejects_access_token(auth_client):
    access_token = auth_client.headers["Authorization"].split(" ")[1]
    response = await auth_client.post(
        "/auth/reset-password",
        json={"token": access_token, "new_password": "whatever123"},
    )
    assert response.status_code == 400
