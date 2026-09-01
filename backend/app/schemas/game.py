from datetime import date as date_

from pydantic import BaseModel, ConfigDict, model_validator

from app.schemas.place import PlaceOut
from app.schemas.player import PlayerOut
from app.schemas.season import SeasonOut
from app.schemas.team import TeamOut


class GameSideCreate(BaseModel):
    player_id: int
    team_id: int
    goals: int
    shots: int
    hits: int
    time_on_attack_seconds: int
    passing_pct: float
    faceoffs_won: int
    penalty_minutes_seconds: int
    powerplay_goals: int
    powerplay_total: int
    powerplay_minutes_seconds: int
    shorthanded_goals: int


class GameSideOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    player: PlayerOut
    team: TeamOut
    goals: int
    shots: int
    hits: int
    time_on_attack_seconds: int
    passing_pct: float
    faceoffs_won: int
    penalty_minutes_seconds: int
    powerplay_goals: int
    powerplay_total: int
    powerplay_minutes_seconds: int
    shorthanded_goals: int


class GameCreate(BaseModel):
    date: date_ | None = None  # defaults to today server-side if omitted
    season_id: int
    place_id: int
    photo_path: str
    notes: str | None = None
    home: GameSideCreate
    away: GameSideCreate

    @model_validator(mode="after")
    def _distinct_players(self) -> "GameCreate":
        if self.home.player_id == self.away.player_id:
            raise ValueError("home and away must be different players")
        return self


class GameUpdate(BaseModel):
    date: date_ | None = None
    season_id: int | None = None
    place_id: int | None = None
    photo_path: str | None = None
    notes: str | None = None
    home: GameSideCreate | None = None
    away: GameSideCreate | None = None

    @model_validator(mode="after")
    def _distinct_players(self) -> "GameUpdate":
        if self.home and self.away and self.home.player_id == self.away.player_id:
            raise ValueError("home and away must be different players")
        return self


class GameOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_
    season: SeasonOut
    place: PlaceOut
    photo_path: str
    notes: str | None
    created_by_user_id: int
    home: GameSideOut
    away: GameSideOut
    # Not an ORM attribute — always computed per-request from the current
    # user via game_service.can_edit_game and patched onto the validated
    # model in the route (see api/routes/games.py). The default here only
    # matters until that patch happens.
    can_edit: bool = False


class GameListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_
    season: SeasonOut
    place: PlaceOut
    home: GameSideOut
    away: GameSideOut
    can_edit: bool = False


class GameListResponse(BaseModel):
    items: list[GameListItem]
    total: int
