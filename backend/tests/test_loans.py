async def test_create_loan(auth_client):
    response = await auth_client.post(
        "/loans",
        json={"friend_name": "Alex", "type": "lent", "amount": "500.00"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["friend_name"] == "Alex"
    assert data["status"] == "pending"


async def test_list_loans_scoped_to_current_user(auth_client, client):
    await auth_client.post("/loans", json={"friend_name": "Alex", "type": "lent", "amount": "500.00"})

    other_register = await client.post(
        "/auth/register", json={"email": "other@example.com", "password": "password123"}
    )
    assert other_register.status_code == 200
    other_login = await client.post(
        "/auth/login", json={"email": "other@example.com", "password": "password123"}
    )
    other_token = other_login.json()["data"]["access_token"]

    response = await client.get("/loans", headers={"Authorization": f"Bearer {other_token}"})
    assert response.status_code == 200
    assert response.json()["data"] == []

    own_response = await auth_client.get("/loans")
    assert len(own_response.json()["data"]) == 1


async def test_update_loan_marks_settled(auth_client):
    create_response = await auth_client.post(
        "/loans",
        json={"friend_name": "Sam", "type": "borrowed", "amount": "200.00"},
    )
    loan_id = create_response.json()["data"]["id"]

    update_response = await auth_client.patch(
        f"/loans/{loan_id}",
        json={"paid_amount": "200.00", "status": "settled"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["data"]["status"] == "settled"


async def test_delete_loan(auth_client):
    create_response = await auth_client.post(
        "/loans",
        json={"friend_name": "Sam", "type": "borrowed", "amount": "200.00"},
    )
    loan_id = create_response.json()["data"]["id"]

    delete_response = await auth_client.delete(f"/loans/{loan_id}")
    assert delete_response.status_code == 200

    list_response = await auth_client.get("/loans")
    assert list_response.json()["data"] == []


async def test_update_loan_not_found_returns_404(auth_client):
    response = await auth_client.patch(
        "/loans/00000000-0000-0000-0000-000000000000",
        json={"status": "settled"},
    )
    assert response.status_code == 404


async def test_loans_require_authentication(client):
    response = await client.get("/loans")
    assert response.status_code == 401
