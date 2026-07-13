from fastapi import APIRouter
from app.api.v1 import auth, categories, expenses, budgets, income, analytics, receipts, chat, goals, recurring_bills, loans

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
api_router.include_router(income.router, prefix="/income", tags=["Income"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(receipts.router, prefix="/receipts", tags=["Receipts"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat Assistant"])
api_router.include_router(goals.router, prefix="/goals", tags=["Goals Planner"])
api_router.include_router(recurring_bills.router, prefix="/recurring-bills", tags=["Recurring Bills"])
api_router.include_router(loans.router, prefix="/loans", tags=["Lends and Loans"])

