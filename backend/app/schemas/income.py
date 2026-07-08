from datetime import datetime, date as dt_date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field


class IncomeCreate(BaseModel):
    source: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=0)
    date: dt_date
    notes: str | None = None
    is_recurring: bool = False


class IncomeUpdate(BaseModel):
    source: str | None = Field(None, min_length=1, max_length=255)
    amount: Decimal | None = Field(None, gt=0)
    date: dt_date | None = None
    notes: str | None = None
    is_recurring: bool | None = None


class IncomeResponse(BaseModel):
    id: UUID
    user_id: UUID
    source: str
    amount: Decimal
    date: dt_date
    notes: str | None = None
    is_recurring: bool
    created_at: datetime

    class Config:
        from_attributes = True
