import enum
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.player import Player
from app.models.team import Team

if TYPE_CHECKING:
    from app.models.game import Game


class Side(str, enum.Enum):
    HOME = "home"
    AWAY = "away"


class GameSide(Base):
    __tablename__ = "game_sides"
    __table_args__ = (UniqueConstraint("game_id", "side"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"))
    side: Mapped[Side]
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))

    goals: Mapped[int]
    shots: Mapped[int]
    hits: Mapped[int]
    time_on_attack_seconds: Mapped[int]
    passing_pct: Mapped[float]
    faceoffs_won: Mapped[int]
    penalty_minutes_seconds: Mapped[int]
    powerplay_goals: Mapped[int]
    powerplay_total: Mapped[int]
    powerplay_minutes_seconds: Mapped[int]
    shorthanded_goals: Mapped[int]

    game: Mapped["Game"] = relationship(back_populates="sides")
    player: Mapped[Player] = relationship(lazy="selectin")
    team: Mapped[Team] = relationship(lazy="selectin")
