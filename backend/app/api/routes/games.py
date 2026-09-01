from datetime import date as date_

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from starlette.concurrency import run_in_threadpool

from app.api.deps import CurrentUser, DbSession
from app.models.game import Game
from app.models.game_side import Side
from app.models.team import Team
from app.models.user import User
from app.ocr.pipeline import OCR_SEMAPHORE, extract_stats
from app.schemas.game import GameCreate, GameListItem, GameListResponse, GameOut, GameUpdate
from app.schemas.ocr import ExtractResponse, to_extract_response
from app.services import game_service
from app.services.photo_service import save_photo

router = APIRouter(prefix="/games", tags=["games"])


@router.post("/photo")
async def upload_game_photo(_user: CurrentUser, file: UploadFile = File(...)) -> dict[str, str]:
    photo_path = await save_photo(file, "games")
    return {"photo_path": photo_path}


async def _find_team_by_abbreviation(db: DbSession, abbreviation: str | None) -> Team | None:
    if not abbreviation:
        return None
    result = await db.execute(
        select(Team).where(func.upper(Team.abbreviation) == abbreviation.upper())
    )
    return result.scalar_one_or_none()


@router.post("/extract", response_model=ExtractResponse)
async def extract_game_photo(
    db: DbSession, _user: CurrentUser, file: UploadFile = File(...)
) -> object:
    """Uploads + saves the photo (so its path can be reused when creating the
    game) and runs the OCR pipeline against it. Nothing is persisted as a
    Game here — this only returns a draft for the review/edit screen."""
    contents = await file.read()
    await file.seek(0)
    photo_path = await save_photo(file, "games")
    # PaddleOCR inference is CPU-bound sync work — offload it so it doesn't
    # block the event loop. The semaphore keeps concurrent uploads from
    # running OCR in parallel (real memory-spike/OOM risk on a small VPS) —
    # a second request just waits its turn instead.
    async with OCR_SEMAPHORE:
        result = await run_in_threadpool(extract_stats, contents)

    away_team_text = result.away_team.value if result.away_team else None
    home_team_text = result.home_team.value if result.home_team else None
    away_team_match = await _find_team_by_abbreviation(db, away_team_text)
    home_team_match = await _find_team_by_abbreviation(db, home_team_text)

    return to_extract_response(result, photo_path, away_team_match, home_team_match)


def _to_game_out(game: Game, user: User) -> GameOut:
    return GameOut.model_validate(game).model_copy(
        update={"can_edit": game_service.can_edit_game(user, game)}
    )


def _to_game_list_item(game: Game, user: User) -> GameListItem:
    return GameListItem.model_validate(game).model_copy(
        update={"can_edit": game_service.can_edit_game(user, game)}
    )


@router.get("", response_model=GameListResponse)
async def list_games(
    db: DbSession,
    user: CurrentUser,
    player_id: int | None = None,
    team_id: int | None = None,
    opponent_team_id: int | None = None,
    season_id: int | None = None,
    place_id: int | None = None,
    date_from: date_ | None = None,
    date_to: date_ | None = None,
    side: Side | None = None,
    sort: str = Query("date_desc", pattern="^(date_desc|date_asc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> object:
    items, total = await game_service.list_games(
        db,
        player_id=player_id,
        team_id=team_id,
        opponent_team_id=opponent_team_id,
        season_id=season_id,
        place_id=place_id,
        date_from=date_from,
        date_to=date_to,
        side=side,
        sort_desc=(sort == "date_desc"),
        page=page,
        page_size=page_size,
    )
    return {"items": [_to_game_list_item(g, user) for g in items], "total": total}


@router.get("/{game_id}", response_model=GameOut)
async def get_game(game_id: int, db: DbSession, user: CurrentUser) -> object:
    try:
        game = await game_service.get_game(db, game_id)
    except game_service.GameNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found") from exc
    return _to_game_out(game, user)


@router.post("", response_model=GameOut, status_code=status.HTTP_201_CREATED)
async def create_game(data: GameCreate, db: DbSession, user: CurrentUser) -> object:
    game = await game_service.create_game(db, data, created_by_user_id=user.id)
    return _to_game_out(game, user)


@router.patch("/{game_id}", response_model=GameOut)
async def update_game(game_id: int, data: GameUpdate, db: DbSession, user: CurrentUser) -> object:
    try:
        game = await game_service.get_game(db, game_id)
    except game_service.GameNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found") from exc
    if not game_service.can_edit_game(user, game):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to edit this game",
        )
    game = await game_service.update_game(db, game, data)
    return _to_game_out(game, user)


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_game(game_id: int, db: DbSession, user: CurrentUser) -> None:
    try:
        game = await game_service.get_game(db, game_id)
    except game_service.GameNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found") from exc
    if not game_service.can_edit_game(user, game):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this game",
        )
    await game_service.delete_game(db, game)
