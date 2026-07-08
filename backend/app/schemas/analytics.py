from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class AnalyticsSummaryResponse(BaseModel):
    total_spent: Decimal
    total_income: Decimal
    net_savings: Decimal
    savings_rate: float
    active_budgets_count: int
    over_budget_count: int


class CategoryDistributionItem(BaseModel):
    category_id: UUID | None
    category_name: str
    color: str
    icon: str
    amount: Decimal
    percentage: float


class MonthlyTrendItem(BaseModel):
    period: str  # YYYY-MM
    total_spent: Decimal
    total_income: Decimal
