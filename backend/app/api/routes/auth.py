from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status

from app.api.deps import CurrentUser, DbSession
from app.config import settings
from app.schemas.auth import ChangePasswordRequest, LoginRequest
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=settings.jwt_access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    # Not scoped to a narrower path (e.g. /auth) — the browser-visible path
    # depends on whether requests go through the Vite dev proxy or Caddy in
    # prod (both strip a `/api` prefix before forwarding here), so the backend
    # can't assume a fixed prefix for itself.
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")


@router.post("/login", response_model=UserOut)
async def login(data: LoginRequest, db: DbSession, response: Response) -> object:
    try:
        user = await auth_service.authenticate_user(db, data.username, data.password)
    except auth_service.InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password"
        ) from exc

    access_token, refresh_token = await auth_service.issue_tokens(db, user)
    _set_auth_cookies(response, access_token, refresh_token)
    return user


@router.post("/refresh")
async def refresh(
    db: DbSession,
    response: Response,
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> dict[str, str]:
    if refresh_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        access_token, new_refresh_token = await auth_service.rotate_refresh_token(db, refresh_token)
    except auth_service.InvalidRefreshTokenError as exc:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        ) from exc

    _set_auth_cookies(response, access_token, new_refresh_token)
    return {"status": "ok"}


@router.post("/logout")
async def logout(
    db: DbSession,
    response: Response,
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> dict[str, str]:
    if refresh_token is not None:
        await auth_service.revoke_refresh_token(db, refresh_token)
    _clear_auth_cookies(response)
    return {"status": "ok"}


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> object:
    return user


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest, db: DbSession, user: CurrentUser
) -> dict[str, str]:
    try:
        await auth_service.change_password(
            db, user, current_password=data.current_password, new_password=data.new_password
        )
    except auth_service.InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect"
        ) from exc
    return {"status": "ok"}
