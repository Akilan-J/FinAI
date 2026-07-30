from datetime import datetime, date as dt_date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.services.currency import is_supported_currency


def _validate_currency(v: str | None) -> str | None:
    if v is not None and not is_supported_currency(v):
        raise ValueError(f"Unsupported currency: {v}")
    return v.upper() if v else v


class IncomeCreate(BaseModel):
    source: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=0)
    currency: str | None = Field(None, min_length=3, max_length=3)
    date: dt_date
    notes: str | None = None
    is_recurring: bool = False

    _validate_currency = field_validator("currency")(_validate_currency)


class IncomeUpdate(BaseModel):
    source: str | None = Field(None, min_length=1, max_length=255)
    amount: Decimal | None = Field(None, gt=0)
    currency: str | None = Field(None, min_length=3, max_length=3)
    date: dt_date | None = None
    notes: str | None = None
    is_recurring: bool | None = None

    _validate_currency = field_validator("currency")(_validate_currency)


class IncomeResponse(BaseModel):
    id: UUID
    user_id: UUID
    source: str
    amount: Decimal
    currency: str
    amount_home_currency: Decimal
    date: dt_date
    notes: str | None = None
    is_recurring: bool
    created_at: datetime

    class Config:
        from_attributes = True
