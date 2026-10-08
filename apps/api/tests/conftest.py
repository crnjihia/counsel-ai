import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import os

from apps.api.main import app
from apps.api.database import Base, get_db
from apps.api.services import claude_client

# SQLite in-memory async database for tests
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL,
    echo=False,
    connect_args={"check_same_thread": False}
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Create a fresh database session for each test function."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    """Provide AsyncClient with overridden database dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
def mock_claude(monkeypatch):
    """Ensure no real Anthropic API calls occur during testing and skip Redis timeouts."""
    async def mock_redis():
        return None

    monkeypatch.setattr("apps.api.services.usage.get_redis_client", mock_redis)

    async def mock_generate_completion(prompt: str, **kwargs):
        if "red_flags" in prompt or "Identify clauses" in prompt:
            return (
                '{"red_flags": [{"clause_text": "Non-compete clause across all East Africa for 5 years", "page": 1, "severity": "high", "explanation": "Unreasonable restriction of trade under Kenyan contract law.", "suggestion": "Limit to Nairobi and 12 months max."}]}',
                120,
                80
            )
        elif "questions" in prompt or "most important questions" in prompt:
            return (
                '{"questions": [{"question": "Does this indemnity clause expose the SME to unlimited liability?", "why_it_matters": "Under Kenyan common law, unlimited indemnity can bankrupt a small firm."}]}',
                110,
                65
            )
        else:
            return (
                '{"parties": ["Acme Ltd", "Baraka SMEs"], "term": "2 years renewable", "obligations": ["Provide consulting services"], "risks": ["Immediate termination without cause [p. 1]"], "plain_summary": "A standard commercial consultancy contract with unilateral termination risks."}',
                150,
                90
            )

    async def mock_stream_chat_completion(prompt: str, **kwargs):
        tokens = ["Mshauri ", "legal ", "assistant: ", "According ", "to [p. 1], ", "you ", "should ", "negotiate."]
        for token in tokens:
            yield token

    monkeypatch.setattr(claude_client, "generate_completion", mock_generate_completion)
    monkeypatch.setattr(claude_client, "stream_chat_completion", mock_stream_chat_completion)
