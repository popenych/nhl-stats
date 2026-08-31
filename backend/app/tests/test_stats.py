from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.models.game_side import GameSide, Side
from app.models.place import Place
from app.models.season import Season
from app.models.team import Team
from app.models.user import User
from app.schemas.player import PlayerCreate
from app.schemas.user import UserCreate
from app.services import stats_service
from app.services.user_service import create_user_with_player


async def _create_user(db: AsyncSession, username: str) -> User:
    return await create_user_with_player(
        db,
        UserCreate(
            username=username,
            password="hunter2pass",
            player=PlayerCreate(name=username.capitalize()),
        ),
    )


def _side(
    player_id: int,
    team_id: int,
    *,
    goals: int,
    shots: int,
    faceoffs_won: int,
    pp_goals: int,
    pp_total: int,
) -> GameSide:
    return GameSide(
        player_id=player_id,
        team_id=team_id,
        goals=goals,
        shots=shots,
        hits=10,
        time_on_attack_seconds=300,
        passing_pct=80.0,
        faceoffs_won=faceoffs_won,
        penalty_minutes_seconds=0,
        powerplay_goals=pp_goals,
        powerplay_total=pp_total,
        powerplay_minutes_seconds=0,
        shorthanded_goals=0,
    )


@pytest.fixture
async def scenario(db: AsyncSession) -> dict:
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    team_a = Team(abbreviation="OTT", name="Ottawa Senators")
    team_b = Team(abbreviation="NSH", name="Nashville Predators")
    season = Season(name="NHL 26", sort_order=1)
    place = Place(name="Alex's place")
    db.add_all([team_a, team_b, season, place])
    await db.commit()

    def side(
        side_enum: Side,
        player_id: int,
        team_id: int,
        goals: int,
        shots: int,
        faceoffs_won: int,
        pp_goals: int,
        pp_total: int,
    ) -> GameSide:
        s = _side(
            player_id,
            team_id,
            goals=goals,
            shots=shots,
            faceoffs_won=faceoffs_won,
            pp_goals=pp_goals,
            pp_total=pp_total,
        )
        s.side = side_enum
        return s

    # Game 1: alex (home) beats friend (away) 3-1
    g1 = Game(
        date=date(2026, 1, 1),
        season_id=season.id,
        place_id=place.id,
        photo_path="games/1.jpg",
        created_by_user_id=alex.id,
    )
    g1.sides = [
        side(Side.HOME, alex.player_id, team_a.id, 3, 10, 5, 1, 2),
        side(Side.AWAY, friend.player_id, team_b.id, 1, 8, 3, 0, 1),
    ]

    # Game 2: alex (away) ties friend (home) 2-2
    g2 = Game(
        date=date(2026, 1, 2),
        season_id=season.id,
        place_id=place.id,
        photo_path="games/2.jpg",
        created_by_user_id=alex.id,
    )
    g2.sides = [
        side(Side.HOME, friend.player_id, team_a.id, 2, 7, 6, 1, 2),
        side(Side.AWAY, alex.player_id, team_b.id, 2, 6, 4, 0, 1),
    ]

    # Game 3: alex (home) loses to friend (away) 1-4
    g3 = Game(
        date=date(2026, 1, 3),
        season_id=season.id,
        place_id=place.id,
        photo_path="games/3.jpg",
        created_by_user_id=alex.id,
    )
    g3.sides = [
        side(Side.HOME, alex.player_id, team_a.id, 1, 5, 2, 0, 0),
        side(Side.AWAY, friend.player_id, team_b.id, 4, 9, 8, 2, 3),
    ]

    db.add_all([g1, g2, g3])
    await db.commit()

    return {
        "alex_id": alex.player_id,
        "friend_id": friend.player_id,
        "team_a_id": team_a.id,
        "season_id": season.id,
        "place_id": place.id,
    }


