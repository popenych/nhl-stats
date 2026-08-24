from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole
from app.schemas.player import PlayerCreate, PlayerOut


class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.MEMBER
    email: str | None = None
    player: PlayerCreate


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None
    role: UserRole
    is_active: bool
    player: PlayerOut
