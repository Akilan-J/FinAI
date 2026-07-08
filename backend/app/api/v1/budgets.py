import calendar
from datetime import date
from decimal import Decimal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.expense import Expense
from app.models.user import User
from app.schemas.auth import ResponseEnvelope
from app.schemas.expense import CategoryResponse
from app.schemas.budget import (
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse,
    BudgetProgressResponse,
)

router = APIRouter()


def get_month_range(period: str):
    try:
        year, month = map(int, period.split("-"))
        start_date = date(year, month, 1)
        last_day = calendar.monthrange(year, month)[1]
        end_date = date(year, month, last_day)
        return start_date, end_date
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid period format. Must be YYYY-MM",
        )


def make_budget_response(budget: Budget, spent: Decimal) -> BudgetResponse:
    remaining = budget.amount_limit - spent
    pct = float(spent / budget.amount_limit) if budget.amount_limit > 0 else 0.0
    over = spent > budget.amount_limit

    progress = BudgetProgressResponse(
        spent_amount=spent,
        remaining_amount=remaining,
        percentage_used=pct,
        over_limit=over,
    )

    return BudgetResponse(
        id=budget.id,
        category_id=budget.category_id,
        category=CategoryResponse.model_validate(budget.category),
        amount_limit=budget.amount_limit,
        period=budget.period,
        alert_pct=budget.alert_pct,
        spent=spent,
        progress=progress,
    )


@router.post("", response_model=ResponseEnvelope[BudgetResponse])
async def create_budget(
    payload: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify category
    result = await db.execute(
        select(Category).where(
            Category.id == payload.category_id,
            (Category.user_id == None) | (Category.user_id == current_user.id),
        )
    )
    category = result.scalars().first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Check existing budget
    existing_stmt = select(Budget).where(
        Budget.user_id == current_user.id,
        Budget.period == payload.period,
        Budget.category_id == payload.category_id,
    )
    existing_res = await db.execute(existing_stmt)
    if existing_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A budget for this category and period already exists.",
        )

    budget = Budget(
        user_id=current_user.id,
        category_id=payload.category_id,
        amount_limit=payload.amount_limit,
        period=payload.period,
        alert_pct=payload.alert_pct,
    )
    db.add(budget)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A budget for this category and period already exists.",
        )

    # Reload budget with category relation
    reload_stmt = (
        select(Budget)
        .options(selectinload(Budget.category))
        .where(Budget.id == budget.id)
    )
    reloaded_res = await db.execute(reload_stmt)
    reloaded_budget = reloaded_res.scalars().first()

    # Get spent amount
    start_date, end_date = get_month_range(payload.period)
    spent_stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.user_id == current_user.id,
        Expense.category_id == payload.category_id,
        Expense.date >= start_date,
        Expense.date <= end_date,
    )
    spent_res = await db.execute(spent_stmt)
    spent = spent_res.scalar() or Decimal("0.00")

    return ResponseEnvelope(data=make_budget_response(reloaded_budget, spent))


@router.get("", response_model=ResponseEnvelope[list[BudgetResponse]])
async def get_budgets(
    period: str = Query(..., min_length=7, max_length=7),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_date, end_date = get_month_range(period)

    # Subquery to aggregate spent amount per category
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

    # Query budgets joined with category and spent subquery
    stmt = (
        select(Budget, func.coalesce(spent_subquery.c.spent, 0).label("spent"))
        .options(selectinload(Budget.category))
        .outerjoin(spent_subquery, Budget.category_id == spent_subquery.c.category_id)
        .where(Budget.user_id == current_user.id, Budget.period == period)
    )
    results = await db.execute(stmt)
    budget_rows = results.all()

    envelope_data = [make_budget_response(row[0], row[1]) for row in budget_rows]
    return ResponseEnvelope(data=envelope_data)


@router.get("/{id}", response_model=ResponseEnvelope[BudgetResponse])
async def get_budget(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Budget)
        .options(selectinload(Budget.category))
        .where(Budget.id == id, Budget.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    budget = result.scalars().first()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    # Get spent amount
    start_date, end_date = get_month_range(budget.period)
    spent_stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.user_id == current_user.id,
        Expense.category_id == budget.category_id,
        Expense.date >= start_date,
        Expense.date <= end_date,
    )
    spent_res = await db.execute(spent_stmt)
    spent = spent_res.scalar() or Decimal("0.00")

    return ResponseEnvelope(data=make_budget_response(budget, spent))


@router.put("/{id}", response_model=ResponseEnvelope[BudgetResponse])
async def update_budget(
    id: UUID,
    payload: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Budget)
        .options(selectinload(Budget.category))
        .where(Budget.id == id, Budget.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    budget = result.scalars().first()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(budget, key, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Budget update caused a duplicate period and category constraint.",
        )

    # Get spent amount
    start_date, end_date = get_month_range(budget.period)
    spent_stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.user_id == current_user.id,
        Expense.category_id == budget.category_id,
        Expense.date >= start_date,
        Expense.date <= end_date,
    )
    spent_res = await db.execute(spent_stmt)
    spent = spent_res.scalar() or Decimal("0.00")

    return ResponseEnvelope(data=make_budget_response(budget, spent))


@router.delete("/{id}", response_model=ResponseEnvelope[dict])
async def delete_budget(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Budget).where(Budget.id == id, Budget.user_id == current_user.id)
    result = await db.execute(stmt)
    budget = result.scalars().first()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    await db.delete(budget)
    await db.commit()

    return ResponseEnvelope(data={"message": "Budget deleted successfully"})


@router.get("/{id}/progress", response_model=ResponseEnvelope[BudgetProgressResponse])
async def get_budget_progress(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Budget).where(Budget.id == id, Budget.user_id == current_user.id)
    result = await db.execute(stmt)
    budget = result.scalars().first()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    # Calculate spent
    start_date, end_date = get_month_range(budget.period)
    spent_stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.user_id == current_user.id,
        Expense.category_id == budget.category_id,
        Expense.date >= start_date,
        Expense.date <= end_date,
    )
    spent_res = await db.execute(spent_stmt)
    spent = spent_res.scalar() or Decimal("0.00")

    remaining = budget.amount_limit - spent
    pct = float(spent / budget.amount_limit) if budget.amount_limit > 0 else 0.0
    over = spent > budget.amount_limit

    progress = BudgetProgressResponse(
        spent_amount=spent,
        remaining_amount=remaining,
        percentage_used=pct,
        over_limit=over,
    )

    return ResponseEnvelope(data=progress)
