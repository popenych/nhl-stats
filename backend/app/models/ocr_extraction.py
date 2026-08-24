from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class OcrExtraction(Base):
    __tablename__ = "ocr_extractions"

    id: Mapped[int] = mapped_column(primary_key=True)
    game_id: Mapped[int | None] = mapped_column(ForeignKey("games.id"), default=None)
    raw_result: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
