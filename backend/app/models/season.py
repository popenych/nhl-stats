from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.mixins import TimestampMixin


class Season(TimestampMixin, Base):
    __tablename__ = "seasons"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    sort_order: Mapped[int]
