from fastapi import APIRouter
from app.api.v1 import auth, categories, expenses

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
