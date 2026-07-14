import calendar
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, and_, select, literal_column
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.expense import Expense
from app.models.income import Income
from app.models.user import User
from app.models.loan import Loan
from app.models.goal import Goal
from app.schemas.auth import ResponseEnvelope
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    CategoryDistributionItem,
    MonthlyTrendItem,
)
from app.api.v1.budgets import get_month_range

router = APIRouter()


def get_past_months(limit: int):
    today = date.today()
    periods = []
    for i in range(limit - 1, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        periods.append(f"{year}-{month:02d}")
    return periods


@router.get("/summary", response_model=ResponseEnvelope[AnalyticsSummaryResponse])
async def get_summary(
    period: str = Query(..., min_length=7, max_length=7),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_date, end_date = get_month_range(period)

    # 1. Total spent
    spent_stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.user_id == current_user.id,
        Expense.date >= start_date,
        Expense.date <= end_date,
    )
    spent_res = await db.execute(spent_stmt)
    total_spent = spent_res.scalar() or Decimal("0.00")

    # 2. Total income
    income_stmt = select(func.coalesce(func.sum(Income.amount), 0)).where(
        Income.user_id == current_user.id,
        Income.date >= start_date,
        Income.date <= end_date,
    )
    income_res = await db.execute(income_stmt)
    total_income = income_res.scalar() or Decimal("0.00")

    # Savings calculations
    net_savings = total_income - total_spent
    savings_rate = 0.0
    if total_income > 0:
        savings_rate = float(net_savings / total_income) * 100

    # 3. Active budgets count
    budgets_stmt = select(Budget).where(
        Budget.user_id == current_user.id,
        Budget.period == period,
    )
    budgets_res = await db.execute(budgets_stmt)
    user_budgets = budgets_res.scalars().all()
    active_budgets_count = len(user_budgets)

    # 4. Over budgets count
    over_budget_count = 0
    if active_budgets_count > 0:
        # Sum spent per category in period
        spent_subquery = (
            select(
                Expense.category_id,
                func.coalesce(func.sum(Expense.amount), 0).label("spent"),
            )
            .where(
                Expense.user_id == current_user.id,
                Expense.date >= start_date,
                Expense.date <= end_date,
            )
            .group_by(Expense.category_id)
            .subquery()
        )

        stmt = (
            select(Budget, func.coalesce(spent_subquery.c.spent, 0).label("spent"))
            .outerjoin(spent_subquery, Budget.category_id == spent_subquery.c.category_id)
            .where(Budget.user_id == current_user.id, Budget.period == period)
        )
        results = await db.execute(stmt)
        budget_rows = results.all()

        for row in budget_rows:
            budget_obj = row[0]
            spent_amount = row[1]
            if spent_amount > budget_obj.amount_limit:
                over_budget_count += 1

    summary = AnalyticsSummaryResponse(
        total_spent=total_spent,
        total_income=total_income,
        net_savings=net_savings,
        savings_rate=savings_rate,
        active_budgets_count=active_budgets_count,
        over_budget_count=over_budget_count,
    )

    return ResponseEnvelope(data=summary)


@router.get(
    "/category-distribution",
    response_model=ResponseEnvelope[list[CategoryDistributionItem]],
)
async def get_category_distribution(
    period: str = Query(..., min_length=7, max_length=7),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_date, end_date = get_month_range(period)

    # Total spent to compute percentage
    total_stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.user_id == current_user.id,
        Expense.date >= start_date,
        Expense.date <= end_date,
    )
    total_res = await db.execute(total_stmt)
    total_spent = total_res.scalar() or Decimal("0.00")

    # Categories allocation group-by
    stmt = (
        select(
            Expense.category_id,
            Category.name,
            Category.color,
            Category.icon,
            func.sum(Expense.amount).label("amount"),
        )
        .outerjoin(Category, Expense.category_id == Category.id)
        .where(
            Expense.user_id == current_user.id,
            Expense.date >= start_date,
            Expense.date <= end_date,
        )
        .group_by(Expense.category_id, Category.name, Category.color, Category.icon)
        .order_by(func.sum(Expense.amount).desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    distribution = []
    for row in rows:
        cat_id = row[0]
        cat_name = row[1] or "Others"
        cat_color = row[2] or "#6B7280"
        cat_icon = row[3] or "HelpCircle"
        amount = row[4] or Decimal("0.00")

        pct = 0.0
        if total_spent > 0:
            pct = float(amount / total_spent) * 100

        distribution.append(
            CategoryDistributionItem(
                category_id=cat_id,
                category_name=cat_name,
                color=cat_color,
                icon=cat_icon,
                amount=amount,
                percentage=pct,
            )
        )

    return ResponseEnvelope(data=distribution)


@router.get("/monthly-trends", response_model=ResponseEnvelope[list[MonthlyTrendItem]])
async def get_monthly_trends(
    limit: int = Query(6, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    periods = get_past_months(limit)

    # Date bounds
    start_date_oldest, _ = get_month_range(periods[0])
    _, end_date_current = get_month_range(periods[-1])

    expense_stmt = (
        select(
            func.to_char(Expense.date, literal_column("'YYYY-MM'")).label("month"),
            func.sum(Expense.amount).label("total"),
        )
        .where(
            Expense.user_id == current_user.id,
            Expense.date >= start_date_oldest,
            Expense.date <= end_date_current,
        )
        .group_by(func.to_char(Expense.date, literal_column("'YYYY-MM'")))
    )
    expense_res = await db.execute(expense_stmt)
    expense_map = {row[0]: row[1] for row in expense_res.all()}

    income_stmt = (
        select(
            func.to_char(Income.date, literal_column("'YYYY-MM'")).label("month"),
            func.sum(Income.amount).label("total"),
        )
        .where(
            Income.user_id == current_user.id,
            Income.date >= start_date_oldest,
            Income.date <= end_date_current,
        )
        .group_by(func.to_char(Income.date, literal_column("'YYYY-MM'")))
    )
    income_res = await db.execute(income_stmt)
    income_map = {row[0]: row[1] for row in income_res.all()}

    trends = []
    for p in periods:
        trends.append(
            MonthlyTrendItem(
                period=p,
                total_spent=expense_map.get(p, Decimal("0.00")),
                total_income=income_map.get(p, Decimal("0.00")),
            )
        )

    return ResponseEnvelope(data=trends)


@router.get("/challenges")
async def get_challenges_and_badges(
    period: str = Query(..., min_length=7, max_length=7),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_date, end_date = get_month_range(period)

    # 1. Total spent & income in this period
    spent_stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.user_id == current_user.id,
        Expense.date >= start_date,
        Expense.date <= end_date,
    )
    spent_res = await db.execute(spent_stmt)
    total_spent = spent_res.scalar() or Decimal("0.00")

    income_stmt = select(func.coalesce(func.sum(Income.amount), 0)).where(
        Income.user_id == current_user.id,
        Income.date >= start_date,
        Income.date <= end_date,
    )
    income_res = await db.execute(income_stmt)
    total_income = income_res.scalar() or Decimal("0.00")

    net_savings = total_income - total_spent
    savings_rate = 0.0
    if total_income > 0:
        savings_rate = float(net_savings / total_income) * 100

    # 2. Check budgets
    budgets_stmt = select(Budget).where(
        Budget.user_id == current_user.id,
        Budget.period == period,
    )
    budgets_res = await db.execute(budgets_stmt)
    user_budgets = budgets_res.scalars().all()
    active_budgets_count = len(user_budgets)

    over_budget_count = 0
    for b in user_budgets:
        exp_stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == current_user.id,
            Expense.category_id == b.category_id,
            Expense.date >= start_date,
            Expense.date <= end_date,
        )
        exp_res = await db.execute(exp_stmt)
        cat_spent = exp_res.scalar() or Decimal("0.00")
        if cat_spent > b.amount_limit:
            over_budget_count += 1

    # 3. Check for Settled Loans
    loans_stmt = select(func.count(Loan.id)).where(
        Loan.user_id == current_user.id,
        Loan.status == "settled"
    )
    loans_res = await db.execute(loans_stmt)
    settled_loans_count = loans_res.scalar() or 0

    # 4. Check for active Goals count
    goals_stmt = select(func.count(Goal.id)).where(
        Goal.user_id == current_user.id
    )
    goals_res = await db.execute(goals_stmt)
    goals_count = goals_res.scalar() or 0

    # 5. Check "No-Spend Weekend" status
    all_expenses_stmt = select(Expense.date).where(
        Expense.user_id == current_user.id,
        Expense.date >= start_date,
        Expense.date <= end_date,
    )
    all_expenses_res = await db.execute(all_expenses_stmt)
    expense_dates = all_expenses_res.scalars().all()
    
    weekend_expense_days = {d for d in expense_dates if d.weekday() in (5, 6)}
    
    import datetime
    current = start_date
    weekends_list = []
    while current <= end_date:
        if current.weekday() in (5, 6):
            weekends_list.append(current)
        current += datetime.timedelta(days=1)
        
    unspent_weekend_days = [d for d in weekends_list if d not in weekend_expense_days]
    no_spend_weekend_unlocked = len(unspent_weekend_days) >= 2

    challenges = [
        {
            "id": "no_spend_weekend",
            "title": "No-Spend Weekend",
            "description": "Have at least 2 weekend days (Sat/Sun) this month with ₹0 expenses.",
            "target": "2 days",
            "current": f"{len(unspent_weekend_days)} days",
            "status": "completed" if no_spend_weekend_unlocked else "in_progress",
            "badge_reward": "Thrifty Weekend Warrior",
        },
        {
            "id": "savings_streak",
            "title": "Savings Supercharger",
            "description": "Achieve a savings rate of 20% or more of your total income this period.",
            "target": "20.0%",
            "current": f"{savings_rate:.1f}%",
            "status": "completed" if savings_rate >= 20 else "in_progress",
            "badge_reward": "Savings Champion",
        },
        {
            "id": "budget_master",
            "title": "Budget Sentinel",
            "description": "Keep spending within active limits for all categories this period.",
            "target": "0 overages",
            "current": f"{over_budget_count} overages",
            "status": "completed" if active_budgets_count > 0 and over_budget_count == 0 else "in_progress",
            "badge_reward": "Budget Master",
        },
        {
            "id": "debt_solver",
            "title": "Debt Cleared",
            "description": "Settle at least one friend lend or loan record in full.",
            "target": "1 settled",
            "current": f"{settled_loans_count} settled",
            "status": "completed" if settled_loans_count >= 1 else "in_progress",
            "badge_reward": "Debt Liberator",
        }
    ]

    badges = [
        {
            "id": "savings_champ",
            "title": "Savings Champion",
            "description": "Savings rate >= 20% achieved.",
            "unlocked": savings_rate >= 20,
            "icon": "Award",
            "color": "violet",
        },
        {
            "id": "debt_liberator",
            "title": "Debt Liberator",
            "description": "Settled at least 1 friend debt ledger.",
            "unlocked": settled_loans_count >= 1,
            "icon": "ShieldCheck",
            "color": "emerald",
        },
        {
            "id": "budget_sentinel",
            "title": "Budget Sentinel",
            "description": "Maintained 0 over-budget folders.",
            "unlocked": active_budgets_count > 0 and over_budget_count == 0,
            "icon": "CheckCircle",
            "color": "indigo",
        },
        {
            "id": "goal_pioneer",
            "title": "Goal Pioneer",
            "description": "Created at least 2 active Savings Goals.",
            "unlocked": goals_count >= 2,
            "icon": "TrendingUp",
            "color": "amber",
        }
    ]

    return ResponseEnvelope(data={
        "challenges": challenges,
        "badges": badges,
    })

