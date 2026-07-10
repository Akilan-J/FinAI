from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class GoalBase(BaseModel):
    name: str
    target_amount: Decimal
    current_amount: Decimal = Decimal("0.00")
    target_date: date

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount: Decimal | None = None
    current_amount: Decimal | None = None
    target_date: date | None = None

class GoalResponse(GoalBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
