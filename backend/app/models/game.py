from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.game_side import Side
from app.models.mixins import TimestampMixin
from app.models.place import Place
from app.models.season import Season

if TYPE_CHECKING:
    from app.models.game_side import GameSide


class Game(TimestampMixin, Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"))
    place_id: Mapped[int] = mapped_column(ForeignKey("places.id"))
    photo_path: Mapped[str]
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    notes: Mapped[str | None] = mapped_column(Text, default=None)

    sides: Mapped[list["GameSide"]] = relationship(
        back_populates="game", cascade="all, delete-orphan", lazy="selectin"
    )
    season: Mapped[Season] = relationship(lazy="selectin")
    place: Mapped[Place] = relationship(lazy="selectin")

    @property
    def home(self) -> "GameSide":
        return next(s for s in self.sides if s.side == Side.HOME)

    @property
    def away(self) -> "GameSide":
        return next(s for s in self.sides if s.side == Side.AWAY)
