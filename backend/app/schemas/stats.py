from typing import Literal

from pydantic import BaseModel

from app.schemas.player import PlayerOut
from app.schemas.team import TeamOut

# Which side of the game a player/team was on — used to filter stats down to
# only their home games or only their away games.
SideFilter = Literal["home", "away"]

MetricKey = Literal[
    "win_pct",
    "wins",
    "losses",
    "games_played",
    "goals_for",
    "goals_against",
    "goals_for_per_game",
    "goals_against_per_game",
    "goal_diff",
    "goal_diff_per_game",
    "shots_for",
    "shots_per_game",
    "shots_against_per_game",
    "hits_for",
    "hits_per_game",
    "shooting_pct",
    "passing_pct_avg",
    "time_on_attack_avg_seconds",
    "faceoffs_won",
    "faceoff_pct",
    "powerplay_goals",
    "powerplay_total",
    "powerplay_minutes_avg_seconds",
    "pp_pct",
    "penalty_minutes_total_seconds",
    "penalty_minutes_avg_seconds",
    "penalty_kill_situations",
    "penalty_kills_successful",
    "pk_pct",
    "shorthanded_goals",
]

# Short label used in compact tables (leaderboard) — the frontend's stat
# registry (frontend/src/lib/stats.ts) is the source of truth for both short
# and full names shown in the UI; this dict only needs to satisfy the
# MetricKey response field, kept in sync manually.
METRIC_LABELS: dict[MetricKey, str] = {
    "win_pct": "W%",
    "wins": "W",
    "losses": "L",
    "games_played": "GP",
    "goals_for": "GF",
    "goals_against": "GA",
    "goals_for_per_game": "GF/GP",
    "goals_against_per_game": "GA/GP",
    "goal_diff": "GD",
    "goal_diff_per_game": "GD/GP",
    "shots_for": "Shots",
    "shots_per_game": "Shots/GP",
    "shots_against_per_game": "SA/GP",
    "hits_for": "Hits",
    "hits_per_game": "Hits/GP",
    "shooting_pct": "SH%",
    "passing_pct_avg": "Pass%",
    "time_on_attack_avg_seconds": "TOA avg",
    "faceoffs_won": "FOW",
    "faceoff_pct": "FOW%",
    "powerplay_goals": "PPG",
    "powerplay_total": "PP total",
    "powerplay_minutes_avg_seconds": "PP min avg",
    "pp_pct": "PP%",
    "penalty_minutes_total_seconds": "PK min total",
    "penalty_minutes_avg_seconds": "PK min avg",
    "penalty_kill_situations": "PK situations",
    "penalty_kills_successful": "PK kills",
    "pk_pct": "PK%",
    "shorthanded_goals": "SHG",
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
    goal_diff: int
    goal_diff_per_game: float
    shots_for: int
    shots_per_game: float
    shots_against_per_game: float
    hits_for: int
    hits_per_game: float
    shooting_pct: float
    passing_pct_avg: float
    time_on_attack_avg_seconds: float
    faceoffs_won: int
    faceoff_pct: float
    powerplay_goals: int
    powerplay_total: int
    powerplay_minutes_avg_seconds: float
    pp_pct: float
    penalty_minutes_total_seconds: float
    penalty_minutes_avg_seconds: float
    penalty_kill_situations: int
    penalty_kills_successful: int
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
    # Full stat breakdowns computed only from the games between these two
    # players (not each player's overall record) — backs the side-by-side
    # head-to-head comparison table.
    player_a_summary: StatsSummary
    player_b_summary: StatsSummary


class TeamRecord(BaseModel):
    team: TeamOut
    games_played: int
    wins: int
    losses: int


class PlayerExtras(BaseModel):
    best_win_streak: int
    worst_lose_streak: int
    most_played_team: TeamRecord | None
    most_wins_team: TeamRecord | None
    most_losses_team: TeamRecord | None


class PlayerRecord(BaseModel):
    player: PlayerOut
    games_played: int
    wins: int
    losses: int


class TeamExtras(BaseModel):
    best_win_streak: int
    worst_lose_streak: int
    most_played_player: PlayerRecord | None
    most_wins_player: PlayerRecord | None
    most_losses_player: PlayerRecord | None


class LeaderboardEntry(BaseModel):
    player: PlayerOut
    games_played: int
    value: float


class LeaderboardResponse(BaseModel):
    metric: MetricKey
    entries: list[LeaderboardEntry]


class PlayerSummaryRow(BaseModel):
    player: PlayerOut
    summary: StatsSummary


class PlayerTeamSummaryRow(BaseModel):
    team: TeamOut
    summary: StatsSummary


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
