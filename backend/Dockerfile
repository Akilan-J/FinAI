FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default: run pending migrations then serve the API on Railway's assigned
# $PORT (falls back to 8000 for local `docker run`). The Celery worker uses
# this same image with a "Custom Start Command" override — see README.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
