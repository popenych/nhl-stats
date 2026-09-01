from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.place import Place
from app.models.season import Season
from app.models.team import Team
from app.models.user import User, UserRole
from app.schemas.player import PlayerCreate
from app.schemas.user import UserCreate
from app.services.user_service import create_user_with_player


async def _create_user(
    db: AsyncSession, username: str, *, role: UserRole = UserRole.MEMBER
) -> User:
    return await create_user_with_player(
        db,
        UserCreate(
            username=username,
            password="hunter2pass",
            role=role,
            player=PlayerCreate(name=username.capitalize()),
        ),
    )


async def _seed_reference_data(db: AsyncSession) -> dict[str, int]:
    home_team = Team(abbreviation="OTT", name="Ottawa Senators")
    away_team = Team(abbreviation="NSH", name="Nashville Predators")
    season = Season(name="NHL 26", sort_order=1)
    place = Place(name="Alex's place")
    db.add_all([home_team, away_team, season, place])
    await db.commit()
    return {
        "home_team_id": home_team.id,
        "away_team_id": away_team.id,
        "season_id": season.id,
        "place_id": place.id,
    }


def _side_payload(player_id: int, team_id: int, *, goals: int) -> dict:
    return {
        "player_id": player_id,
        "team_id": team_id,
        "goals": goals,
        "shots": 18,
        "hits": 11,
        "time_on_attack_seconds": 401,
        "passing_pct": 81.9,
        "faceoffs_won": 7,
        "penalty_minutes_seconds": 240,
        "powerplay_goals": 2,
        "powerplay_total": 2,
        "powerplay_minutes_seconds": 204,
        "shorthanded_goals": 0,
    }


async def test_create_game_requires_distinct_players(client: AsyncClient, db: AsyncSession) -> None:
    alex = await _create_user(db, "alex")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    res = await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/test.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(alex.player_id, ref["away_team_id"], goals=1),
        },
    )

    assert res.status_code == 422


async def test_create_and_get_game(client: AsyncClient, db: AsyncSession) -> None:
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    create_res = await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/test.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )
    assert create_res.status_code == 201
    game_id = create_res.json()["id"]
    assert create_res.json()["home"]["goals"] == 2
    assert create_res.json()["home"]["player"]["name"] == "Alex"

    get_res = await client.get(f"/games/{game_id}")
    assert get_res.status_code == 200
    assert get_res.json()["away"]["team"]["abbreviation"] == "NSH"


async def test_list_games_filters_by_player(client: AsyncClient, db: AsyncSession) -> None:
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    other = await _create_user(db, "other")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )
    await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/2.jpg",
            "home": _side_payload(friend.player_id, ref["home_team_id"], goals=3),
            "away": _side_payload(other.player_id, ref["away_team_id"], goals=0),
        },
    )

    res = await client.get("/games", params={"player_id": alex.player_id})
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1


async def test_list_games_filters_by_side(client: AsyncClient, db: AsyncSession) -> None:
    """side means "this player's side" when player_id is given — regression
    for the Home/Guest filter never applying to any of the app's "recent
    games" widgets, since GET /games never accepted a side param at all."""
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )
    await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/2.jpg",
            "home": _side_payload(friend.player_id, ref["home_team_id"], goals=3),
            "away": _side_payload(alex.player_id, ref["away_team_id"], goals=0),
        },
    )

    home_res = await client.get("/games", params={"player_id": alex.player_id, "side": "home"})
    away_res = await client.get("/games", params={"player_id": alex.player_id, "side": "away"})

    assert home_res.json()["total"] == 1
    assert home_res.json()["items"][0]["home"]["player"]["name"] == "Alex"
    assert away_res.json()["total"] == 1
    assert away_res.json()["items"][0]["away"]["player"]["name"] == "Alex"


async def test_list_games_team_filter_requires_players_own_side(
    client: AsyncClient, db: AsyncSession
) -> None:
    """player_id + team_id together means "games where THIS player wore
    THIS team" — not "games where this team appeared on either side",
    which used to wrongly include games where only the opponent wore it."""
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    # alex wears home_team, friend wears away_team.
    await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )

    own_team = await client.get(
        "/games", params={"player_id": alex.player_id, "team_id": ref["home_team_id"]}
    )
    opponents_team = await client.get(
        "/games", params={"player_id": alex.player_id, "team_id": ref["away_team_id"]}
    )

    assert own_team.json()["total"] == 1
    assert opponents_team.json()["total"] == 0


async def test_list_games_filters_by_opponent_team(client: AsyncClient, db: AsyncSession) -> None:
    """opponent_team_id matches the OTHER side's team — backs the player
    page's "Team (opponent)" filter."""
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )

    matches = await client.get(
        "/games",
        params={"player_id": alex.player_id, "opponent_team_id": ref["away_team_id"]},
    )
    no_matches = await client.get(
        "/games",
        params={"player_id": alex.player_id, "opponent_team_id": ref["home_team_id"]},
    )

    assert matches.json()["total"] == 1
    assert no_matches.json()["total"] == 0


