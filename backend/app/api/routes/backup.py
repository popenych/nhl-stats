from pathlib import Path

from fastapi import APIRouter

from app.api.deps import AdminUser
from app.config import settings

router = APIRouter(prefix="/backup", tags=["backup"])


@router.post("/trigger")
async def trigger_backup(_admin: AdminUser) -> dict[str, str]:
    """Touches a file the backup sidecar polls for (see infra/backup/run.sh)
    — it runs a backup on its next poll (within ~30s) and removes the file.
    Outside Docker (e.g. local dev, no backup container running) this just
    writes a harmless file that nothing reads."""
    trigger_path = Path(settings.backup_trigger_path)
    trigger_path.parent.mkdir(parents=True, exist_ok=True)
    trigger_path.touch()
    return {"status": "ok"}
