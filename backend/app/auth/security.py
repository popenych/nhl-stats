import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def generate_refresh_token() -> str:
    """A random opaque token — the value handed to the client as a cookie."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    """SHA-256 digest stored in the DB, so a leaked DB row can't be used as a token."""
    return hashlib.sha256(token.encode()).hexdigest()
