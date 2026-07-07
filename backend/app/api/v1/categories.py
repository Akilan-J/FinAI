from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.auth import ResponseEnvelope
from app.schemas.expense import CategoryCreate, CategoryResponse

router = APIRouter()


@router.get("", response_model=ResponseEnvelope[list[CategoryResponse]])
async def get_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).where(
            (Category.user_id == None) | (Category.user_id == current_user.id)
        )
    )
    categories = result.scalars().all()

    return ResponseEnvelope(
        data=[CategoryResponse.model_validate(c) for c in categories]
    )


@router.post("", response_model=ResponseEnvelope[CategoryResponse])
async def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).where(
            Category.name == payload.name,
            (Category.user_id == None) | (Category.user_id == current_user.id)
        )
    )
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name already exists",
        )

    category = Category(
        name=payload.name,
        icon=payload.icon,
        color=payload.color,
        is_default=False,
        user_id=current_user.id,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    return ResponseEnvelope(data=CategoryResponse.model_validate(category))
