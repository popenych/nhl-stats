from datetime import date as date_

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.models.game_side import GameSide, Side
from app.models.user import User, UserRole
from app.schemas.game import GameCreate, GameSideCreate, GameUpdate
from app.services.photo_service import rename_photo, slugify


class GameNotFoundError(Exception):
    pass


async def get_game(db: AsyncSession, game_id: int) -> Game:
    # populate_existing: forces a fresh load (incl. nested selectin eager loads
    # for sides[].player/team) even if this Game is already identity-mapped in
    # `db` with a partially-loaded `sides` collection — e.g. right after
    # create_game() constructs it by hand rather than via a query.
    query = select(Game).where(Game.id == game_id).execution_options(populate_existing=True)
    game = (await db.execute(query)).scalar_one_or_none()
    if game is None:
        raise GameNotFoundError
    return game


def can_edit_game(user: User, game: Game) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    return user.player_id in {side.player_id for side in game.sides}


def _apply_side(side: GameSide, data: GameSideCreate) -> None:
    side.player_id = data.player_id
    side.team_id = data.team_id
    side.goals = data.goals
    side.shots = data.shots
    side.hits = data.hits
    side.time_on_attack_seconds = data.time_on_attack_seconds
    side.passing_pct = data.passing_pct
    side.faceoffs_won = data.faceoffs_won
    side.penalty_minutes_seconds = data.penalty_minutes_seconds
    side.powerplay_goals = data.powerplay_goals
    side.powerplay_total = data.powerplay_total
    side.powerplay_minutes_seconds = data.powerplay_minutes_seconds
    side.shorthanded_goals = data.shorthanded_goals


def _descriptive_photo_stem(game: Game) -> str:
    """Pure — no filesystem/DB side effects, so it's safe to call for a
    dry-run preview (see scripts/rename_existing_game_photos.py). `game`
    must have its away/home/season/place relationships loaded."""
    return "_".join(
        [
            str(game.id),
            slugify(game.away.player.name),
            slugify(game.home.player.name),
            game.date.strftime("%d.%m.%Y"),  # matches the app's DD.MM.YYYY display format
            slugify(game.season.name),
            slugify(game.place.name),
        ]
    )


def _apply_descriptive_photo_name(game: Game) -> bool:
    """Renames game.photo_path from its raw upload UUID to something
    identifiable at a glance — photos are saved during OCR extraction,
    before the real metadata is confirmed, so they can't get a good name
    up front. Only called once the game's players/date/season/place are
    known (i.e. after create, or after a photo is replaced on edit).
    Actually renames the file on disk — returns whether game.photo_path
    changed, so the caller knows to commit."""
    new_path = rename_photo(game.photo_path, _descriptive_photo_stem(game))
    if new_path == game.photo_path:
        return False
    game.photo_path = new_path
    return True


async def create_game(db: AsyncSession, data: GameCreate, created_by_user_id: int) -> Game:
    game = Game(
        date=data.date or date_.today(),
        season_id=data.season_id,
        place_id=data.place_id,
        photo_path=data.photo_path,
        notes=data.notes,
        created_by_user_id=created_by_user_id,
    )
    home = GameSide(side=Side.HOME)
    away = GameSide(side=Side.AWAY)
    _apply_side(home, data.home)
    _apply_side(away, data.away)
    game.sides = [home, away]

    db.add(game)
    await db.commit()
    game = await get_game(db, game.id)

    if _apply_descriptive_photo_name(game):
        await db.commit()

    return await get_game(db, game.id)


