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

### 3. Frontend Setup

Navigate to `frontend`, install dependencies, and start Next.js dev server:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.