async def test_player_summary_computes_record_and_rates(db: AsyncSession, scenario: dict) -> None:
    summary = await stats_service.player_summary(db, scenario["alex_id"])

    assert summary.games_played == 3
    assert (summary.wins, summary.losses, summary.ties) == (1, 1, 1)
    assert summary.win_pct == pytest.approx(1 / 3)
    assert summary.goals_for == 6
    assert summary.goals_against == 7
    assert summary.goals_for_per_game == pytest.approx(2.0)
    assert summary.shooting_pct == pytest.approx(6 / 21)
    assert summary.faceoff_pct == pytest.approx(11 / 28)
    assert summary.pp_pct == pytest.approx(1 / 3)
    assert summary.pk_pct == pytest.approx(0.5)
    assert summary.current_streak == "L1"
    assert summary.last5 == "LTW"
    assert summary.shots_for == 21
    assert summary.faceoffs_won == 11
    assert summary.time_on_attack_avg_seconds == pytest.approx(300.0)
    assert summary.powerplay_goals == 1
    assert summary.powerplay_total == 3
    assert summary.hits_for == 30
    assert summary.goal_diff == -1
    assert summary.goal_diff_per_game == pytest.approx((6 - 7) / 3)
    assert summary.penalty_minutes_total_seconds == pytest.approx(0.0)
    assert summary.penalty_minutes_avg_seconds == pytest.approx(0.0)
    assert summary.penalty_kill_situations == 6
    assert summary.penalty_kills_successful == 3


async def test_player_summary_filters_by_team(db: AsyncSession, scenario: dict) -> None:
    summary = await stats_service.player_summary(
        db, scenario["alex_id"], team_id=scenario["team_a_id"]
    )

    # Alex wore team_a in games 1 (win) and 3 (loss) only — game 2 (tie) was team_b.
    assert summary.games_played == 2
    assert (summary.wins, summary.losses, summary.ties) == (1, 1, 0)
    assert summary.goals_for == 3 + 1
    assert summary.goals_against == 1 + 4


async def test_player_summary_filters_by_side(db: AsyncSession, scenario: dict) -> None:
    # Alex was home in games 1 and 3, away in game 2.
    home_summary = await stats_service.player_summary(db, scenario["alex_id"], side="home")
    away_summary = await stats_service.player_summary(db, scenario["alex_id"], side="away")

    assert home_summary.games_played == 2
    assert (home_summary.wins, home_summary.losses) == (1, 1)
    assert away_summary.games_played == 1
    assert away_summary.ties == 1


async def test_player_team_breakdown(db: AsyncSession, scenario: dict) -> None:
    rows = await stats_service.player_team_breakdown(db, scenario["alex_id"])

    by_abbr = {r.team.abbreviation: r.summary for r in rows}
    assert set(by_abbr) == {"OTT", "NSH"}
    assert by_abbr["OTT"].games_played == 2
    assert (by_abbr["OTT"].wins, by_abbr["OTT"].losses) == (1, 1)
    assert by_abbr["NSH"].games_played == 1
    assert by_abbr["NSH"].ties == 1


async def test_head_to_head_filters_by_team_and_side(db: AsyncSession, scenario: dict) -> None:
    h2h = await stats_service.head_to_head(
        db,
        scenario["alex_id"],
        scenario["friend_id"],
        team_id_a=scenario["team_a_id"],
        side="home",
    )

    # Only games 1 and 3 have alex wearing team_a at home — game 2 is excluded.
    assert h2h.games_played == 2
    assert h2h.player_a_wins == 1
    assert h2h.player_b_wins == 1
    assert h2h.ties == 0


async def test_player_extras_streaks_and_team_breakdown(db: AsyncSession, scenario: dict) -> None:
    extras = await stats_service.player_extras(db, scenario["alex_id"])

    # Outcomes in order: W, T, L — no streak longer than 1 either direction.
    assert extras.best_win_streak == 1
    assert extras.worst_lose_streak == 1

    assert extras.most_played_team is not None
    assert extras.most_played_team.team.abbreviation == "OTT"
    assert extras.most_played_team.games_played == 2
    assert extras.most_wins_team is not None
    assert extras.most_wins_team.team.abbreviation == "OTT"
    assert extras.most_wins_team.wins == 1
    assert extras.most_losses_team is not None
    assert extras.most_losses_team.team.abbreviation == "OTT"
    assert extras.most_losses_team.losses == 1


