from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    abbreviation: str
    name: str


class TeamUpdate(BaseModel):
    abbreviation: str | None = None
    name: str | None = None


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    abbreviation: str
    name: str
    logo_path: str | None
