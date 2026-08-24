from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.config import settings

ALGORITHM = "HS256"


def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Raises jwt.PyJWTError (caught by the caller) on an invalid/expired token."""
    return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
