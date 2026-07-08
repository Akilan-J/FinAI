from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


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
