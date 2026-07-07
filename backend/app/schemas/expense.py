from datetime import datetime, date as dt_date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    icon: str
    color: str
    is_default: bool

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: str = Field(..., min_length=1, max_length=50)
    color: str = Field(..., min_length=1, max_length=50)


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    merchant: str = Field(..., min_length=1, max_length=255)
    payment_method: str = Field(..., min_length=1, max_length=50)
    date: dt_date
    category_id: UUID | None = None
    notes: str | None = None
    receipt_id: UUID | None = None


class ExpenseUpdate(BaseModel):
    amount: Decimal | None = Field(None, gt=0)
    merchant: str | None = Field(None, min_length=1, max_length=255)
    payment_method: str | None = Field(None, min_length=1, max_length=50)
    date: dt_date | None = None
    category_id: UUID | None = None
    notes: str | None = None
    receipt_id: UUID | None = None


class ExpenseResponse(BaseModel):
    id: UUID
    user_id: UUID
    category_id: UUID | None = None
    category: CategoryResponse | None = None
    amount: Decimal
    merchant: str
    payment_method: str
    date: dt_date
    notes: str | None = None
    receipt_id: UUID | None = None
    ai_categorized: bool
    ai_confidence: float | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BulkDeleteRequest(BaseModel):
    ids: list[UUID] = Field(..., min_items=1)
