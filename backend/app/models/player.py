from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.mixins import TimestampMixin


class Player(TimestampMixin, Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    photo_path: Mapped[str | None] = mapped_column(default=None)
    icon: Mapped[str | None] = mapped_column(default=None)