async def test_team_extras_streaks_and_player_breakdown(db: AsyncSession, scenario: dict) -> None:
    extras = await stats_service.team_extras(db, scenario["team_a_id"])

    # As team_a: g1 (alex, W), g2 (friend, T), g3 (alex, L) -> W, T, L in order.
    assert extras.best_win_streak == 1
    assert extras.worst_lose_streak == 1

    assert extras.most_played_player is not None
    assert extras.most_played_player.player.id == scenario["alex_id"]
    assert extras.most_played_player.games_played == 2
    assert extras.most_wins_player is not None
    assert extras.most_wins_player.player.id == scenario["alex_id"]
    assert extras.most_wins_player.wins == 1
    assert extras.most_losses_player is not None
    assert extras.most_losses_player.player.id == scenario["alex_id"]
    assert extras.most_losses_player.losses == 1


async def test_player_extras_includes_game_records(db: AsyncSession, scenario: dict) -> None:
    """g1 alex 3-1 (best diff +2, best GF), g3 alex 1-4 (worst diff -3,
    worst GA) — g2's 2-2 tie is neither extreme."""
    extras = await stats_service.player_extras(db, scenario["alex_id"])

    assert extras.best_diff_game is not None
    assert extras.best_diff_game.diff == 2
    assert extras.best_diff_game.own_goals == 3
    assert extras.best_diff_game.opp_goals == 1

    assert extras.worst_diff_game is not None
    assert extras.worst_diff_game.diff == -3
    assert extras.worst_diff_game.own_goals == 1
    assert extras.worst_diff_game.opp_goals == 4

    assert extras.best_gf_game is not None
    assert extras.best_gf_game.own_goals == 3

    assert extras.worst_ga_game is not None
    assert extras.worst_ga_game.opp_goals == 4


async def test_team_extras_includes_game_records(db: AsyncSession, scenario: dict) -> None:
    extras = await stats_service.team_extras(db, scenario["team_a_id"])

    assert extras.best_diff_game is not None
    assert extras.best_diff_game.diff == 2
    assert extras.worst_diff_game is not None
    assert extras.worst_diff_game.diff == -3


async def test_player_team_extras_scopes_to_one_player_and_team(
    db: AsyncSession, scenario: dict
) -> None:
    """Alex wore team_a in games 1 (win, diff +2) and 3 (loss, diff -3) only
    — game 2 (tie, as team_b) is excluded. No most_X fields: nothing to
    compare once both player and team are fixed."""
    extras = await stats_service.player_team_extras(db, scenario["alex_id"], scenario["team_a_id"])

    assert extras.best_win_streak == 1
    assert extras.worst_lose_streak == 1
    assert extras.most_played_player is None
    assert extras.most_wins_player is None
    assert extras.most_losses_player is None
    assert extras.best_diff_game is not None
    assert extras.best_diff_game.diff == 2
    assert extras.worst_diff_game is not None
    assert extras.worst_diff_game.diff == -3


async def test_head_to_head_extras_scoped_to_shared_games(db: AsyncSession, scenario: dict) -> None:
    """Alex and friend's only games are the 3 shared ones in `scenario`, so
    h2h-scoped extras should equal each player's own overall extras."""
    h2h = await stats_service.head_to_head(db, scenario["alex_id"], scenario["friend_id"])

    assert h2h.player_a_extras.best_win_streak == 1
    assert h2h.player_a_extras.worst_lose_streak == 1
    assert h2h.player_a_extras.best_diff_game is not None
    assert h2h.player_a_extras.best_diff_game.diff == 2
    assert h2h.player_a_extras.most_played_team is not None
    assert h2h.player_a_extras.most_played_team.team.abbreviation == "OTT"

    # player_b (friend) perspective: g1 loss (diff -2), g2 tie, g3 win (diff +3).
    assert h2h.player_b_extras.best_diff_game is not None
    assert h2h.player_b_extras.best_diff_game.diff == 3
    assert h2h.player_b_extras.worst_diff_game is not None
    assert h2h.player_b_extras.worst_diff_game.diff == -2