async def test_create_game_renames_photo_to_descriptive_name(
    client: AsyncClient, db: AsyncSession, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "photo_storage_dir", str(tmp_path))
    old_path = tmp_path / "games" / "raw-uuid.jpg"
    old_path.parent.mkdir(parents=True)
    old_path.write_bytes(b"fake jpeg bytes")

    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    res = await client.post(
        "/games",
        json={
            "date": "2026-03-14",
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/raw-uuid.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )

    assert res.status_code == 201
    game_id = res.json()["id"]
    new_photo_path = res.json()["photo_path"]
    # slugify strips (not replaces) characters outside \w/hyphen, so the
    # apostrophe in "Alex's place" is dropped rather than kept or hyphenated.
    # Date matches the app's DD.MM.YYYY display format, not the ISO input.
    assert new_photo_path == f"games/{game_id}_Friend_Alex_14.03.2026_NHL-26_Alexs-place.jpg"
    assert not old_path.exists()
    assert (tmp_path / new_photo_path).exists()
    assert (tmp_path / new_photo_path).read_bytes() == b"fake jpeg bytes"


async def test_non_participant_member_can_edit_game_under_default_everyone_policy(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Default policy (game_edit_permission="everyone") — any logged-in
    member can edit any game, not just its two participants."""
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    await _create_user(db, "outsider")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    create_res = await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )
    game_id = create_res.json()["id"]
    assert create_res.json()["can_edit"] is True

    await client.post("/auth/logout")
    await client.post("/auth/login", json={"username": "outsider", "password": "hunter2pass"})

    get_res = await client.get(f"/games/{game_id}")
    assert get_res.json()["can_edit"] is True

    res = await client.patch(f"/games/{game_id}", json={"notes": "not hacked, just allowed"})
    assert res.status_code == 200


async def test_non_participant_member_cannot_edit_game_under_participants_policy(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "game_edit_permission", "participants")
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    await _create_user(db, "outsider")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    create_res = await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )
    game_id = create_res.json()["id"]

    await client.post("/auth/logout")
    await client.post("/auth/login", json={"username": "outsider", "password": "hunter2pass"})

    get_res = await client.get(f"/games/{game_id}")
    assert get_res.json()["can_edit"] is False

    res = await client.patch(f"/games/{game_id}", json={"notes": "hacked"})
    assert res.status_code == 403


async def test_admin_policy_blocks_even_a_participant(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "game_edit_permission", "admin")
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    create_res = await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )
    game_id = create_res.json()["id"]
    # alex is a participant in their own just-created game, but the "admin"
    # policy blocks everyone except the admin role, no exception for that.
    assert create_res.json()["can_edit"] is False

    res = await client.patch(f"/games/{game_id}", json={"notes": "still blocked"})
    assert res.status_code == 403


async def test_admin_can_always_edit_regardless_of_policy_or_window(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "game_edit_permission", "admin")
    monkeypatch.setattr(settings, "game_edit_window_days", 7)
    admin = await _create_user(db, "boss", role=UserRole.ADMIN)
    friend = await _create_user(db, "friend")
    await client.post("/auth/login", json={"username": "boss", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    create_res = await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(admin.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )
    assert create_res.json()["can_edit"] is True


async def test_edit_window_blocks_editing_after_it_expires(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import update

    from app.models.game import Game

    monkeypatch.setattr(settings, "game_edit_window_days", 7)
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    create_res = await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )
    game_id = create_res.json()["id"]
    assert create_res.json()["can_edit"] is True

    stale = datetime.now(UTC) - timedelta(days=8)
    await db.execute(update(Game).where(Game.id == game_id).values(created_at=stale))
    await db.commit()

    get_res = await client.get(f"/games/{game_id}")
    assert get_res.json()["can_edit"] is False

    res = await client.patch(f"/games/{game_id}", json={"notes": "too late"})
    assert res.status_code == 403


async def test_participant_can_edit_game(client: AsyncClient, db: AsyncSession) -> None:
    alex = await _create_user(db, "alex")
    friend = await _create_user(db, "friend")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    create_res = await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )
    game_id = create_res.json()["id"]

    await client.post("/auth/logout")
    await client.post("/auth/login", json={"username": "friend", "password": "hunter2pass"})

    res = await client.patch(f"/games/{game_id}", json={"notes": "fixed a typo"})
    assert res.status_code == 200
    assert res.json()["notes"] == "fixed a typo"


async def test_admin_can_delete_any_game(client: AsyncClient, db: AsyncSession) -> None:
    alex = await _create_user(db, "alex", role=UserRole.ADMIN)
    friend = await _create_user(db, "friend")
    await client.post("/auth/login", json={"username": "alex", "password": "hunter2pass"})
    ref = await _seed_reference_data(db)

    create_res = await client.post(
        "/games",
        json={
            "season_id": ref["season_id"],
            "place_id": ref["place_id"],
            "photo_path": "games/1.jpg",
            "home": _side_payload(alex.player_id, ref["home_team_id"], goals=2),
            "away": _side_payload(friend.player_id, ref["away_team_id"], goals=1),
        },
    )
    game_id = create_res.json()["id"]

    del_res = await client.delete(f"/games/{game_id}")
    assert del_res.status_code == 204

    get_res = await client.get(f"/games/{game_id}")
    assert get_res.status_code == 404
