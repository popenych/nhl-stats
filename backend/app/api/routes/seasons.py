from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.season import Season
from app.schemas.season import SeasonCreate, SeasonOut, SeasonUpdate

router = APIRouter(prefix="/seasons", tags=["seasons"])


@router.get("", response_model=list[SeasonOut])
async def list_seasons(db: DbSession, _user: CurrentUser) -> object:
    result = await db.execute(select(Season).order_by(Season.sort_order))
    return result.scalars().all()


@router.post("", response_model=SeasonOut, status_code=status.HTTP_201_CREATED)
async def create_season(data: SeasonCreate, db: DbSession, _user: CurrentUser) -> object:
    max_sort_order = (await db.execute(select(func.max(Season.sort_order)))).scalar_one()
    season = Season(name=data.name, sort_order=(max_sort_order or 0) + 1)
    db.add(season)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Season name already in use"
        ) from exc
    return season


@router.patch("/{season_id}", response_model=SeasonOut)
async def update_season(
    season_id: int, data: SeasonUpdate, db: DbSession, _admin: AdminUser
) -> object:
    season = await db.get(Season, season_id)
    if season is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    if data.name is not None:
        season.name = data.name
    if data.sort_order is not None:
        season.sort_order = data.sort_order
    await db.commit()
    return season


@router.delete("/{season_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_season(season_id: int, db: DbSession, _admin: AdminUser) -> None:
    season = await db.get(Season, season_id)
    if season is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    await db.delete(season)
    await db.commit()
