import httpx
import sys
import os

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
    food_cat = next((c for c in categories if c["name"] == "Food"), None)
    if not food_cat:
        print("Error: Food category not found!")
        sys.exit(1)
    food_id = food_cat["id"]
    
    # 3. Create a dummy receipt file on disk
    print("\nStep 3: Creating dummy Starbucks receipt file on disk...")
    dummy_filename = "dummy_starbucks_receipt.png"
    dummy_path = os.path.join(os.getcwd(), "tests", dummy_filename)
    os.makedirs(os.path.dirname(dummy_path), exist_ok=True)
    with open(dummy_path, "wb") as f:
        f.write(b"PNG mock receipt file content")
        
    # 4. Upload file
    print("\nStep 4: Uploading receipt to POST /receipts/upload...")
    with open(dummy_path, "rb") as f:
        files = {"file": (dummy_filename, f, "image/png")}
        upload_res = client.post(f"{BASE_URL}/receipts/upload", files=files, headers=headers)
        
    if upload_res.status_code != 200:
        print("Error: Upload failed!")
        print("Response:", upload_res.text)
        sys.exit(1)
        
    receipt = upload_res.json()["data"]
    receipt_id = receipt["id"]
    print("Success: Receipt uploaded!")
    print(" - OCR Status:", receipt["ocr_status"])
    print(" - Extracted details:", receipt["extracted_json"])
    
    # Note: Because CELERY_ALWAYS_EAGER=true is set when running the backend,
    # the background task runs synchronously inline, so status should be 'completed' immediately!
    if receipt["ocr_status"] != "completed":
        print(f"Error: Expected synchronous completion, got status: {receipt['ocr_status']}")
        sys.exit(1)
        
    # Verify extracted details match mock template for 'starbucks'
    extracted = receipt["extracted_json"]
    assert "STARBUCKS" in extracted["merchant"].upper()
    assert float(extracted["amount"]) == 280.00
    assert extracted["date"] == "2026-07-09"
    print("Success: Extracted fields match mock Starbucks receipt template perfectly!")
    
    # 5. Convert receipt to Expense
    print("\nStep 5: Converting receipt to expense using POST /receipts/{id}/convert...")
    convert_payload = {
        "category_id": food_id,
        "amount": 280.00,
        "merchant": "Starbucks Coffee Store #1432",
        "date": "2026-07-09",
        "notes": "Verified afternoon mocha latte"
    }
    convert_res = client.post(
        f"{BASE_URL}/receipts/{receipt_id}/convert",
        json=convert_payload,
        headers=headers
    )
    if convert_res.status_code != 200:
        print("Error: Conversion failed!")
        print("Response:", convert_res.text)
        sys.exit(1)
        
    expense = convert_res.json()["data"]
    expense_id = expense["id"]
    print("Success: Receipt successfully converted to linked expense!")
    print(" - Expense ID:", expense_id)
    print(" - Linked Receipt ID:", expense["receipt_id"])
    assert expense["receipt_id"] == receipt_id
    
    # 6. Verify receipt status is now 'converted'
    print("\nStep 6: Verifying receipt status is updated to 'converted'...")
    check_res = client.get(f"{BASE_URL}/receipts/{receipt_id}", headers=headers)
    receipt_checked = check_res.json()["data"]
    print(" - New OCR Status:", receipt_checked["ocr_status"])
    assert receipt_checked["ocr_status"] == "converted"
    print("Success: Receipt status verified!")
    
    # Cleanup
    print("\nCleanup: Deleting test data...")
    client.delete(f"{BASE_URL}/expenses/{expense_id}", headers=headers)
    
    # Delete uploaded file on disk
    filename_on_disk = receipt["image_url"].split("/")[-1]
    disk_path = os.path.join(os.getcwd(), "static", "uploads", filename_on_disk)
    if os.path.exists(disk_path):
        os.remove(disk_path)
    if os.path.exists(dummy_path):
        os.remove(dummy_path)
        
    print("Done: Test database tables and files are clean!")
    
    print("\n--- All Milestone 5 Receipt OCR & Upload checks passed! ---")

if __name__ == "__main__":
    run_tests()
