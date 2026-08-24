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


async def test_player_summary_empty_when_no_games(db: AsyncSession, scenario: dict) -> None:
    other = await _create_user(db, "nobody")
    summary = await stats_service.player_summary(db, other.player_id)
    assert summary.games_played == 0
    assert summary.win_pct == 0.0
    assert summary.pk_pct == 0.0


async def test_head_to_head(db: AsyncSession, scenario: dict) -> None:
    h2h = await stats_service.head_to_head(db, scenario["alex_id"], scenario["friend_id"])

    assert h2h.games_played == 3
    assert h2h.player_a_wins == 1
    assert h2h.player_b_wins == 1
    assert h2h.ties == 1
    assert h2h.player_a_goals_for == 6
    assert h2h.player_b_goals_for == 7


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
