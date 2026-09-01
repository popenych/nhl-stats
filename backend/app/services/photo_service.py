import re
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


def slugify(text: str) -> str:
    """Filesystem-friendly label for descriptive filenames — collapses
    whitespace to hyphens and drops characters that are awkward in
    filenames, but keeps non-ASCII names (e.g. Cyrillic) as-is rather than
    transliterating or stripping them."""
    text = text.strip()
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"[^\w\-]", "", text, flags=re.UNICODE)
    return text or "x"


def rename_photo(relative_path: str, new_stem: str) -> str:
    """Renames an already-saved photo in place (same subdir, same
    extension) to a more descriptive filename — game photos are saved
    during OCR extraction, before the real metadata (players/date/season/
    place) is confirmed, so they start out as a bare UUID and get renamed
    once that's known. Returns the new relative path; a no-op (returns the
    path unchanged) if the file isn't there to rename."""
    old_path = Path(settings.photo_storage_dir) / relative_path
    if not old_path.exists():
        return relative_path

    subdir = Path(relative_path).parent
    new_relative_path = str(subdir / f"{new_stem}{old_path.suffix}")
    new_path = Path(settings.photo_storage_dir) / new_relative_path
    if new_path == old_path:
        return relative_path
    old_path.rename(new_path)
    return new_relative_path
