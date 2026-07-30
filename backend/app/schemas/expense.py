from datetime import datetime, date as dt_date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.services.currency import is_supported_currency


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


def _validate_currency(v: str | None) -> str | None:
    if v is not None and not is_supported_currency(v):
        raise ValueError(f"Unsupported currency: {v}")
    return v.upper() if v else v


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    currency: str | None = Field(None, min_length=3, max_length=3)
    merchant: str = Field(..., min_length=1, max_length=255)
    payment_method: str = Field(..., min_length=1, max_length=50)
    date: dt_date
    category_id: UUID | None = None
    notes: str | None = None
    receipt_id: UUID | None = None

    _validate_currency = field_validator("currency")(_validate_currency)


class ExpenseUpdate(BaseModel):
    amount: Decimal | None = Field(None, gt=0)
    currency: str | None = Field(None, min_length=3, max_length=3)
    merchant: str | None = Field(None, min_length=1, max_length=255)
    payment_method: str | None = Field(None, min_length=1, max_length=50)
    date: dt_date | None = None
    category_id: UUID | None = None
    notes: str | None = None
    receipt_id: UUID | None = None

    _validate_currency = field_validator("currency")(_validate_currency)


class ExpenseResponse(BaseModel):
    id: UUID
    user_id: UUID
    category_id: UUID | None = None
    category: CategoryResponse | None = None
    amount: Decimal
    currency: str
    amount_home_currency: Decimal
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
