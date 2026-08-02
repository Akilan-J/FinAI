from celery import Celery
from app.core.config import settings

import os

# Import every SQLAlchemy model so they're registered on Base's declarative
# registry before any task runs. Without this, string-based relationship()
# lookups (e.g. Receipt -> "User") fail with InvalidRequestError the first
# time a query actually touches them, because the worker process never
# imports app.main (which does this same thing for the API process).
from app.models.user import User  # noqa: F401
from app.models.session import UserSession  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.receipt import Receipt  # noqa: F401
from app.models.expense import Expense  # noqa: F401
from app.models.budget import Budget  # noqa: F401
from app.models.income import Income  # noqa: F401
from app.models.chat_message import ChatMessage  # noqa: F401
from app.models.goal import Goal  # noqa: F401
from app.models.recurring_bill import RecurringBill  # noqa: F401
from app.models.loan import Loan  # noqa: F401

celery = Celery(
    "tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    imports=["app.tasks.ocr"],
    task_always_eager=settings.CELERY_ALWAYS_EAGER,
)
