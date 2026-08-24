import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # phone photos, generously sized


async def save_photo(upload_file: UploadFile, subdir: str) -> str:
    """Saves an uploaded image under PHOTO_STORAGE_DIR/<subdir>/ and returns the
    path relative to PHOTO_STORAGE_DIR (what gets stored in the DB and served
    back via the /photos static mount)."""
    ext = ALLOWED_CONTENT_TYPES.get(upload_file.content_type or "")
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type — use JPEG, PNG, or WebP",
        )

    contents = await upload_file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large (max 15MB)"
        )

    relative_path = f"{subdir}/{uuid.uuid4()}{ext}"
    full_path = Path(settings.photo_storage_dir) / relative_path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_bytes(contents)

    return relative_path
