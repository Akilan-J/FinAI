import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rate_limit import limiter
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture(autouse=True)
def reset_rate_limits():
    # The limiter's in-memory storage is process-wide, so without a reset
    # tests that hit login/register repeatedly would trip real 429s from
    # each other's requests.
    limiter.reset()
    yield

# Import all models so their tables are registered on Base.metadata before create_all.
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


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        async with session_maker() as session:
            yield session
    finally:
        app.dependency_overrides.pop(get_db, None)
        await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    # ASGITransport doesn't run app startup/shutdown, so the real-Postgres
    # lifespan (category seeding) never runs against a test DB.
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test/api/v1") as ac:
        yield ac


@pytest_asyncio.fixture
async def registered_user(client):
    payload = {"email": "testuser@example.com", "password": "strongpassword123", "full_name": "Test User"}
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 200
    return payload


@pytest_asyncio.fixture
async def auth_client(client, registered_user):
    response = await client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert response.status_code == 200
    token = response.json()["data"]["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
