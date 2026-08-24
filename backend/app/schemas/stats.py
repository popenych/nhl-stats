from typing import Literal

from pydantic import BaseModel

from app.schemas.player import PlayerOut

MetricKey = Literal[
    "win_pct",
    "goals_for_per_game",
    "goals_against_per_game",
    "shooting_pct",
    "pp_pct",
    "pk_pct",
    "faceoff_pct",
]

METRIC_LABELS: dict[MetricKey, str] = {
    "win_pct": "W%",
    "goals_for_per_game": "GF/GP",
    "goals_against_per_game": "GA/GP",
    "shooting_pct": "SH%",
    "pp_pct": "PP%",
    "pk_pct": "PK%",
    "faceoff_pct": "FOW%",
}


class StatsSummary(BaseModel):
    games_played: int
    wins: int
    losses: int
    ties: int
    win_pct: float
    goals_for: int
    goals_against: int
    goals_for_per_game: float
    goals_against_per_game: float
    shots_per_game: float
    shots_against_per_game: float
    hits_per_game: float
    shooting_pct: float
    passing_pct_avg: float
    faceoff_pct: float
    pp_pct: float
    pk_pct: float
    shorthanded_goals: int
    current_streak: str
    last5: str


class PlaceStanding(BaseModel):
    player: PlayerOut
    games_played: int
    wins: int
    losses: int
    ties: int


class PlaceSummary(BaseModel):
    games_played: int
    standings: list[PlaceStanding]


class HeadToHeadOut(BaseModel):
    player_a: PlayerOut
    player_b: PlayerOut
    games_played: int
    player_a_wins: int
    player_b_wins: int
    ties: int
    player_a_goals_for: int
    player_b_goals_for: int


class LeaderboardEntry(BaseModel):
    player: PlayerOut
    games_played: int
    value: float


class LeaderboardResponse(BaseModel):
    metric: MetricKey
    entries: list[LeaderboardEntry]


class TrendPoint(BaseModel):
    x: str
    value: float


class TrendSeries(BaseModel):
    player: PlayerOut
    points: list[TrendPoint]


class TrendResponse(BaseModel):
    metric: MetricKey
    x_axis: Literal["date", "games_played"]
    series: list[TrendSeries]
