from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.goal import Goal
from app.models.user import User
from app.schemas.auth import ResponseEnvelope
from app.schemas.goals import GoalCreate, GoalUpdate, GoalResponse

router = APIRouter()

@router.post("", response_model=ResponseEnvelope[GoalResponse])
async def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = Goal(
        user_id=current_user.id,
        name=payload.name,
        target_amount=payload.target_amount,
        current_amount=payload.current_amount,
        target_date=payload.target_date,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)

    return ResponseEnvelope(data=GoalResponse.model_validate(goal))

@router.get("", response_model=ResponseEnvelope[list[GoalResponse]])
async def get_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Goal).where(Goal.user_id == current_user.id).order_by(Goal.target_date.asc())
    result = await db.execute(stmt)
    goals = result.scalars().all()
    return ResponseEnvelope(data=[GoalResponse.model_validate(g) for g in goals])

@router.patch("/{id}", response_model=ResponseEnvelope[GoalResponse])
async def update_goal(
    id: UUID,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Goal).where(Goal.id == id, Goal.user_id == current_user.id)
    result = await db.execute(stmt)
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings goal not found",
        )

    if payload.name is not None:
        goal.name = payload.name
    if payload.target_amount is not None:
        goal.target_amount = payload.target_amount
    if payload.current_amount is not None:
        goal.current_amount = payload.current_amount
    if payload.target_date is not None:
        goal.target_date = payload.target_date

    await db.commit()
    await db.refresh(goal)
    return ResponseEnvelope(data=GoalResponse.model_validate(goal))

@router.delete("/{id}", response_model=ResponseEnvelope[dict])
async def delete_goal(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Goal).where(Goal.id == id, Goal.user_id == current_user.id)
    result = await db.execute(stmt)
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings goal not found",
        )

    await db.delete(goal)
    await db.commit()
    return ResponseEnvelope(data={"message": "Savings goal deleted successfully"})
