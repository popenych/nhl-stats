from dataclasses import dataclass
from datetime import date as date_
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.models.game_side import GameSide
from app.models.player import Player
from app.models.team import Team
from app.schemas.player import PlayerOut
from app.schemas.stats import (
    HeadToHeadOut,
    LeaderboardEntry,
    LeaderboardResponse,
    MetricKey,
    PlaceStanding,
    PlaceSummary,
    PlayerExtras,
    PlayerRecord,
    PlayerSummaryRow,
    PlayerTeamSummaryRow,
    SideFilter,
    StatsSummary,
    TeamExtras,
    TeamRecord,
    TrendPoint,
    TrendResponse,
    TrendSeries,
)
from app.schemas.team import TeamOut
from app.services.game_service import list_all_games


@dataclass
class _Result:
    date: date_
    own: GameSide
    opp: GameSide


def _outcome(r: _Result) -> str:
    if r.own.goals > r.opp.goals:
        return "W"
    if r.own.goals < r.opp.goals:
        return "L"
    return "T"


def _split_by_player(games: list[Game], player_id: int) -> list[_Result]:
    results = []
    for game in games:
        own = next((s for s in game.sides if s.player_id == player_id), None)
        if own is None:
            continue
        opp = next(s for s in game.sides if s is not own)
        results.append(_Result(date=game.date, own=own, opp=opp))
    return results


def _split_by_team(games: list[Game], team_id: int) -> list[_Result]:
    results = []
    for game in games:
        own = next((s for s in game.sides if s.team_id == team_id), None)
        if own is None:
            continue
        opp = next(s for s in game.sides if s is not own)
        results.append(_Result(date=game.date, own=own, opp=opp))
    return results


def _filter_by_side(results: list[_Result], side: SideFilter | None) -> list[_Result]:
    if side is None:
        return results
    return [r for r in results if r.own.side == side]


def _group_by_team(results: list[_Result]) -> tuple[dict[int, list[_Result]], dict[int, Team]]:
    by_team: dict[int, list[_Result]] = {}
    teams: dict[int, Team] = {}
    for r in results:
        by_team.setdefault(r.own.team_id, []).append(r)
        teams[r.own.team_id] = r.own.team
    return by_team, teams


def _current_streak(results: list[_Result]) -> str:
    if not results:
        return ""
    last = _outcome(results[-1])
    count = 0
    for r in reversed(results):
        if _outcome(r) != last:
            break
        count += 1
    return f"{last}{count}"


def _last5(results: list[_Result]) -> str:
    return "".join(_outcome(r) for r in reversed(results[-5:]))


def _streaks(results: list[_Result]) -> tuple[int, int]:
    """Longest win streak and longest losing streak, anywhere in the
    chronological sequence (not just the current one)."""
    best_win = worst_lose = 0
    cur_win = cur_lose = 0
    for r in results:
        outcome = _outcome(r)
        if outcome == "W":
            cur_win += 1
            cur_lose = 0
            best_win = max(best_win, cur_win)
        elif outcome == "L":
            cur_lose += 1
            cur_win = 0
            worst_lose = max(worst_lose, cur_lose)
        else:
            cur_win = 0
            cur_lose = 0
    return best_win, worst_lose


