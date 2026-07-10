from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class RecurringBillBase(BaseModel):
    name: str
    amount: Decimal
    category: str = "Subscription"
    frequency: str = "monthly"  # monthly, yearly, weekly
    next_due_date: date

class RecurringBillCreate(RecurringBillBase):
    pass

class RecurringBillUpdate(BaseModel):
    name: str | None = None
    amount: Decimal | None = None
    category: str | None = None
    frequency: str | None = None
    next_due_date: date | None = None

class RecurringBillResponse(RecurringBillBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
