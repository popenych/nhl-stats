from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.mixins import TimestampMixin


class Team(TimestampMixin, Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    abbreviation: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]
    logo_path: Mapped[str | None] = mapped_column(default=None)
