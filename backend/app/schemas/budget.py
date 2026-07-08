import re
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.schemas.expense import CategoryResponse


class BudgetProgressResponse(BaseModel):
    spent_amount: Decimal
    remaining_amount: Decimal
    percentage_used: float
    over_limit: bool


class BudgetCreate(BaseModel):
    category_id: UUID
    amount_limit: Decimal = Field(..., gt=0)
    period: str = Field(..., min_length=7, max_length=7)  # YYYY-MM
    alert_pct: float = Field(0.80, ge=0.0, le=1.0)

    @field_validator("period")
    @classmethod
    def validate_period(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}$", v):
            raise ValueError("Period must match the format YYYY-MM")
        return v


class BudgetUpdate(BaseModel):
    amount_limit: Decimal | None = Field(None, gt=0)
    period: str | None = Field(None, min_length=7, max_length=7)
    alert_pct: float | None = Field(None, ge=0.0, le=1.0)

    @field_validator("period")
    @classmethod
    def validate_period(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\d{4}-\d{2}$", v):
            raise ValueError("Period must match the format YYYY-MM")
        return v


class BudgetResponse(BaseModel):
    id: UUID
    category_id: UUID
    category: CategoryResponse
    amount_limit: Decimal
    period: str
    alert_pct: float
    spent: Decimal
    progress: BudgetProgressResponse

    class Config:
        from_attributes = True
