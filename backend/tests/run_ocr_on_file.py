import sys
import json
import os
from dotenv import load_dotenv
from app.services.ocr import perform_ocr, extract_receipt_fields

def main():
    load_dotenv()
    file_path = "/Users/akilan/Downloads/IMG_8852.jpg"
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} does not exist.")
        sys.exit(1)
        
    print(f"Reading file: {file_path}")
    raw_text = perform_ocr(file_path)
    print("----------------------------------------")
    print("Raw OCR Output:")
    print(raw_text)
    print("----------------------------------------")
    extracted = extract_receipt_fields(raw_text)
    print("Extracted Json:")
    print(json.dumps(extracted, indent=2))

if __name__ == "__main__":
    main()
