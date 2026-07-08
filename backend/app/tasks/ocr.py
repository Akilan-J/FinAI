import asyncio
import os
from uuid import UUID
from sqlalchemy.future import select
from app.core.celery_app import celery
from app.db.session import async_session_maker
from app.models.receipt import Receipt
from app.services.ocr import perform_ocr, extract_receipt_fields


@celery.task(name="process_receipt_ocr_task")
def process_receipt_ocr_task(receipt_id_str: str):
    async def _run():
        receipt_id = UUID(receipt_id_str)
        async with async_session_maker() as db:
            result = await db.execute(select(Receipt).where(Receipt.id == receipt_id))
            receipt = result.scalars().first()
            if not receipt:
                print(f"Receipt {receipt_id_str} not found in database.")
                return

            receipt.ocr_status = "processing"
            await db.commit()
            await db.refresh(receipt)

            try:
                filename = receipt.image_url.split("/")[-1]
                local_dir = os.path.join(os.getcwd(), "static", "uploads")
                file_path = os.path.join(local_dir, filename)

                if not os.path.exists(file_path):
                    raise FileNotFoundError(f"Local receipt image not found at {file_path}")

                raw_text = perform_ocr(file_path)
                extracted_data = extract_receipt_fields(raw_text)

                receipt.ocr_raw_text = raw_text
                receipt.extracted_json = extracted_data
                receipt.ocr_status = "completed"

            except Exception as e:
                print(f"Error processing receipt OCR: {e}")
                receipt.ocr_status = "failed"
                receipt.ocr_raw_text = f"Error: {str(e)}"
                receipt.extracted_json = None

            await db.commit()

    asyncio.run(_run())
