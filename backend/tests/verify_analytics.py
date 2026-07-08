import httpx
import sys
from decimal import Decimal

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
    shopping_cat = next((c for c in categories if c["name"] == "Shopping"), None)
    if not shopping_cat:
        print("Error: Shopping category not found!")
        sys.exit(1)
    shopping_id = shopping_cat["id"]
    
    # 3. Create a Budget for Shopping (limit 3000)
    print("\nStep 3: Creating a budget of 3000.00 for Shopping...")
    budget_payload = {
        "category_id": shopping_id,
        "amount_limit": 3000.00,
        "period": "2026-07",
        "alert_pct": 0.80
    }
    budget_res = client.post(f"{BASE_URL}/budgets", json=budget_payload, headers=headers)
    if budget_res.status_code != 200:
        print("Error: Failed to create budget!")
        sys.exit(1)
    budget_id = budget_res.json()["data"]["id"]
    
    # 4. Log 2 Expenses under Shopping (totaling 4000, exceeding budget)
    print("\nStep 4: Logging two expenses under Shopping category (total 4000.00)...")
    exp1_payload = {
        "amount": 2500.00,
        "merchant": "Amazon store",
        "payment_method": "card",
        "date": "2026-07-02",
        "category_id": shopping_id,
        "notes": "Monitor upgrade"
    }
    exp2_payload = {
        "amount": 1500.00,
        "merchant": "Mall outlet",
        "payment_method": "cash",
        "date": "2026-07-10",
        "category_id": shopping_id,
        "notes": "Clothes shopping"
    }
    e1 = client.post(f"{BASE_URL}/expenses", json=exp1_payload, headers=headers).json()["data"]
    e2 = client.post(f"{BASE_URL}/expenses", json=exp2_payload, headers=headers).json()["data"]
    print("Success: Expenses logged!")
    
    # 5. Log Income of 10000
    print("\nStep 5: Logging income inflow of +10000.00...")
    inc_payload = {
        "source": "Freelance Design",
        "amount": 10000.00,
        "date": "2026-07-01",
        "notes": "Landing page setup",
        "is_recurring": False
    }
    income = client.post(f"{BASE_URL}/income", json=inc_payload, headers=headers).json()["data"]
    income_id = income["id"]
    print("Success: Income logged!")
    
    # 6. Test GET /analytics/summary
    print("\nStep 6: Calling GET /analytics/summary...")
    sum_res = client.get(f"{BASE_URL}/analytics/summary?period=2026-07", headers=headers)
    if sum_res.status_code != 200:
        print("Error: Failed to fetch summary stats!")
        sys.exit(1)
    stats = sum_res.json()["data"]
    print("Success: Analytics Summary response details:")
    print(" - Total spent:", stats["total_spent"])
    print(" - Total income:", stats["total_income"])
    print(" - Net savings:", stats["net_savings"])
    print(" - Savings rate:", stats["savings_rate"], "%")
    print(" - Active budgets:", stats["active_budgets_count"])
    print(" - Over budget count:", stats["over_budget_count"])
    
    assert float(stats["total_spent"]) == 4000.00
    assert float(stats["total_income"]) == 10000.00
    assert float(stats["net_savings"]) == 6000.00
    assert float(stats["savings_rate"]) == 60.0
    assert stats["active_budgets_count"] == 1
    assert stats["over_budget_count"] == 1
    print("Success: Summary calculations match database inputs perfectly!")
    
    # 7. Test GET /analytics/category-distribution
    print("\nStep 7: Calling GET /analytics/category-distribution...")
    dist_res = client.get(f"{BASE_URL}/analytics/category-distribution?period=2026-07", headers=headers)
    distribution = dist_res.json()["data"]
    print("Success: Category spent allocation list:")
    for item in distribution:
        print(f" - {item['category_name']}: {item['amount']} ({item['percentage']}%)")
    assert len(distribution) == 1
    assert distribution[0]["category_name"] == "Shopping"
    assert float(distribution[0]["percentage"]) == 100.0
    
    # 8. Test GET /analytics/monthly-trends
    print("\nStep 8: Calling GET /analytics/monthly-trends...")
    trends_res = client.get(f"{BASE_URL}/analytics/monthly-trends?limit=6", headers=headers)
    trends = trends_res.json()["data"]
    print(f"Success: Fetched {len(trends)} monthly periods")
    for t in trends:
        print(f" - Month {t['period']}: Spent {t['total_spent']}, Inflow {t['total_income']}")
    assert len(trends) == 6
    assert trends[-1]["period"] == "2026-07"
    assert float(trends[-1]["total_spent"]) == 4000.00
    
    # Cleanup
    print("\nCleanup: Deleting test data...")
    client.delete(f"{BASE_URL}/expenses/{e1['id']}", headers=headers)
    client.delete(f"{BASE_URL}/expenses/{e2['id']}", headers=headers)
    client.delete(f"{BASE_URL}/budgets/{budget_id}", headers=headers)
    client.delete(f"{BASE_URL}/income/{income_id}", headers=headers)
    print("Done: Test database tables are clean!")
    
    print("\n--- All Milestone 4 Dashboard & Analytics checks passed! ---")

if __name__ == "__main__":
    run_tests()
