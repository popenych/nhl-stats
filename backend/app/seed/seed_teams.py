"""Idempotent upsert of app/seed/teams.yaml into the teams table.

Usage (from backend/): python -m app.seed.seed_teams
"""

import asyncio
from pathlib import Path

import yaml
from sqlalchemy import select

from app.db import async_session_maker
from app.models.team import Team

TEAMS_YAML = Path(__file__).parent / "teams.yaml"


async def seed_teams() -> None:
    teams_data = yaml.safe_load(TEAMS_YAML.read_text())

    async with async_session_maker() as db:
        existing = {t.abbreviation: t for t in (await db.execute(select(Team))).scalars()}

        created, updated = 0, 0
        for entry in teams_data:
            team = existing.get(entry["abbreviation"])
            if team is None:
                db.add(Team(abbreviation=entry["abbreviation"], name=entry["name"]))
                created += 1
            elif team.name != entry["name"]:
                team.name = entry["name"]
                updated += 1

        await db.commit()
        print(f"Teams seeded: {created} created, {updated} updated, {len(teams_data)} total.")


if __name__ == "__main__":
    asyncio.run(seed_teams())
