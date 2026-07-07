from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.category import Category
from app.models.expense import Expense
from app.models.user import User
from app.schemas.auth import ResponseEnvelope
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    BulkDeleteRequest,
)

router = APIRouter()


@router.post("", response_model=ResponseEnvelope[ExpenseResponse])
async def create_expense(
    payload: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    category = None
    if payload.category_id:
        result = await db.execute(
            select(Category).where(
                Category.id == payload.category_id,
                (Category.user_id == None) | (Category.user_id == current_user.id)
            )
        )
        category = result.scalars().first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
    else:
        result = await db.execute(
            select(Category).where(Category.name == "Others", Category.is_default == True)
        )
        category = result.scalars().first()

    expense = Expense(
        user_id=current_user.id,
        category_id=category.id if category else None,
        amount=payload.amount,
        merchant=payload.merchant,
        payment_method=payload.payment_method,
        date=payload.date,
        notes=payload.notes,
        receipt_id=payload.receipt_id,
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)

    result = await db.execute(
        select(Expense)
        .options(selectinload(Expense.category))
        .where(Expense.id == expense.id)
    )
    expense_loaded = result.scalars().first()

    return ResponseEnvelope(data=ExpenseResponse.model_validate(expense_loaded))


@router.get("", response_model=ResponseEnvelope[list[ExpenseResponse]])
async def get_expenses(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: UUID | None = Query(None),
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    search: str | None = Query(None),
    sort: str = Query("date:desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [Expense.user_id == current_user.id]

    if category:
        filters.append(Expense.category_id == category)
    if from_date:
        filters.append(Expense.date >= from_date)
    if to_date:
        filters.append(Expense.date <= to_date)
    if search:
        filters.append(
            or_(
                Expense.merchant.ilike(f"%{search}%"),
                Expense.notes.ilike(f"%{search}%"),
            )
        )

    count_stmt = select(func.count(Expense.id)).where(and_(*filters))
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    sort_field_name, sort_order = "date", "desc"
    if ":" in sort:
        sort_field_name, sort_order = sort.split(":", 1)

    sort_column = Expense.date
    if sort_field_name == "amount":
        sort_column = Expense.amount
    elif sort_field_name == "merchant":
        sort_column = Expense.merchant

    order_by = desc(sort_column) if sort_order == "desc" else asc(sort_column)

    query = (
        select(Expense)
        .options(selectinload(Expense.category))
        .where(and_(*filters))
        .order_by(order_by)
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    expenses = result.scalars().all()

    meta = {"page": page, "limit": limit, "total": total}
    return ResponseEnvelope(
        data=[ExpenseResponse.model_validate(e) for e in expenses],
        meta=meta
    )


@router.get("/{id}", response_model=ResponseEnvelope[ExpenseResponse])
async def get_expense(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense)
        .options(selectinload(Expense.category))
        .where(Expense.id == id, Expense.user_id == current_user.id)
    )
    expense = result.scalars().first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    return ResponseEnvelope(data=ExpenseResponse.model_validate(expense))


@router.put("/{id}", response_model=ResponseEnvelope[ExpenseResponse])
async def update_expense(
    id: UUID,
    payload: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).where(Expense.id == id, Expense.user_id == current_user.id)
    )
    expense = result.scalars().first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )

    if payload.category_id is not None:
        cat_result = await db.execute(
            select(Category).where(
                Category.id == payload.category_id,
                (Category.user_id == None) | (Category.user_id == current_user.id)
            )
        )
        category = cat_result.scalars().first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
        expense.category_id = payload.category_id

    update_data = payload.model_dump(exclude_unset=True, exclude={"category_id"})
    for key, value in update_data.items():
        setattr(expense, key, value)

    await db.commit()

    reload_result = await db.execute(
        select(Expense)
        .options(selectinload(Expense.category))
        .where(Expense.id == id)
    )
    expense_loaded = reload_result.scalars().first()

    return ResponseEnvelope(data=ExpenseResponse.model_validate(expense_loaded))


@router.delete("/{id}", response_model=ResponseEnvelope[dict])
async def delete_expense(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).where(Expense.id == id, Expense.user_id == current_user.id)
    )
    expense = result.scalars().first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )

    await db.delete(expense)
    await db.commit()

    return ResponseEnvelope(data={"message": "Expense deleted successfully"})


@router.post("/bulk-delete", response_model=ResponseEnvelope[dict])
async def bulk_delete_expenses(
    payload: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).where(
            Expense.id.in_(payload.ids),
            Expense.user_id == current_user.id
        )
    )
    expenses = result.scalars().all()

    count = len(expenses)
    for expense in expenses:
        await db.delete(expense)

    await db.commit()

    return ResponseEnvelope(
        data={"message": f"Successfully deleted {count} expenses"}
    )
