import httpx
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_tests():
    client = httpx.Client()
    
    # 1. Login user to get access token (already registered in Milestone 1 tests)
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
    
    # 2. Get categories (checks if seeding works)
    print("\nStep 2: Checking seeded categories...")
    cat_response = client.get(f"{BASE_URL}/categories", headers=headers)
    if cat_response.status_code != 200:
        print("Error: Failed to fetch categories!")
        sys.exit(1)
        
    categories = cat_response.json()["data"]
    print(f"Success: Found {len(categories)} categories")
    for cat in categories[:3]:
        print(f" - {cat['name']} (Icon: {cat['icon']}, Color: {cat['color']})")
        
    food_category = next((c for c in categories if c["name"] == "Food"), None)
    if not food_category:
        print("Error: 'Food' category not found in seeded defaults!")
        sys.exit(1)
        
    # 3. Create Expense
    print("\nStep 3: Creating an expense...")
    expense_payload = {
        "amount": 250.50,
        "merchant": "Starbucks Coffee",
        "payment_method": "card",
        "date": "2026-07-07",
        "category_id": food_category["id"],
        "notes": "Afternoon latte run"
    }
    create_response = client.post(f"{BASE_URL}/expenses", json=expense_payload, headers=headers)
    if create_response.status_code != 200:
        print("Error: Failed to create expense!")
        print("Status:", create_response.status_code)
        print("Body:", create_response.text)
        sys.exit(1)
        
    expense = create_response.json()["data"]
    expense_id = expense["id"]
    print("Success: Created expense!")
    print("Response:", expense)
    
    # 4. Get expense list (checks filtering & search)
    print("\nStep 4: Querying expense list with search term 'Starbucks'...")
    list_response = client.get(f"{BASE_URL}/expenses?search=Starbucks", headers=headers)
    if list_response.status_code != 200:
        print("Error: Failed to query expenses!")
        sys.exit(1)
        
    list_data = list_response.json()
    print(f"Success: Query matched {list_data['meta']['total']} items")
    print("Results:", list_data["data"])
    
    # 5. Update Expense
    print("\nStep 5: Updating expense amount to 280.00...")
    update_payload = {
        "amount": 280.00,
        "notes": "Late afternoon latte run - price update"
    }
    update_response = client.put(f"{BASE_URL}/expenses/{expense_id}", json=update_payload, headers=headers)
    if update_response.status_code != 200:
        print("Error: Failed to update expense!")
        sys.exit(1)
        
    updated_expense = update_response.json()["data"]
    print("Success: Updated expense details!")
    print("Response:", updated_expense)
    
    # 6. Delete Expense
    print("\nStep 6: Deleting expense...")
    delete_response = client.delete(f"{BASE_URL}/expenses/{expense_id}", headers=headers)
    if delete_response.status_code != 200:
        print("Error: Failed to delete expense!")
        sys.exit(1)
        
    print("Success: Deleted expense successfully!")
    
    print("\n--- All Backend Expenses API checks passed! ---")

if __name__ == "__main__":
    run_tests()