def test_streaks_finds_longest_run_anywhere_in_sequence() -> None:
    from types import SimpleNamespace

    from app.services.stats_service import _Result, _streaks

    def result(own_goals: int, opp_goals: int) -> _Result:
        return _Result(
            date=date(2026, 1, 1),
            own=SimpleNamespace(goals=own_goals),  # type: ignore[arg-type]
            opp=SimpleNamespace(goals=opp_goals),  # type: ignore[arg-type]
            game_id=0,
        )

    # W W L L L T W W W  -> best win streak 3, worst lose streak 3
    sequence = [
        result(1, 0),
        result(1, 0),
        result(0, 1),
        result(0, 1),
        result(0, 1),
        result(1, 1),
        result(1, 0),
        result(1, 0),
        result(1, 0),
    ]
    best_win, worst_lose = _streaks(sequence)
    assert best_win == 3
    assert worst_lose == 3


async def test_player_summary_empty_when_no_games(db: AsyncSession, scenario: dict) -> None:
    other = await _create_user(db, "nobody")
    summary = await stats_service.player_summary(db, other.player_id)
    assert summary.games_played == 0
    assert summary.win_pct == 0.0
    assert summary.pk_pct == 0.0


async def test_all_player_summaries_returns_every_player_with_full_stats(
    db: AsyncSession, scenario: dict
) -> None:
    rows = await stats_service.all_player_summaries(db)

    by_player = {r.player.id: r.summary for r in rows}
    assert set(by_player) == {scenario["alex_id"], scenario["friend_id"]}
    assert by_player[scenario["alex_id"]].games_played == 3
    assert by_player[scenario["alex_id"]].win_pct == pytest.approx(1 / 3)
    # sorted by win_pct descending; both are tied here, so just check ordering is stable/valid
    assert [r.summary.win_pct for r in rows] == sorted(
        (r.summary.win_pct for r in rows), reverse=True
    )


async def test_all_player_summaries_empty_under_filter_does_not_list_everyone(
    db: AsyncSession, scenario: dict
) -> None:
    """A filter combo matching zero games should read as "no games yet" for
    that filter — not silently fall back to listing every player at 0, which
    is only correct for the genuinely-unfiltered/no-games-anywhere case."""
    unused_team = Team(abbreviation="TOR", name="Toronto Maple Leafs")
    db.add(unused_team)
    await db.commit()

    rows = await stats_service.all_player_summaries(db, team_id=unused_team.id)

    assert rows == []


async def test_head_to_head(db: AsyncSession, scenario: dict) -> None:
    h2h = await stats_service.head_to_head(db, scenario["alex_id"], scenario["friend_id"])

    assert h2h.games_played == 3
    assert h2h.player_a_wins == 1
    assert h2h.player_b_wins == 1
    assert h2h.ties == 1
    assert h2h.player_a_goals_for == 6
    assert h2h.player_b_goals_for == 7

    # Both summaries are scoped to just these 3 shared games — since alex and
    # friend only ever played each other in this scenario, they match each
    # player's overall summary from test_player_summary_computes_record_and_rates.
    assert h2h.player_a_summary.wins == 1
    assert h2h.player_a_summary.shots_for == 21
    assert h2h.player_a_summary.faceoffs_won == 11
    assert h2h.player_b_summary.goals_for == 7
    assert h2h.player_b_summary.goals_against == 6


