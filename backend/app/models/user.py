import enum

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import TimestampMixin
from app.models.player import Player


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(unique=True)
    email: Mapped[str | None] = mapped_column(unique=True, default=None)
    password_hash: Mapped[str]
    role: Mapped[UserRole] = mapped_column(default=UserRole.MEMBER)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), unique=True)
    is_active: Mapped[bool] = mapped_column(default=True)

    # eager (selectin) load: UserOut always serializes the nested player, and the
    # response is built outside the session's async context, so a lazy load there
    # would hit SQLAlchemy's "MissingGreenlet" error.
    player: Mapped[Player] = relationship(lazy="selectin")
