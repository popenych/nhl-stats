from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import hash_password
from app.models.player import Player
from app.models.user import User
from app.schemas.user import UserCreate


class UsernameOrPlayerNameTakenError(Exception):
    pass


async def create_user_with_player(db: AsyncSession, data: UserCreate) -> User:
    player = Player(name=data.player.name, icon=data.player.icon)
    db.add(player)
    await db.flush()  # assigns player.id without committing yet

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        player_id=player.id,
    )
    db.add(user)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise UsernameOrPlayerNameTakenError from exc

    # `user` was built via direct construction, not a `select()` query, so the
    # `lazy="selectin"` relationship never auto-fired — load it explicitly, or
    # serializing the response later hits SQLAlchemy's async "MissingGreenlet"
    # error on the first bare `.player` access.
    await db.refresh(user, attribute_names=["player"])
    return user
