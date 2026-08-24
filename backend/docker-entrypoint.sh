#!/usr/bin/env bash
# Runs on every container start: brings the schema up to date and makes sure
# the team seed data exists (both idempotent — safe to run on an existing DB).
set -euo pipefail

alembic upgrade head
python -m app.seed.seed_teams

# docker-compose.override.yml passes its own `command:` (with --reload) for
# local dev — respect that instead of always hardcoding the prod invocation.
if [ "$#" -gt 0 ]; then
  exec "$@"
else
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000
fi
