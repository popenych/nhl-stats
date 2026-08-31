from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamOut, TeamUpdate
from app.services.photo_service import save_photo

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("", response_model=list[TeamOut])
async def list_teams(db: DbSession, _user: CurrentUser) -> object:
    result = await db.execute(select(Team).order_by(Team.name))
    return result.scalars().all()


@router.get("/{team_id}", response_model=TeamOut)
async def get_team(team_id: int, db: DbSession, _user: CurrentUser) -> object:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


@router.post("", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def create_team(data: TeamCreate, db: DbSession, _user: CurrentUser) -> object:
    team = Team(abbreviation=data.abbreviation, name=data.name)
    db.add(team)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Abbreviation already in use"
        ) from exc
    return team


@router.patch("/{team_id}", response_model=TeamOut)
async def update_team(team_id: int, data: TeamUpdate, db: DbSession, _admin: AdminUser) -> object:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    if data.abbreviation is not None:
        team.abbreviation = data.abbreviation
    if data.name is not None:
        team.name = data.name
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Abbreviation already in use"
        ) from exc
    return team


@router.post("/{team_id}/logo", response_model=TeamOut)
async def upload_team_logo(
    team_id: int, db: DbSession, _admin: AdminUser, file: UploadFile = File(...)
) -> object:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    team.logo_path = await save_photo(file, "teams")
    await db.commit()
    return team


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(team_id: int, db: DbSession, _admin: AdminUser) -> None:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    await db.delete(team)
    await db.commit()
