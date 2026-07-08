from celery import Celery
from app.core.config import settings

import os

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
    task_always_eager=os.environ.get("CELERY_ALWAYS_EAGER", "False").lower() == "true",
)
