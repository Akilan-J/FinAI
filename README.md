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
celery -A app.core.celery_app.celery worker --loglevel=info --concurrency=2
```

(`--concurrency` caps how many worker processes Celery forks — its default is
one per detected CPU core, which is overkill for occasional OCR jobs and can
exhaust memory on a small container. Tune it up if you're processing receipts
at real volume.)

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

## Deploying: Vercel (frontend) + Railway (backend)

The frontend deploys to Vercel (native Next.js hosting); the backend API,
Celery worker, Postgres, and Redis stay on Railway, since Vercel has no way
to run a persistent worker process or a long-lived SSE chat stream. `frontend/Dockerfile`
is kept in the repo as a fallback if you ever want to self-host the frontend
elsewhere instead — Vercel's build doesn't use it. The steps that touch
account creation, billing, or secrets are yours to do — this only covers
wiring the repo up once you're in each dashboard.

### 1. Create the Railway project and databases

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
  FRONTEND_URL=https://<your-app>.vercel.app
  BACKEND_CORS_ORIGINS=https://<your-app>.vercel.app
  OPENROUTER_API_KEY=<your key, for chat + OCR>
  SMTP_HOST=<your provider>
  SMTP_PORT=587
  SMTP_USER=<...>
  SMTP_PASSWORD=<...>
  SMTP_FROM_EMAIL=no-reply@yourdomain.com
  ```
  (`DATABASE_URL`/`REDIS_URL` accept Railway's `postgres://`/`redis://` format directly — the app rewrites the scheme itself. `BACKEND_CORS_ORIGINS` accepts a comma-separated list, not just JSON.)
- Railway auto-detects the `Dockerfile` from `railway.json` (build settings only — there's deliberately no `healthcheckPath` in the file, see below). The container runs `alembic upgrade head` before starting the API on every deploy, so migrations never need a manual step.
- **Settings → Deploy → Healthcheck Path**: set this to `/api/v1/health` **on this service, via the dashboard, not in `railway.json`**. Both the API and worker services share `backend/railway.json` (same root directory), so a healthcheck defined there gets pushed onto *both* every time you deploy — including the worker, which has no HTTP server to answer it and would fail every deploy waiting on a check that can never pass. Setting it only in the dashboard on this specific service avoids that.
- Once deployed, copy its public URL (Settings → Networking → **Generate Domain**) — you'll need it for the Vercel deployment below.

### 3. Celery worker service

Add **another** service from the same repo:
- **Root Directory**: `backend` (same code, no separate Dockerfile)
- **Settings → Deploy → Custom Start Command**: `celery -A app.core.celery_app.celery worker --loglevel=info --concurrency=2` (this overrides the Dockerfile's default CMD, so it doesn't also try to run migrations/uvicorn). The `--concurrency=2` matters more than it looks: Celery's prefork pool defaults to one process per CPU core it detects, which on a cloud host can be far more cores than the container's actual memory budget supports — each forked process loads the whole app, so an unset concurrency can OOM-crash-loop a small container.
- **Settings → Deploy → Healthcheck Path**: leave this empty. (See the note above — as long as neither service's `railway.json` defines one, there's nothing to conflict with.)
- Same environment variables as the API service above (it needs `DATABASE_URL`, `REDIS_URL`, and the OCR provider keys) — reuse variables via Railway's "variable references" between services instead of retyping them, or use a [shared variable group](https://docs.railway.com/guides/variables#shared-variables).
- **Don't** generate a public domain for this one; it doesn't serve HTTP.

### 4. Frontend on Vercel

1. [New Project on Vercel](https://vercel.com/new) → import this same GitHub repo.
2. In the import screen's **Root Directory**, select `frontend`. Vercel auto-detects Next.js — no build command changes needed.
3. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_API_URL=https://<your-backend-service>.up.railway.app/api/v1
   ```
   Vercel inlines `NEXT_PUBLIC_*` vars at build time automatically (no ARG/build-arg step needed like the Docker path) — just make sure it's set *before* the first deploy, since a plain redeploy without a rebuild won't pick up a change to it.
4. Deploy, then copy the resulting domain (e.g. `your-app.vercel.app`, or a custom domain if you attach one).
5. Go back to the **backend** service on Railway and set `FRONTEND_URL` / `BACKEND_CORS_ORIGINS` to that exact Vercel domain (including `https://`), then redeploy the backend so CORS actually allows requests from it.

### Order matters on the first deploy

Backend (Railway) → get its URL → set it as `NEXT_PUBLIC_API_URL` on Vercel →
deploy frontend → get *its* URL → set `FRONTEND_URL`/`BACKEND_CORS_ORIGINS`
on the backend → redeploy the backend. After that, pushes to `main` redeploy
everything with the right values already in place — Vercel and Railway both
auto-deploy on push once connected.
