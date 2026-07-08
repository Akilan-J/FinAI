from datetime import datetime, date as dt_date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field


class ReceiptResponse(BaseModel):
    id: UUID
    user_id: UUID
    image_url: str
    ocr_status: str
    ocr_raw_text: str | None = None
    extracted_json: dict | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReceiptConvertRequest(BaseModel):
    category_id: UUID
    amount: Decimal = Field(..., gt=0)
    merchant: str = Field(..., min_length=1, max_length=255)
    date: dt_date
    notes: str | None = None
