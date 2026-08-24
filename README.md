# nhl-stats

App for tracking NHL PlayStation game stats among friends: log a game by photographing the
post-game stats screen, get stats extracted automatically (with a review/edit step), and browse
season/all-time stats, trends, and per-player/team/place breakdowns.

Full architecture, decisions, and phased build order: see the plan written during initial
planning (ask to have it copied into `docs/architecture.md` once Phase 0 is complete).

## Local development

Requires [miniforge/conda](https://github.com/conda-forge/miniforge) (already installed on this
machine). Docker is only needed for Phase 5 deployment — day-to-day dev runs both apps directly.

```bash
# One-time setup
mamba env create -f environment.yml
conda activate nhl-stats

# Backend (FastAPI) — http://localhost:8000
cd backend
mkdir -p data/db data/photos data/backups   # gitignored local runtime state
uvicorn app.main:app --reload

# Frontend (Vite/React) — http://localhost:5173, in a second terminal
conda activate nhl-stats
cd frontend
npm run dev
```

Backend checks: `ruff check .` / `mypy app` / `pytest` (from `backend/`).
Frontend checks: `npx tsc --noEmit` / `npx eslint .` / `npm run build` (from `frontend/`).

## Deployment (Docker Compose)

Runs backend + frontend + Caddy (reverse proxy/HTTPS) + a backup sidecar. Same compose file for
local testing and the VPS — only `.env` and the Caddyfile's domain differ.

```bash
cp .env.example .env   # fill in JWT_SECRET (random) and, once ready, the Yandex backup creds
docker compose build
docker compose up -d
```

The app is then at `http://localhost` (port 80). The backend container runs migrations and seeds
the team list automatically on every start (both idempotent). First backend startup downloads
PaddleOCR's models (~tens of MB) into the `paddle-models` volume — subsequent starts reuse them.

One-time admin bootstrap (no self-registration by design):

```bash
docker compose exec backend python scripts/create_admin.py <username> <password> <player-name>
```

### Backups

The `backup` container pushes a daily SQLite snapshot + the photos directory to Yandex Disk via
`rclone`. Requires a real `infra/rclone/rclone.conf` (gitignored — copy
`infra/rclone/rclone.conf.example` and fill in a Yandex *app password*, not your account
password, from https://id.yandex.com/security/app-passwords). Without it, the backup container
logs a clear config error and retries the next day rather than crash-looping.

### Deploying to the VPS

1. Copy the repo to the VPS, `cp .env.example .env` and fill it in for real (long random
   `JWT_SECRET`, `CORS_ORIGINS` if needed, Yandex backup creds).
2. Replace the `:80` placeholder in `infra/Caddyfile` with your real domain — Caddy then handles
   HTTPS automatically.
3. Set up `infra/rclone/rclone.conf` for backups (see above).
4. `docker compose up -d --build`, then bootstrap the first admin as above.
5. Test a restore at least once — see `infra/backup/restore.sh`.
