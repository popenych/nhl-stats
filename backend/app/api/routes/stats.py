from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.stats import (
    HeadToHeadOut,
    LeaderboardResponse,
    MetricKey,
    PlaceSummary,
    PlayerExtras,
    PlayerSummaryRow,
    PlayerTeamSummaryRow,
    SideFilter,
    StatsSummary,
    TeamExtras,
    TrendResponse,
)
from app.services import stats_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/players/{player_id}/summary", response_model=StatsSummary)
async def get_player_summary(
    player_id: int,
    db: DbSession,
    _user: CurrentUser,
    season_id: int | None = None,
    team_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> object:
    return await stats_service.player_summary(
        db, player_id, season_id=season_id, team_id=team_id, place_id=place_id, side=side
    )


@router.get("/players/{player_id}/extras", response_model=PlayerExtras)
async def get_player_extras(
    player_id: int,
    db: DbSession,
    _user: CurrentUser,
    season_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> object:
    return await stats_service.player_extras(
        db, player_id, season_id=season_id, place_id=place_id, side=side
    )


@router.get("/players/{player_id}/team-extras", response_model=TeamExtras)
async def get_player_team_extras(
    player_id: int,
    db: DbSession,
    _user: CurrentUser,
    team_id: int = Query(...),
    season_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> object:
    return await stats_service.player_team_extras(
        db, player_id, team_id, season_id=season_id, place_id=place_id, side=side
    )


@router.get("/players/{player_id}/by-team", response_model=list[PlayerTeamSummaryRow])
async def get_player_team_breakdown(
    player_id: int,
    db: DbSession,
    _user: CurrentUser,
    season_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> object:
    return await stats_service.player_team_breakdown(
        db, player_id, season_id=season_id, place_id=place_id, side=side
    )


@router.get("/teams/{team_id}/summary", response_model=StatsSummary)
async def get_team_summary(
    team_id: int,
    db: DbSession,
    _user: CurrentUser,
    season_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> object:
    return await stats_service.team_summary(
        db, team_id, season_id=season_id, place_id=place_id, side=side
    )


@router.get("/teams/{team_id}/extras", response_model=TeamExtras)
async def get_team_extras(
    team_id: int,
    db: DbSession,
    _user: CurrentUser,
    season_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> object:
    return await stats_service.team_extras(
        db, team_id, season_id=season_id, place_id=place_id, side=side
    )


@router.get("/places/{place_id}/summary", response_model=PlaceSummary)
async def get_place_summary(
    place_id: int,
    db: DbSession,
    _user: CurrentUser,
    season_id: int | None = None,
) -> object:
    return await stats_service.place_summary(db, place_id, season_id=season_id)


@router.get("/head-to-head", response_model=HeadToHeadOut)
async def get_head_to_head(
    db: DbSession,
    _user: CurrentUser,
    player_a: int = Query(...),
    player_b: int = Query(...),
    season_id: int | None = None,
    place_id: int | None = None,
    team_id_a: int | None = None,
    team_id_b: int | None = None,
    side: SideFilter | None = None,
) -> object:
    if player_a == player_b:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="player_a and player_b must differ"
        )
    return await stats_service.head_to_head(
        db,
        player_a,
        player_b,
        season_id=season_id,
        place_id=place_id,
        team_id_a=team_id_a,
        team_id_b=team_id_b,
        side=side,
    )


@router.get("/players-summary", response_model=list[PlayerSummaryRow])
async def get_all_player_summaries(
    db: DbSession,
    _user: CurrentUser,
    season_id: int | None = None,
    team_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> object:
    return await stats_service.all_player_summaries(
        db, season_id=season_id, team_id=team_id, place_id=place_id, side=side
    )


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    db: DbSession,
    _user: CurrentUser,
    metric: MetricKey = "win_pct",
    season_id: int | None = None,
) -> object:
    return await stats_service.leaderboard(db, metric, season_id=season_id)


@router.get("/trend", response_model=TrendResponse)
async def get_trend(
    db: DbSession,
    _user: CurrentUser,
    metric: MetricKey = "win_pct",
    x: Literal["date", "games_played"] = "date",
    season_id: int | None = None,
    player_id: int | None = None,
    team_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> object:
    return await stats_service.trend(
        db,
        metric,
        x,
        season_id=season_id,
        player_id=player_id,
        team_id=team_id,
        place_id=place_id,
        side=side,
    )