def summarize(results: list[_Result]) -> StatsSummary:
    gp = len(results)
    if gp == 0:
        return StatsSummary(
            games_played=0,
            wins=0,
            losses=0,
            ties=0,
            win_pct=0.0,
            goals_for=0,
            goals_against=0,
            goals_for_per_game=0.0,
            goals_against_per_game=0.0,
            goal_diff=0,
            goal_diff_per_game=0.0,
            shots_for=0,
            shots_per_game=0.0,
            shots_against_per_game=0.0,
            hits_for=0,
            hits_per_game=0.0,
            shooting_pct=0.0,
            passing_pct_avg=0.0,
            time_on_attack_avg_seconds=0.0,
            faceoffs_won=0,
            faceoff_pct=0.0,
            powerplay_goals=0,
            powerplay_total=0,
            powerplay_minutes_avg_seconds=0.0,
            pp_pct=0.0,
            penalty_minutes_total_seconds=0.0,
            penalty_minutes_avg_seconds=0.0,
            penalty_kill_situations=0,
            penalty_kills_successful=0,
            pk_pct=0.0,
            shorthanded_goals=0,
            current_streak="",
            last5="",
        )

    wins = sum(1 for r in results if _outcome(r) == "W")
    losses = sum(1 for r in results if _outcome(r) == "L")
    ties = gp - wins - losses

    goals_for = sum(r.own.goals for r in results)
    goals_against = sum(r.opp.goals for r in results)
    shots_for = sum(r.own.shots for r in results)
    shots_against = sum(r.opp.shots for r in results)
    hits_for = sum(r.own.hits for r in results)
    passing_total = sum(r.own.passing_pct for r in results)
    toa_total = sum(r.own.time_on_attack_seconds for r in results)
    faceoffs_own = sum(r.own.faceoffs_won for r in results)
    faceoffs_opp = sum(r.opp.faceoffs_won for r in results)
    pp_goals = sum(r.own.powerplay_goals for r in results)
    pp_total = sum(r.own.powerplay_total for r in results)
    pp_minutes_total = sum(r.own.powerplay_minutes_seconds for r in results)
    penalty_minutes_total = sum(r.own.penalty_minutes_seconds for r in results)
    opp_pp_goals = sum(r.opp.powerplay_goals for r in results)
    opp_pp_total = sum(r.opp.powerplay_total for r in results)
    sh_goals = sum(r.own.shorthanded_goals for r in results)

    faceoffs_total = faceoffs_own + faceoffs_opp

    return StatsSummary(
        games_played=gp,
        wins=wins,
        losses=losses,
        ties=ties,
        win_pct=wins / gp,
        goals_for=goals_for,
        goals_against=goals_against,
        goals_for_per_game=goals_for / gp,
        goals_against_per_game=goals_against / gp,
        goal_diff=goals_for - goals_against,
        goal_diff_per_game=(goals_for - goals_against) / gp,
        shots_for=shots_for,
        shots_per_game=shots_for / gp,
        shots_against_per_game=shots_against / gp,
        hits_for=hits_for,
        hits_per_game=hits_for / gp,
        shooting_pct=(goals_for / shots_for) if shots_for else 0.0,
        passing_pct_avg=passing_total / gp,
        time_on_attack_avg_seconds=toa_total / gp,
        faceoffs_won=faceoffs_own,
        faceoff_pct=(faceoffs_own / faceoffs_total) if faceoffs_total else 0.0,
        powerplay_goals=pp_goals,
        powerplay_total=pp_total,
        powerplay_minutes_avg_seconds=pp_minutes_total / gp,
        pp_pct=(pp_goals / pp_total) if pp_total else 0.0,
        penalty_minutes_total_seconds=penalty_minutes_total,
        penalty_minutes_avg_seconds=penalty_minutes_total / gp,
        penalty_kill_situations=opp_pp_total,
        penalty_kills_successful=opp_pp_total - opp_pp_goals,
        pk_pct=(1 - opp_pp_goals / opp_pp_total) if opp_pp_total else 1.0,
        shorthanded_goals=sh_goals,
        current_streak=_current_streak(results),
        last5=_last5(results),
    )


def _metric_value(summary: StatsSummary, metric: MetricKey) -> float:
    return getattr(summary, metric)  # type: ignore[no-any-return]


