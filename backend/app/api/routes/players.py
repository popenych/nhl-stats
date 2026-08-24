from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.player import Player
from app.models.user import UserRole
from app.schemas.player import PlayerOut, PlayerUpdate
from app.services.photo_service import save_photo

router = APIRouter(prefix="/players", tags=["players"])


@router.get("", response_model=list[PlayerOut])
async def list_players(db: DbSession, _user: CurrentUser) -> object:
    result = await db.execute(select(Player).order_by(Player.name))
    return result.scalars().all()


@router.get("/{player_id}", response_model=PlayerOut)
async def get_player(player_id: int, db: DbSession, _user: CurrentUser) -> object:
    player = await db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return player


def _ensure_self_or_admin(user: CurrentUser, player_id: int) -> None:
    if user.role != UserRole.ADMIN and user.player_id != player_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Can only edit your own player profile"
        )


@router.patch("/{player_id}", response_model=PlayerOut)
async def update_player(
    player_id: int, data: PlayerUpdate, db: DbSession, user: CurrentUser
) -> object:
    _ensure_self_or_admin(user, player_id)
    player = await db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    if data.name is not None:
        player.name = data.name
    if data.icon is not None:
        player.icon = data.icon
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Player name already in use"
        ) from exc
    return player


@router.post("/{player_id}/photo", response_model=PlayerOut)
async def upload_player_photo(
    player_id: int,
    db: DbSession,
    user: CurrentUser,
    file: UploadFile = File(...),
) -> object:
    _ensure_self_or_admin(user, player_id)
    player = await db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    player.photo_path = await save_photo(file, "players")
    await db.commit()
    return player


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_player(player_id: int, db: DbSession, _admin: AdminUser) -> None:
    player = await db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    await db.delete(player)
    await db.commit()
