from pydantic import BaseModel, ConfigDict


class PlayerCreate(BaseModel):
    name: str
    icon: str | None = None


class PlayerUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None


class PlayerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    photo_path: str | None
    icon: str | None
