from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token
from app.auth.security import generate_refresh_token, hash_refresh_token, verify_password
from app.config import settings
from app.models.refresh_token import RefreshToken
from app.models.user import User


class InvalidCredentialsError(Exception):
    pass


class InvalidRefreshTokenError(Exception):
    pass


def _as_utc(dt: datetime) -> datetime:
    """SQLite round-trips DateTime(timezone=True) values as naive — normalize
    before comparing, rather than assuming the driver preserved tzinfo."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError
    return user


async def issue_tokens(db: AsyncSession, user: User) -> tuple[str, str]:
    """Returns (access_token, refresh_token). Stores only the refresh token's hash."""
    access_token = create_access_token(user.id, user.role.value)

    refresh_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=datetime.now(UTC)
            + timedelta(days=settings.jwt_refresh_token_expire_days),
        )
    )
    await db.commit()
    return access_token, refresh_token


async def rotate_refresh_token(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
    """Validates + revokes the given refresh token and issues a fresh pair."""
    token_hash = hash_refresh_token(refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored = result.scalar_one_or_none()
    if stored is None or stored.revoked or _as_utc(stored.expires_at) < datetime.now(UTC):
        raise InvalidRefreshTokenError

    stored.revoked = True

    user_result = await db.execute(select(User).where(User.id == stored.user_id))
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise InvalidRefreshTokenError

    return await issue_tokens(db, user)


async def revoke_refresh_token(db: AsyncSession, refresh_token: str) -> None:
    token_hash = hash_refresh_token(refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored = result.scalar_one_or_none()
    if stored is not None:
        stored.revoked = True
        await db.commit()
