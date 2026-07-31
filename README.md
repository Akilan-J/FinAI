# FinAI — Personal Finance Assistant

Your AI-Powered Personal Finance Assistant.

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Python 3.10+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)

## Getting Started

### 1. Local Database & Redis (Docker)

Spin up PostgreSQL and Redis:

```bash
docker compose up -d
```

### 2. Backend Setup

Navigate to `backend`, set up a virtual environment, and install dependencies:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Run database migrations:

```bash
alembic upgrade head
```

Start the FastAPI backend server:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000/api/v1` and docs at `http://localhost:8000/docs`.

By default (`CELERY_ALWAYS_EAGER=False`), receipt OCR is processed by a Celery
worker rather than in-process. Run one locally:

```bash
celery -A app.core.celery_app.celery worker --loglevel=info
```

...or via Docker (reads config from `backend/.env`):

```bash
docker compose --profile worker up -d celery_worker
```

Set `CELERY_ALWAYS_EAGER=True` in `.env` instead if you'd rather skip running
a worker and have OCR run synchronously in the API process.

### 3. Frontend Setup

Navigate to `frontend`, install dependencies, and start Next.js dev server:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## Deploying to Railway

There's a `Dockerfile` in both `backend/` and `frontend/`, plus a
`railway.json` in each declaring the health check path. You'll create
**four services** in one Railway project, all pointed at this same GitHub
repo with a different **Root Directory** each. The steps that touch account
creation, billing, or secrets are yours to do — this only covers wiring the
repo up once you're in the dashboard.

### 1. Create the project and databases

1. [New Project on Railway](https://railway.app/new) → **Deploy from GitHub repo** → select this repo.
2. Add plugins: **+ New → Database → PostgreSQL** and **+ New → Database → Redis**. Railway wires their connection variables into any service you reference them from (via `${{Postgres.DATABASE_URL}}` / `${{Redis.REDIS_URL}}` variable references) — no need to copy values by hand.

### 2. Backend API service

Add a new service from the same repo, then in its **Settings**:
- **Root Directory**: `backend`
- **Variables** (Raw Editor is fastest):
  ```
  ENVIRONMENT=production
  SECRET_KEY=<generate with: openssl rand -hex 32>
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  REDIS_URL=${{Redis.REDIS_URL}}
  CELERY_ALWAYS_EAGER=False
  FRONTEND_URL=https://<your-frontend-service>.up.railway.app
  BACKEND_CORS_ORIGINS=https://<your-frontend-service>.up.railway.app
  OPENROUTER_API_KEY=<your key, for chat + OCR>
  SMTP_HOST=<your provider>
  SMTP_PORT=587
  SMTP_USER=<...>
  SMTP_PASSWORD=<...>
  SMTP_FROM_EMAIL=no-reply@yourdomain.com
  ```
  (`DATABASE_URL`/`REDIS_URL` accept Railway's `postgres://`/`redis://` format directly — the app rewrites the scheme itself. `BACKEND_CORS_ORIGINS` accepts a comma-separated list, not just JSON.)
- Railway auto-detects the `Dockerfile` and reads `railway.json` for the health check. The container runs `alembic upgrade head` before starting the API on every deploy, so migrations never need a manual step.
- Once deployed, copy its public URL (Settings → Networking → **Generate Domain**) — you'll need it for the frontend service.

### 3. Celery worker service

Add **another** service from the same repo:
- **Root Directory**: `backend` (same code, no separate Dockerfile)
- **Settings → Deploy → Custom Start Command**: `celery -A app.core.celery_app.celery worker --loglevel=info` (this overrides the Dockerfile's default CMD, so it doesn't also try to run migrations/uvicorn)
- Same environment variables as the API service above (it needs `DATABASE_URL`, `REDIS_URL`, and the OCR provider keys) — reuse variables via Railway's "variable references" between services instead of retyping them, or use a [shared variable group](https://docs.railway.com/guides/variables#shared-variables).
- **Don't** generate a public domain for this one; it doesn't serve HTTP.

### 4. Frontend service

Add a third service from the same repo:
- **Root Directory**: `frontend`
- **Variables**:
  ```
  NEXT_PUBLIC_API_URL=https://<your-backend-service>.up.railway.app/api/v1
  ```
  This is a build-time value (Next.js inlines `NEXT_PUBLIC_*` vars when it compiles), and the Dockerfile declares `ARG NEXT_PUBLIC_API_URL` so Railway forwards this service variable into the build automatically. If a deploy ever shows the frontend calling the wrong API host, the fix is to redeploy after confirming this variable is set — a plain restart won't pick up a build-time change.
- Generate its public domain, then go back to the **backend** service and update `FRONTEND_URL` / `BACKEND_CORS_ORIGINS` to match it exactly (including `https://`), and redeploy the backend so CORS actually allows requests from it.

### Order matters on the first deploy

Backend → get its URL → set it as `NEXT_PUBLIC_API_URL` on the frontend →
deploy frontend → get *its* URL → set `FRONTEND_URL`/`BACKEND_CORS_ORIGINS`
on the backend → redeploy the backend. After that, pushes to `main` redeploy
everything with the right values already in place.
