from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.income import Income
from app.models.user import User
from app.schemas.auth import ResponseEnvelope
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse

router = APIRouter()


@router.post("", response_model=ResponseEnvelope[IncomeResponse])
async def create_income(
    payload: IncomeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    income = Income(
        user_id=current_user.id,
        source=payload.source,
        amount=payload.amount,
        date=payload.date,
        notes=payload.notes,
        is_recurring=payload.is_recurring,
    )
    db.add(income)
    await db.commit()
    await db.refresh(income)

    return ResponseEnvelope(data=IncomeResponse.model_validate(income))


@router.get("", response_model=ResponseEnvelope[list[IncomeResponse]])
async def get_incomes(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [Income.user_id == current_user.id]

    if from_date:
        filters.append(Income.date >= from_date)
    if to_date:
        filters.append(Income.date <= to_date)

    count_stmt = select(func.count(Income.id)).where(and_(*filters))
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    query = (
        select(Income)
        .where(and_(*filters))
        .order_by(desc(Income.date))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    incomes = result.scalars().all()

    meta = {"page": page, "limit": limit, "total": total}
    return ResponseEnvelope(
        data=[IncomeResponse.model_validate(inc) for inc in incomes],
        meta=meta,
    )


@router.get("/{id}", response_model=ResponseEnvelope[IncomeResponse])
async def get_income(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Income).where(Income.id == id, Income.user_id == current_user.id)
    result = await db.execute(stmt)
    income = result.scalars().first()
    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income log not found",
        )
    return ResponseEnvelope(data=IncomeResponse.model_validate(income))


@router.put("/{id}", response_model=ResponseEnvelope[IncomeResponse])
async def update_income(
    id: UUID,
    payload: IncomeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Income).where(Income.id == id, Income.user_id == current_user.id)
    result = await db.execute(stmt)
    income = result.scalars().first()
    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income log not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(income, key, value)

    await db.commit()
    await db.refresh(income)

    return ResponseEnvelope(data=IncomeResponse.model_validate(income))


@router.delete("/{id}", response_model=ResponseEnvelope[dict])
async def delete_income(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Income).where(Income.id == id, Income.user_id == current_user.id)
    result = await db.execute(stmt)
    income = result.scalars().first()
    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income log not found",
        )

    await db.delete(income)
    await db.commit()

    return ResponseEnvelope(data={"message": "Income log deleted successfully"})
