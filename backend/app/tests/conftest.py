from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (registers all models on Base.metadata)
from app.db import Base, get_db
from app.main import create_app


@pytest.fixture
async def db_session_maker() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


@pytest.fixture
async def db(
    db_session_maker: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncSession]:
    async with db_session_maker() as session:
        yield session


@pytest.fixture
async def client(
    db_session_maker: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncClient]:
    app = create_app()

    async def override_get_db() -> AsyncGenerator[AsyncSession]:
        async with db_session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
