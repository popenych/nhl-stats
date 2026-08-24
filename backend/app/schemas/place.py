from pydantic import BaseModel, ConfigDict


class PlaceCreate(BaseModel):
    name: str


class PlaceUpdate(BaseModel):
    name: str | None = None


class PlaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    photo_path: str | None
