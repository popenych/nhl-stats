from pydantic import BaseModel, ConfigDict


class SeasonCreate(BaseModel):
    name: str
    icon: str | None = None
    # sort_order is assigned server-side (max existing + 1) — members can add
    # seasons but shouldn't need to pick a display-order number.


class SeasonUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None
    icon: str | None = None


class SeasonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sort_order: int
    icon: str | None
