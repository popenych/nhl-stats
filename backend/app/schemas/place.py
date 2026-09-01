from pydantic import BaseModel, ConfigDict


class PlaceCreate(BaseModel):
    name: str
    icon: str | None = None


class PlaceUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None


class PlaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    icon: str | None
