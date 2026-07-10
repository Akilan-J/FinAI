import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import async_session_maker
from app.db.seeding import seed_default_categories

# Import all SQLAlchemy models to register them on startup
from app.models.user import User
from app.models.session import UserSession
from app.models.category import Category
from app.models.receipt import Receipt
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.income import Income
from app.models.chat_message import ChatMessage
from app.models.goal import Goal
from app.models.recurring_bill import RecurringBill


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with async_session_maker() as db:
        await seed_default_categories(db)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Set CORS origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "project": settings.PROJECT_NAME,
        },
        "meta": {},
        "error": None
    }
