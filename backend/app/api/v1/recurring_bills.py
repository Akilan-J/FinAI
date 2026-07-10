from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.recurring_bill import RecurringBill
from app.models.user import User
from app.schemas.auth import ResponseEnvelope
from app.schemas.recurring_bills import RecurringBillCreate, RecurringBillUpdate, RecurringBillResponse

router = APIRouter()

@router.post("", response_model=ResponseEnvelope[RecurringBillResponse])
async def create_recurring_bill(
    payload: RecurringBillCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bill = RecurringBill(
        user_id=current_user.id,
        name=payload.name,
        amount=payload.amount,
        category=payload.category,
        frequency=payload.frequency,
        next_due_date=payload.next_due_date,
    )
    db.add(bill)
    await db.commit()
    await db.refresh(bill)

    return ResponseEnvelope(data=RecurringBillResponse.model_validate(bill))

@router.get("", response_model=ResponseEnvelope[list[RecurringBillResponse]])
async def get_recurring_bills(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RecurringBill).where(RecurringBill.user_id == current_user.id).order_by(RecurringBill.next_due_date.asc())
    result = await db.execute(stmt)
    bills = result.scalars().all()
    return ResponseEnvelope(data=[RecurringBillResponse.model_validate(b) for b in bills])

@router.patch("/{id}", response_model=ResponseEnvelope[RecurringBillResponse])
async def update_recurring_bill(
    id: UUID,
    payload: RecurringBillUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RecurringBill).where(RecurringBill.id == id, RecurringBill.user_id == current_user.id)
    result = await db.execute(stmt)
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring bill not found",
        )

    if payload.name is not None:
        bill.name = payload.name
    if payload.amount is not None:
        bill.amount = payload.amount
    if payload.category is not None:
        bill.category = payload.category
    if payload.frequency is not None:
        bill.frequency = payload.frequency
    if payload.next_due_date is not None:
        bill.next_due_date = payload.next_due_date

    await db.commit()
    await db.refresh(bill)
    return ResponseEnvelope(data=RecurringBillResponse.model_validate(bill))

@router.delete("/{id}", response_model=ResponseEnvelope[dict])
async def delete_recurring_bill(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RecurringBill).where(RecurringBill.id == id, RecurringBill.user_id == current_user.id)
    result = await db.execute(stmt)
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring bill not found",
        )

    await db.delete(bill)
    await db.commit()
    return ResponseEnvelope(data={"message": "Recurring bill deleted successfully"})
