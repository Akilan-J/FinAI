from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.loan import Loan
from app.models.user import User
from app.schemas.auth import ResponseEnvelope
from app.schemas.loans import LoanCreate, LoanUpdate, LoanResponse

router = APIRouter()

@router.post("", response_model=ResponseEnvelope[LoanResponse])
async def create_loan(
    payload: LoanCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    loan = Loan(
        user_id=current_user.id,
        friend_name=payload.friend_name,
        type=payload.type,
        amount=payload.amount,
        paid_amount=payload.paid_amount,
        status=payload.status,
        due_date=payload.due_date,
    )
    db.add(loan)
    await db.commit()
    await db.refresh(loan)

    return ResponseEnvelope(data=LoanResponse.model_validate(loan))

@router.get("", response_model=ResponseEnvelope[list[LoanResponse]])
async def get_loans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Loan).where(Loan.user_id == current_user.id).order_by(Loan.created_at.desc())
    result = await db.execute(stmt)
    loans = result.scalars().all()
    return ResponseEnvelope(data=[LoanResponse.model_validate(l) for l in loans])

@router.patch("/{id}", response_model=ResponseEnvelope[LoanResponse])
async def update_loan(
    id: UUID,
    payload: LoanUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Loan).where(Loan.id == id, Loan.user_id == current_user.id)
    result = await db.execute(stmt)
    loan = result.scalars().first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan record not found",
        )

    if payload.friend_name is not None:
        loan.friend_name = payload.friend_name
    if payload.type is not None:
        loan.type = payload.type
    if payload.amount is not None:
        loan.amount = payload.amount
    if payload.paid_amount is not None:
        loan.paid_amount = payload.paid_amount
    if payload.status is not None:
        loan.status = payload.status
    if payload.due_date is not None:
        loan.due_date = payload.due_date

    await db.commit()
    await db.refresh(loan)
    return ResponseEnvelope(data=LoanResponse.model_validate(loan))

@router.delete("/{id}", response_model=ResponseEnvelope[dict])
async def delete_loan(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Loan).where(Loan.id == id, Loan.user_id == current_user.id)
    result = await db.execute(stmt)
    loan = result.scalars().first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan record not found",
        )

    await db.delete(loan)
    await db.commit()
    return ResponseEnvelope(data={"message": "Loan record deleted successfully"})
