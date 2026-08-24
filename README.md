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
