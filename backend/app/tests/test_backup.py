from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import UserRole
from app.schemas.player import PlayerCreate
from app.schemas.user import UserCreate
from app.services.user_service import create_user_with_player


async def _create_user(db: AsyncSession, *, role: UserRole = UserRole.MEMBER) -> None:
    await create_user_with_player(
        db,
        UserCreate(
            username="alex",
            password="hunter2pass",
            role=role,
            player=PlayerCreate(name="Alex"),
        ),
    )


async def test_trigger_backup_requires_admin(client: AsyncClient, db: AsyncSession) -> None:
    await _create_user(db, role=UserRole.MEMBER)
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})

    res = await client.post("/backup/trigger")

    assert res.status_code == 403


async def test_trigger_backup_touches_trigger_file(
    client: AsyncClient, db: AsyncSession, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    trigger_path = tmp_path / "backup-trigger" / "run"
    monkeypatch.setattr(settings, "backup_trigger_path", str(trigger_path))
    await _create_user(db, role=UserRole.ADMIN)
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})

    assert not trigger_path.exists()
    res = await client.post("/backup/trigger")

    assert res.status_code == 200
    assert trigger_path.exists()
