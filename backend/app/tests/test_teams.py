from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.team import Team
from app.models.user import User, UserRole
from app.schemas.player import PlayerCreate
from app.schemas.user import UserCreate
from app.services.user_service import create_user_with_player


async def _create_user(
    db: AsyncSession, username: str, *, role: UserRole = UserRole.MEMBER
) -> User:
    return await create_user_with_player(
        db,
        UserCreate(
            username=username,
            password="hunter2pass",
            role=role,
            player=PlayerCreate(name=username.capitalize()),
        ),
    )


async def test_member_can_create_team(client: AsyncClient, db: AsyncSession) -> None:
    await _create_user(db, "alex")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})

    res = await client.post("/teams", json={"abbreviation": "TBL", "name": "Tampa Bay Lightning"})

    assert res.status_code == 201
    assert res.json()["abbreviation"] == "TBL"


async def test_create_team_rejects_duplicate_abbreviation(
    client: AsyncClient, db: AsyncSession
) -> None:
    await _create_user(db, "alex")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    await client.post("/teams", json={"abbreviation": "TBL", "name": "Tampa Bay Lightning"})

    res = await client.post("/teams", json={"abbreviation": "TBL", "name": "Duplicate"})

    assert res.status_code == 409


async def test_member_cannot_update_or_delete_team(client: AsyncClient, db: AsyncSession) -> None:
    await _create_user(db, "alex")
    team = Team(abbreviation="TBL", name="Tampa Bay Lightning")
    db.add(team)
    await db.commit()
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})

    patch_res = await client.patch(f"/teams/{team.id}", json={"name": "Renamed"})
    delete_res = await client.delete(f"/teams/{team.id}")

    assert patch_res.status_code == 403
    assert delete_res.status_code == 403


async def test_admin_can_update_team(client: AsyncClient, db: AsyncSession) -> None:
    await _create_user(db, "admin", role=UserRole.ADMIN)
    team = Team(abbreviation="TBL", name="Tampa Bay Lightning")
    db.add(team)
    await db.commit()
    await client.post("/auth/login", json={"username": "admin", "password": "hunter2pass"})

    res = await client.patch(
        f"/teams/{team.id}", json={"abbreviation": "TB", "name": "Renamed Lightning"}
    )

    assert res.status_code == 200
    assert res.json() == {
        "id": team.id,
        "abbreviation": "TB",
        "name": "Renamed Lightning",
        "logo_path": None,
    }
