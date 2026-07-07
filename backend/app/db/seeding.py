from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.category import Category

DEFAULT_CATEGORIES = [
    {"name": "Food", "icon": "Utensils", "color": "#EF4444"},
    {"name": "Travel", "icon": "Car", "color": "#3B82F6"},
    {"name": "Shopping", "icon": "ShoppingBag", "color": "#EC4899"},
    {"name": "Bills", "icon": "FileText", "color": "#F59E0B"},
    {"name": "Entertainment", "icon": "Film", "color": "#8B5CF6"},
    {"name": "Education", "icon": "GraduationCap", "color": "#10B981"},
    {"name": "Health", "icon": "HeartPulse", "color": "#14B8A6"},
    {"name": "Investment", "icon": "TrendingUp", "color": "#84CC16"},
    {"name": "Others", "icon": "HelpCircle", "color": "#6B7280"},
]


async def seed_default_categories(db: AsyncSession) -> None:
    for cat_data in DEFAULT_CATEGORIES:
        result = await db.execute(
            select(Category).where(
                Category.name == cat_data["name"],
                Category.is_default == True,
            )
        )
        existing = result.scalars().first()
        if not existing:
            category = Category(
                name=cat_data["name"],
                icon=cat_data["icon"],
                color=cat_data["color"],
                is_default=True,
                user_id=None,
            )
            db.add(category)
    await db.commit()
