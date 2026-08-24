from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import AdminUser, DbSession
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(db: DbSession, _admin: AdminUser) -> object:
    result = await db.execute(select(User).order_by(User.username))
    return result.scalars().all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, db: DbSession, _admin: AdminUser) -> object:
    try:
        return await user_service.create_user_with_player(db, data)
    except user_service.UsernameOrPlayerNameTakenError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username, email, or player name already in use",
        ) from exc
