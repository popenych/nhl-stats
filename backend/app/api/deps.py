from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import decode_access_token
from app.db import get_db
from app.models.user import User, UserRole

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    access_token: Annotated[str | None, Cookie()] = None,
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
    )
    if access_token is None:
        raise unauthorized

    try:
        payload = decode_access_token(access_token)
    except jwt.PyJWTError as exc:
        raise unauthorized from exc

    user = (
        await db.execute(select(User).where(User.id == int(payload["sub"])))
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_admin(user: CurrentUser) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


AdminUser = Annotated[User, Depends(require_admin)]
