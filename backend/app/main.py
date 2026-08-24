from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from app.api.routes import auth, games, places, players, seasons, teams, users
from app.config import settings
from app.ocr.recognize import get_detector


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    # Loading PaddleOCR's models takes a few seconds — do it once at startup
    # so the first real /games/extract request isn't the one paying that
    # cost. Note: this also applies on every `uvicorn --reload` restart.
    await run_in_threadpool(get_detector)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="NHL Stats Tracker API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(players.router)
    app.include_router(teams.router)
    app.include_router(places.router)
    app.include_router(seasons.router)
    app.include_router(games.router)

    Path(settings.photo_storage_dir).mkdir(parents=True, exist_ok=True)
    app.mount("/photos", StaticFiles(directory=settings.photo_storage_dir), name="photos")

    return app


app = create_app()
