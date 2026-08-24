"""Bootstrap the first admin account (there's no self-registration — see the plan's
Auth & Permissions section). Run once after the DB is migrated:

    python scripts/create_admin.py <username> <password> <player-name> [email]
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import async_session_maker  # noqa: E402
from app.models.user import UserRole  # noqa: E402
from app.schemas.player import PlayerCreate  # noqa: E402
from app.schemas.user import UserCreate  # noqa: E402
from app.services.user_service import (  # noqa: E402
    UsernameOrPlayerNameTakenError,
    create_user_with_player,
)


async def main() -> None:
    if len(sys.argv) < 4:
        print(__doc__)
        raise SystemExit(1)

    username, password, player_name = sys.argv[1], sys.argv[2], sys.argv[3]
    email = sys.argv[4] if len(sys.argv) > 4 else None

    data = UserCreate(
        username=username,
        password=password,
        role=UserRole.ADMIN,
        email=email,
        player=PlayerCreate(name=player_name),
    )

    async with async_session_maker() as db:
        try:
            user = await create_user_with_player(db, data)
        except UsernameOrPlayerNameTakenError:
            print(f"Username '{username}' or player name '{player_name}' is already taken.")
            raise SystemExit(1) from None

    print(f"Created admin user '{user.username}' (id={user.id}).")


if __name__ == "__main__":
    asyncio.run(main())