async def player_summary(
    db: AsyncSession,
    player_id: int,
    *,
    season_id: int | None = None,
    team_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> StatsSummary:
    games = await list_all_games(db, player_id=player_id, season_id=season_id, place_id=place_id)
    results = _split_by_player(games, player_id)
    if team_id is not None:
        results = [r for r in results if r.own.team_id == team_id]
    results = _filter_by_side(results, side)
    return summarize(results)


async def player_extras(
    db: AsyncSession,
    player_id: int,
    *,
    season_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> PlayerExtras:
    games = await list_all_games(db, player_id=player_id, season_id=season_id, place_id=place_id)
    results = _filter_by_side(_split_by_player(games, player_id), side)
    best_win_streak, worst_lose_streak = _streaks(results)

    by_team, teams = _group_by_team(results)

    records = []
    for team_id, team_results in by_team.items():
        s = summarize(team_results)
        records.append(
            TeamRecord(
                team=TeamOut.model_validate(teams[team_id]),
                games_played=s.games_played,
                wins=s.wins,
                losses=s.losses,
            )
        )

    most_played = max(records, key=lambda r: r.games_played, default=None)
    most_wins = max(records, key=lambda r: r.wins, default=None)
    most_losses = max(records, key=lambda r: r.losses, default=None)

    return PlayerExtras(
        best_win_streak=best_win_streak,
        worst_lose_streak=worst_lose_streak,
        most_played_team=most_played,
        most_wins_team=most_wins,
        most_losses_team=most_losses,
    )


async def player_team_breakdown(
    db: AsyncSession,
    player_id: int,
    *,
    season_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> list[PlayerTeamSummaryRow]:
    """Every team this player has worn, each with its own full StatsSummary —
    backs a per-player table shaped like the Home leaderboard, but with rows
    keyed by team instead of by player."""
    games = await list_all_games(db, player_id=player_id, season_id=season_id, place_id=place_id)
    results = _filter_by_side(_split_by_player(games, player_id), side)
    by_team, teams = _group_by_team(results)

    rows = [
        PlayerTeamSummaryRow(
            team=TeamOut.model_validate(teams[team_id]), summary=summarize(team_results)
        )
        for team_id, team_results in by_team.items()
    ]
    rows.sort(key=lambda r: r.summary.win_pct, reverse=True)
    return rows


async def team_summary(
    db: AsyncSession,
    team_id: int,
    *,
    season_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> StatsSummary:
    games = await list_all_games(db, team_id=team_id, season_id=season_id, place_id=place_id)
    results = _filter_by_side(_split_by_team(games, team_id), side)
    return summarize(results)


async def team_extras(
    db: AsyncSession,
    team_id: int,
    *,
    season_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> TeamExtras:
    games = await list_all_games(db, team_id=team_id, season_id=season_id, place_id=place_id)
    results = _filter_by_side(_split_by_team(games, team_id), side)
    best_win_streak, worst_lose_streak = _streaks(results)

    by_player: dict[int, list[_Result]] = {}
    players: dict[int, Player] = {}
    for r in results:
        by_player.setdefault(r.own.player_id, []).append(r)
        players[r.own.player_id] = r.own.player

    records = []
    for player_id, player_results in by_player.items():
        s = summarize(player_results)
        records.append(
            PlayerRecord(
                player=PlayerOut.model_validate(players[player_id]),
                games_played=s.games_played,
                wins=s.wins,
                losses=s.losses,
            )
        )

    most_played = max(records, key=lambda r: r.games_played, default=None)
    most_wins = max(records, key=lambda r: r.wins, default=None)
    most_losses = max(records, key=lambda r: r.losses, default=None)

    return TeamExtras(
        best_win_streak=best_win_streak,
        worst_lose_streak=worst_lose_streak,
        most_played_player=most_played,
        most_wins_player=most_wins,
        most_losses_player=most_losses,
    )


async def place_summary(
    db: AsyncSession, place_id: int, *, season_id: int | None = None
) -> PlaceSummary:
    games = await list_all_games(db, place_id=place_id, season_id=season_id)

    by_player: dict[int, list[_Result]] = {}
    players: dict[int, Player] = {}
    for game in games:
        for side in game.sides:
            opp = next(s for s in game.sides if s is not side)
            by_player.setdefault(side.player_id, []).append(
                _Result(date=game.date, own=side, opp=opp)
            )
            players[side.player_id] = side.player

    standings = []
    for player_id, results in by_player.items():
        s = summarize(results)
        standings.append(
            PlaceStanding(
                player=PlayerOut.model_validate(players[player_id]),
                games_played=s.games_played,
                wins=s.wins,
                losses=s.losses,
                ties=s.ties,
            )
        )
    standings.sort(key=lambda s: s.wins, reverse=True)

    return PlaceSummary(games_played=len(games), standings=standings)


async def head_to_head(
    db: AsyncSession,
    player_a_id: int,
    player_b_id: int,
    *,
    season_id: int | None = None,
    place_id: int | None = None,
    team_id_a: int | None = None,
    team_id_b: int | None = None,
    side: SideFilter | None = None,
) -> HeadToHeadOut:
    games = await list_all_games(
        db, player_id=player_a_id, season_id=season_id, place_id=place_id
    )
    games = [g for g in games if any(s.player_id == player_b_id for s in g.sides)]

    def side_for(game: Game, player_id: int) -> GameSide:
        return next(s for s in game.sides if s.player_id == player_id)

    if team_id_a is not None:
        games = [g for g in games if side_for(g, player_a_id).team_id == team_id_a]
    if team_id_b is not None:
        games = [g for g in games if side_for(g, player_b_id).team_id == team_id_b]
    if side is not None:
        games = [g for g in games if side_for(g, player_a_id).side == side]

    results_a = _split_by_player(games, player_a_id)
    results_b = _split_by_player(games, player_b_id)

    player_a = results_a[0].own.player if results_a else None
    player_b = results_a[0].opp.player if results_a else None

    if player_a is None or player_b is None:
        # No shared games — still need PlayerOut for both, fetched directly.
        a_obj = await db.get(Player, player_a_id)
        b_obj = await db.get(Player, player_b_id)
        assert a_obj is not None
        assert b_obj is not None
        player_a, player_b = a_obj, b_obj

    a_wins = sum(1 for r in results_a if _outcome(r) == "W")
    b_wins = sum(1 for r in results_a if _outcome(r) == "L")
    ties = len(results_a) - a_wins - b_wins

    return HeadToHeadOut(
        player_a=PlayerOut.model_validate(player_a),
        player_b=PlayerOut.model_validate(player_b),
        games_played=len(results_a),
        player_a_wins=a_wins,
        player_b_wins=b_wins,
        ties=ties,
        player_a_goals_for=sum(r.own.goals for r in results_a),
        player_b_goals_for=sum(r.opp.goals for r in results_a),
        player_a_summary=summarize(results_a),
        player_b_summary=summarize(results_b),
    )


async def _group_all_players(
    db: AsyncSession,
    *,
    season_id: int | None,
    team_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> tuple[dict[int, list[_Result]], dict[int, Player]]:
    games = await list_all_games(db, season_id=season_id, place_id=place_id)

    by_player: dict[int, list[_Result]] = {}
    players: dict[int, Player] = {}
    for game in games:
        for game_side in game.sides:
            if team_id is not None and game_side.team_id != team_id:
                continue
            if side is not None and game_side.side != side:
                continue
            opp = next(s for s in game.sides if s is not game_side)
            by_player.setdefault(game_side.player_id, []).append(
                _Result(date=game.date, own=game_side, opp=opp)
            )
            players[game_side.player_id] = game_side.player

    # Show every player at 0 only for the genuinely-unfiltered, no-games-
    # logged-yet case — not when a specific season/team/place/side combo
    # just happens to match nothing, which should read as "no games yet"
    # for that filter rather than implying every player is scoreless.
    no_filters_active = season_id is None and team_id is None and place_id is None and side is None
    if not by_player and no_filters_active:
        all_players = (await db.execute(select(Player))).scalars().all()
        for p in all_players:
            players[p.id] = p
            by_player[p.id] = []

    return by_player, players


async def leaderboard(
    db: AsyncSession, metric: MetricKey, *, season_id: int | None = None
) -> LeaderboardResponse:
    by_player, players = await _group_all_players(db, season_id=season_id)

    entries = []
    for player_id, results in by_player.items():
        s = summarize(results)
        entries.append(
            LeaderboardEntry(
                player=PlayerOut.model_validate(players[player_id]),
                games_played=s.games_played,
                value=_metric_value(s, metric),
            )
        )
    entries.sort(key=lambda e: e.value, reverse=True)

    return LeaderboardResponse(metric=metric, entries=entries)


async def all_player_summaries(
    db: AsyncSession,
    *,
    season_id: int | None = None,
    team_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> list[PlayerSummaryRow]:
    """Every player's full StatsSummary in one call — backs the Home page
    leaderboard table, which shows all the main stats at once rather than
    one metric at a time behind a selector."""
    by_player, players = await _group_all_players(
        db, season_id=season_id, team_id=team_id, place_id=place_id, side=side
    )

    rows = [
        PlayerSummaryRow(player=PlayerOut.model_validate(players[pid]), summary=summarize(results))
        for pid, results in by_player.items()
    ]
    rows.sort(key=lambda r: r.summary.win_pct, reverse=True)
    return rows


async def trend(
    db: AsyncSession,
    metric: MetricKey,
    x_axis: Literal["date", "games_played"],
    *,
    season_id: int | None = None,
    player_id: int | None = None,
    team_id: int | None = None,
    place_id: int | None = None,
    side: SideFilter | None = None,
) -> TrendResponse:
    games = await list_all_games(db, season_id=season_id, team_id=team_id, place_id=place_id)

    by_player: dict[int, list[_Result]] = {}
    players: dict[int, Player] = {}
    for game in games:
        for game_side in game.sides:
            if team_id is not None and game_side.team_id != team_id:
                continue
            if player_id is not None and game_side.player_id != player_id:
                continue
            if side is not None and game_side.side != side:
                continue
            opp = next(s for s in game.sides if s is not game_side)
            by_player.setdefault(game_side.player_id, []).append(
                _Result(date=game.date, own=game_side, opp=opp)
            )
            players[game_side.player_id] = game_side.player

    series = []
    for pid, results in by_player.items():
        points = []
        for i in range(1, len(results) + 1):
            s = summarize(results[:i])
            x = str(results[i - 1].date) if x_axis == "date" else str(i)
            points.append(TrendPoint(x=x, value=_metric_value(s, metric)))
        series.append(TrendSeries(player=PlayerOut.model_validate(players[pid]), points=points))

    return TrendResponse(metric=metric, x_axis=x_axis, series=series)
