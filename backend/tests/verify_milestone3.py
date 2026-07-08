import httpx
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_tests():
    client = httpx.Client()
    
    # 1. Login user to get access token
    print("Step 1: Logging in...")
    login_payload = {
        "email": "testuser@example.com",
        "password": "strongpassword123"
    }
    login_response = client.post(f"{BASE_URL}/auth/login", json=login_payload)
    if login_response.status_code != 200:
        print("Error: Login failed! Did you run Milestone 1 verification script?")
        sys.exit(1)
        
    access_token = login_response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 2. Get categories
    print("\nStep 2: Retrieving categories...")
    cat_response = client.get(f"{BASE_URL}/categories", headers=headers)
    categories = cat_response.json()["data"]
    travel_cat = next((c for c in categories if c["name"] == "Travel"), None)
    if not travel_cat:
        print("Error: Travel category not found!")
        sys.exit(1)
        
    travel_cat_id = travel_cat["id"]
    print(f"Success: Selected category 'Travel' with ID {travel_cat_id}")
    
    # 3. Create a Budget
    print("\nStep 3: Creating a budget for Travel in 2026-07...")
    budget_payload = {
        "category_id": travel_cat_id,
        "amount_limit": 5000.00,
        "period": "2026-07",
        "alert_pct": 0.80
    }
    budget_res = client.post(f"{BASE_URL}/budgets", json=budget_payload, headers=headers)
    if budget_res.status_code != 200:
        print("Error: Failed to create budget!")
        print("Response:", budget_res.text)
        sys.exit(1)
        
    budget = budget_res.json()["data"]
    budget_id = budget["id"]
    print("Success: Budget created details:")
    print(" - Limit:", budget["amount_limit"])
    print(" - Spent so far:", budget["spent"])
    print(" - Progress percentage:", budget["progress"]["percentage_used"])
    
    # 4. Verify unique constraint (duplicate fails)
    print("\nStep 4: Verifying duplicate constraint...")
    duplicate_res = client.post(f"{BASE_URL}/budgets", json=budget_payload, headers=headers)
    if duplicate_res.status_code == 400:
        print("Success: Duplicate budget rejected correctly!")
    else:
        print("Error: Server allowed duplicate category period budget!")
        sys.exit(1)
        
    # 5. Create an Expense under Travel
    print("\nStep 5: Logging an expense of 2000.00 under Travel category...")
    expense_payload = {
        "amount": 2000.00,
        "merchant": "Uber Ride",
        "payment_method": "upi",
        "date": "2026-07-15",
        "category_id": travel_cat_id,
        "notes": "Office commute"
    }
    expense_res = client.post(f"{BASE_URL}/expenses", json=expense_payload, headers=headers)
    if expense_res.status_code != 200:
        print("Error: Failed to create expense!")
        sys.exit(1)
    expense = expense_res.json()["data"]
    expense_id = expense["id"]
    print("Success: Expense recorded!")
    
    # 6. Re-query budget, verify progress increments
    print("\nStep 6: Re-querying budgets to verify progress update...")
    query_res = client.get(f"{BASE_URL}/budgets?period=2026-07", headers=headers)
    budgets_list = query_res.json()["data"]
    travel_budget = next((b for b in budgets_list if b["id"] == budget_id), None)
    if not travel_budget:
        print("Error: Could not retrieve travel budget in query!")
        sys.exit(1)
        
    spent = float(travel_budget["spent"])
    print("Success: Travel budget progress loaded:")
    print(" - Spent amount:", spent)
    print(" - Percentage:", travel_budget["progress"]["percentage_used"])
    if spent != 2000.00:
        print(f"Error: Expected spent amount 2000.00, got {spent}!")
        sys.exit(1)
        
    # 7. Create Income
    print("\nStep 7: Recording income source...")
    income_payload = {
        "source": "Tech Consulting Job",
        "amount": 75000.00,
        "date": "2026-07-01",
        "notes": "Freelance payout",
        "is_recurring": False
    }
    income_res = client.post(f"{BASE_URL}/income", json=income_payload, headers=headers)
    if income_res.status_code != 200:
        print("Error: Failed to record income!")
        print("Response:", income_res.text)
        sys.exit(1)
        
    income = income_res.json()["data"]
    income_id = income["id"]
    print("Success: Recorded income of +₹", income["amount"])
    
    # 8. Query Income logs
    print("\nStep 8: Fetching income history...")
    list_res = client.get(f"{BASE_URL}/income", headers=headers)
    incomes = list_res.json()["data"]
    print(f"Success: Fetched {len(incomes)} logs")
    
    # Cleanup
    print("\nCleanup: Deleting test data...")
    client.delete(f"{BASE_URL}/expenses/{expense_id}", headers=headers)
    client.delete(f"{BASE_URL}/budgets/{budget_id}", headers=headers)
    client.delete(f"{BASE_URL}/income/{income_id}", headers=headers)
    print("Done: Test database tables are clean!")
    
    print("\n--- All Milestone 3 budgets and income checks passed! ---")

if __name__ == "__main__":
    run_tests()
