import asyncio
import os
import json
import httpx
from decimal import Decimal
from sqlalchemy import select, delete
from app.db.session import async_session_maker
from app.models.user import User
from app.models.session import UserSession
from app.models.category import Category
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.income import Income
from app.models.receipt import Receipt
from app.services.chat_agent import (
    list_expenses_tool,
    create_expense_tool,
    create_budget_tool,
    list_budgets_tool,
    get_analytics_summary_tool,
    mock_agent_stream
)
from app.core.security import get_password_hash

async def run_tests():
    print("--------------------------------------------------")
    print("Starting AI Chat Assistant Integration Checks...")
    print("--------------------------------------------------")

    async with async_session_maker() as db:
        # 1. Setup Test User
        email = "chatuser@example.com"
        password = "chatpassword123"
        
        # Cleanup past test user if any
        await db.execute(delete(User).where(User.email == email))
        await db.commit()

        # Create user
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            full_name="Chat User",
            currency="INR"
        )
        db.add(user)
        await db.flush()
        user_id = user.id
        await db.commit()
        print(f"Step 1: Test user created with ID: {user_id}")

        # 2. Test create_expense_tool
        print("\nStep 2: Testing create_expense_tool...")
        result = await create_expense_tool(
            db, user_id, 350.0, "travel", "Uber India", "2026-07-09"
        )
        print(f"Result: {result}")
        assert "Successfully logged expense" in result, "Expense creation tool failed"

        # 3. Test list_expenses_tool
        print("\nStep 3: Testing list_expenses_tool...")
        result = await list_expenses_tool(db, user_id)
        print(f"Result:\n{result}")
        assert "Uber India" in result, "Expense retrieval list tool failed"

        # 4. Test create_budget_tool & list_budgets_tool
        print("\nStep 4: Testing create_budget_tool...")
        result = await create_budget_tool(
            db, user_id, 8000.0, "travel", "2026-07"
        )
        print(f"Result: {result}")
        assert "Successfully set budget" in result, "Budget creation tool failed"

        result_b = await list_budgets_tool(db, user_id, "2026-07")
        print(f"List budgets result:\n{result_b}")
        assert "Limit ₹8000.00" in result_b, "Budget listing tool failed"

        # 5. Test get_analytics_summary_tool
        print("\nStep 5: Testing get_analytics_summary_tool...")
        result = await get_analytics_summary_tool(db, user_id, "2026-07")
        print(f"Result:\n{result}")
        assert "Total Expenses: ₹350.00" in result, "Analytics summary calculations failed"

        # 6. Test mock_agent_stream fallback parsing
        print("\nStep 6: Testing mock_agent_stream parser fallback...")
        prompts = [
            "show my expenses logs",
            "log food expense of ₹450 at Burger Joint",
            "what are my budgets?",
            "show monthly summary"
        ]
        for p in prompts:
            print(f"\nPrompt: '{p}'")
            async for chunk in mock_agent_stream(p, db, user_id):
                print(f"Response Chunk: {chunk}")

        # 7. Cleanup DB
        print("\nStep 7: Cleaning up test user...")
        # Category resolve cascades and deletes related expenses
        await db.execute(delete(User).where(User.id == user_id))
        await db.commit()
        print("Cleanup complete!")

    # 8. Test FastAPI SSE route
    print("\nStep 8: Testing HTTP SSE Route /chat/stream...")
    async with httpx.AsyncClient() as client:
        # Login to get credentials
        login_res = await client.post(
            "http://localhost:8000/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "strongpassword123"}
        )
        assert login_res.status_code == 200, "Failed to login as main test user"
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Send SSE request
        payload = {
            "messages": [
                {"role": "user", "content": "show my expenses logs"}
            ]
        }
        
        async with client.stream(
            "POST", "http://localhost:8000/api/v1/chat/stream",
            json=payload, headers=headers, timeout=10.0
        ) as response:
            assert response.status_code == 200, f"SSE stream request failed: {response.status_code}"
            print("Successfully opened connection. Listening to SSE stream...")
            
            # Read first few lines of stream
            lines_checked = 0
            async for line in response.aiter_lines():
                if line.strip():
                    print(f"SSE Line: {line}")
                    assert line.startswith("data: "), "Response line is not in SSE format"
                    data = json.loads(line[6:])
                    assert "content" in data or "error" in data, "Chunk missing expected keys"
                    lines_checked += 1
                    if lines_checked >= 1:
                        break

    print("\n--------------------------------------------------")
    print("--- All AI Chat Assistant Integration Checks passed! ---")
    print("--------------------------------------------------")

if __name__ == "__main__":
    asyncio.run(run_tests())
