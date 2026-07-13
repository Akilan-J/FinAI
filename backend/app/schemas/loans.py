from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class LoanBase(BaseModel):
    friend_name: str
    type: str  # "lent" or "borrowed"
    amount: Decimal
    paid_amount: Decimal = Decimal("0.00")
    status: str = "pending"
    due_date: date | None = None

class LoanCreate(LoanBase):
    pass

class LoanUpdate(BaseModel):
    friend_name: str | None = None
    type: str | None = None
    amount: Decimal | None = None
    paid_amount: Decimal | None = None
    status: str | None = None
    due_date: date | None = None

class LoanResponse(LoanBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
