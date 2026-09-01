"""One-time backfill: renames every existing game's photo from its raw
upload UUID to a descriptive filename (same logic newly-created games get
automatically — see game_service._apply_descriptive_photo_name). Safe to
re-run; already-renamed photos are left alone.

    python scripts/rename_existing_game_photos.py [--dry-run]

--dry-run prints what would change without touching the filesystem or DB.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.db import async_session_maker  # noqa: E402
from app.models.game import Game  # noqa: E402
from app.services.game_service import (  # noqa: E402
    _apply_descriptive_photo_name,
    _descriptive_photo_stem,
)


async def main() -> None:
    dry_run = "--dry-run" in sys.argv

    async with async_session_maker() as db:
        games = (await db.execute(select(Game))).scalars().all()

        changed = 0
        for game in games:
            old_path = game.photo_path
            if dry_run:
                stem = _descriptive_photo_stem(game)
                new_path = f"{Path(old_path).parent}/{stem}{Path(old_path).suffix}"
                if new_path != old_path:
                    changed += 1
                    print(f"[dry run] game {game.id}: {old_path} -> {new_path}")
            elif _apply_descriptive_photo_name(game):
                changed += 1
                print(f"game {game.id}: {old_path} -> {game.photo_path}")

        if dry_run:
            print(f"\n[dry run] would rename {changed}/{len(games)} photo(s) — no changes made.")
        else:
            await db.commit()
            print(f"\nRenamed {changed}/{len(games)} photo(s).")


if __name__ == "__main__":
    asyncio.run(main())