async def test_leaderboard_sorts_descending(db: AsyncSession, scenario: dict) -> None:
    result = await stats_service.leaderboard(db, "goals_for_per_game")

    assert [e.player.id for e in result.entries] == [
        scenario["friend_id"],
        scenario["alex_id"],
    ]
    assert result.entries[0].value == pytest.approx(7 / 3)


async def test_trend_is_cumulative(db: AsyncSession, scenario: dict) -> None:
    result = await stats_service.trend(db, "win_pct", "games_played", player_id=scenario["alex_id"])

    assert len(result.series) == 1
    points = result.series[0].points
    assert [p.x for p in points] == ["1", "2", "3"]
    assert points[0].value == pytest.approx(1.0)
    assert points[1].value == pytest.approx(0.5)
    assert points[2].value == pytest.approx(1 / 3)


async def test_trend_by_date_collapses_same_day_games_to_last_value(
    db: AsyncSession, scenario: dict
) -> None:
    """Real bug: a player who logs two games on the same calendar date (date
    has day granularity only) should show one by-date point reflecting their
    state after *both* games — not stall at whichever game's value the chart
    happened to pick for that shared x. games_played is unaffected — every
    game still gets its own point there."""
    team_a_id = scenario["team_a_id"]
    same_day = date(2026, 1, 10)

    g4 = Game(
        date=same_day,
        season_id=scenario["season_id"],
        place_id=scenario["place_id"],
        photo_path="games/4.jpg",
        created_by_user_id=scenario["alex_id"],
    )
    g4_home = _side(
        scenario["alex_id"], team_a_id, goals=3, shots=10, faceoffs_won=5, pp_goals=0, pp_total=0
    )
    g4_home.side = Side.HOME
    g4_away = _side(
        scenario["friend_id"], team_a_id, goals=1, shots=8, faceoffs_won=3, pp_goals=0, pp_total=0
    )
    g4_away.side = Side.AWAY
    g4.sides = [g4_home, g4_away]

    g5 = Game(
        date=same_day,
        season_id=scenario["season_id"],
        place_id=scenario["place_id"],
        photo_path="games/5.jpg",
        created_by_user_id=scenario["alex_id"],
    )
    g5_home = _side(
        scenario["friend_id"], team_a_id, goals=3, shots=10, faceoffs_won=5, pp_goals=0, pp_total=0
    )
    g5_home.side = Side.HOME
    g5_away = _side(
        scenario["alex_id"], team_a_id, goals=1, shots=8, faceoffs_won=3, pp_goals=0, pp_total=0
    )
    g5_away.side = Side.AWAY
    g5.sides = [g5_home, g5_away]

    db.add_all([g4, g5])
    await db.commit()

    by_date = await stats_service.trend(db, "win_pct", "date", player_id=scenario["alex_id"])
    date_points = by_date.series[0].points
    assert [p.x for p in date_points] == ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-10"]
    # 4 games played by this point (1-1 through 1-3), 2 wins so far -> then
    # the same-day win+loss keeps the win count at 2/5, not stuck at 3/4.
    assert date_points[-1].value == pytest.approx(2 / 5)

    by_games = await stats_service.trend(
        db, "win_pct", "games_played", player_id=scenario["alex_id"]
    )
    assert [p.x for p in by_games.series[0].points] == ["1", "2", "3", "4", "5"]


async def test_place_summary_totals_games(db: AsyncSession, scenario: dict) -> None:
    summary = await stats_service.place_summary(db, scenario["place_id"])

    assert summary.games_played == 3
    by_player = {s.player.id: s for s in summary.standings}
    assert by_player[scenario["alex_id"]].games_played == 3
    assert by_player[scenario["friend_id"]].games_played == 3


async def test_leaderboard_route_smoke(
    client: AsyncClient, db: AsyncSession, scenario: dict
) -> None:
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    res = await client.get("/stats/leaderboard", params={"metric": "win_pct"})
    assert res.status_code == 200
    assert res.json()["metric"] == "win_pct"