async def update_game(db: AsyncSession, game: Game, data: GameUpdate) -> Game:
    photo_replaced = data.photo_path is not None

    if data.date is not None:
        game.date = data.date
    if data.season_id is not None:
        game.season_id = data.season_id
    if data.place_id is not None:
        game.place_id = data.place_id
    if data.photo_path is not None:
        game.photo_path = data.photo_path
    if data.notes is not None:
        game.notes = data.notes

    by_side = {s.side: s for s in game.sides}
    if data.home is not None:
        _apply_side(by_side[Side.HOME], data.home)
    if data.away is not None:
        _apply_side(by_side[Side.AWAY], data.away)

    await db.commit()
    game = await get_game(db, game.id)

    # A freshly-uploaded replacement photo starts as a bare UUID again, same
    # as at create time — give it a descriptive name too. Editing other
    # fields (date, players, ...) without replacing the photo intentionally
    # leaves an already-descriptive filename as-is.
    if photo_replaced and _apply_descriptive_photo_name(game):
        await db.commit()

    return await get_game(db, game.id)


async def delete_game(db: AsyncSession, game: Game) -> None:
    await db.delete(game)
    await db.commit()


def _filtered_games_query(
    *,
    player_id: int | None,
    team_id: int | None,
    season_id: int | None,
    place_id: int | None,
    date_from: date_ | None,
    date_to: date_ | None,
    side: Side | None = None,
) -> Select[tuple[Game]]:
    query = select(Game)
    if player_id is not None:
        subquery = select(GameSide.game_id).where(GameSide.player_id == player_id)
        # side means "this player's side" when a player is given — matching
        # how side filtering works everywhere else (stats_service's `_Result`
        # "own" side) — not "team_id's side", even if team_id is also given.
        if side is not None:
            subquery = subquery.where(GameSide.side == side)
        query = query.where(Game.id.in_(subquery))
    if team_id is not None:
        subquery = select(GameSide.game_id).where(GameSide.team_id == team_id)
        # No player given — side describes this team's own side instead.
        if side is not None and player_id is None:
            subquery = subquery.where(GameSide.side == side)
        query = query.where(Game.id.in_(subquery))
    if season_id is not None:
        query = query.where(Game.season_id == season_id)
    if place_id is not None:
        query = query.where(Game.place_id == place_id)
    if date_from is not None:
        query = query.where(Game.date >= date_from)
    if date_to is not None:
        query = query.where(Game.date <= date_to)
    return query


async def list_games(
    db: AsyncSession,
    *,
    player_id: int | None = None,
    team_id: int | None = None,
    season_id: int | None = None,
    place_id: int | None = None,
    date_from: date_ | None = None,
    date_to: date_ | None = None,
    side: Side | None = None,
    sort_desc: bool = True,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Game], int]:
    base_query = _filtered_games_query(
        player_id=player_id,
        team_id=team_id,
        season_id=season_id,
        place_id=place_id,
        date_from=date_from,
        date_to=date_to,
        side=side,
    )

    total = (await db.execute(select(func.count()).select_from(base_query.subquery()))).scalar_one()

    # Game.date has day granularity — created_at (and id as a final tiebreak,
    # in the rare case two games share the same created_at) orders games that
    # share a date by when they were actually logged, which for live usage
    # matches the order they were actually played in.
    order = Game.date.desc() if sort_desc else Game.date.asc()
    created_order = Game.created_at.desc() if sort_desc else Game.created_at.asc()
    id_order = Game.id.desc() if sort_desc else Game.id.asc()
    items_query = (
        base_query.order_by(order, created_order, id_order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = (await db.execute(items_query)).scalars().all()

    return list(items), total


async def list_all_games(
    db: AsyncSession,
    *,
    player_id: int | None = None,
    team_id: int | None = None,
    season_id: int | None = None,
    place_id: int | None = None,
) -> list[Game]:
    """Unpaginated, chronological (oldest first) — for stats aggregation,
    which needs the full matching set rather than a page of it. Games sharing
    a date (day granularity only) are ordered by when they were actually
    logged (created_at, then id as a final tiebreak) — see list_games."""
    query = _filtered_games_query(
        player_id=player_id,
        team_id=team_id,
        season_id=season_id,
        place_id=place_id,
        date_from=None,
        date_to=None,
    ).order_by(Game.date.asc(), Game.created_at.asc(), Game.id.asc())
    return list((await db.execute(query)).scalars().all())
