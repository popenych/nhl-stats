from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

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


async def test_login_sets_cookies_and_returns_user(client: AsyncClient, db: AsyncSession) -> None:
    await _create_user(db)

    res = await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})

    assert res.status_code == 200
    assert res.json()["username"] == "alex"
    assert "access_token" in res.cookies
    assert "refresh_token" in res.cookies


async def test_login_wrong_password_rejected(client: AsyncClient, db: AsyncSession) -> None:
    await _create_user(db)

    res = await client.post("/auth/login", json={"username": "alex", "password": "wrong"})

    assert res.status_code == 401


async def test_me_requires_auth(client: AsyncClient) -> None:
    res = await client.get("/auth/me")
    assert res.status_code == 401


async def test_me_returns_current_user_after_login(client: AsyncClient, db: AsyncSession) -> None:
    await _create_user(db)
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})

    res = await client.get("/auth/me")

    assert res.status_code == 200
    assert res.json()["player"]["name"] == "Alex"


async def test_refresh_rotates_token_and_old_one_is_revoked(
    client: AsyncClient, db: AsyncSession
) -> None:
    await _create_user(db)
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    old_refresh = client.cookies["refresh_token"]

    res = await client.post("/auth/refresh")
    assert res.status_code == 200
    new_refresh = client.cookies["refresh_token"]
    assert new_refresh != old_refresh

    client.cookies.set("refresh_token", old_refresh)
    reuse_res = await client.post("/auth/refresh")
    assert reuse_res.status_code == 401


async def test_logout_revokes_refresh_token(client: AsyncClient, db: AsyncSession) -> None:
    await _create_user(db)
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})

    logout_res = await client.post("/auth/logout")
    assert logout_res.status_code == 200

    refresh_res = await client.post("/auth/refresh")
    assert refresh_res.status_code == 401


async def test_member_cannot_create_users(client: AsyncClient, db: AsyncSession) -> None:
    await _create_user(db, role=UserRole.MEMBER)
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})

    res = await client.post(
        "/users",
        json={"username": "friend2", "password": "friendpass2", "player": {"name": "Friend Two"}},
    )

    assert res.status_code == 403


async def test_admin_can_create_users(client: AsyncClient, db: AsyncSession) -> None:
    await _create_user(db, role=UserRole.ADMIN)
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})

    res = await client.post(
        "/users",
        json={"username": "friend2", "password": "friendpass2", "player": {"name": "Friend Two"}},
    )

    assert res.status_code == 201
    assert res.json()["role"] == "member"
