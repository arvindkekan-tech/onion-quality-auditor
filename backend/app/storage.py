from __future__ import annotations

import re
from pathlib import Path, PurePosixPath

from app.core.config import settings
from app.core.supabase import get_supabase_client

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"


def safe_filename(filename: str) -> str:
    name = PurePosixPath(filename).name
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip(".-")
    return name or "image"


def _is_supabase_configured() -> bool:
    try:
        client = get_supabase_client()
        return client is not None
    except Exception:
        return False


def upload_image(
    inspection_id: str,
    image_id: str,
    filename: str,
    content: bytes,
    content_type: str,
) -> tuple[str, str]:
    path = f"{inspection_id}/{image_id}-{safe_filename(filename)}"
    # Always persist locally first so local inference is instant and offline-capable
    local_path = UPLOAD_DIR / path
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(content)
    base = settings.public_base_url.rstrip("/")
    public_url = f"{base}/uploads/{path}"

    if _is_supabase_configured():
        try:
            storage = get_supabase_client().storage.from_(settings.supabase_storage_bucket)
            storage.upload(
                path,
                content,
                {"content-type": content_type, "upsert": "false"},
            )
            supa_url = storage.get_public_url(path)
            return path, supa_url
        except Exception:
            pass

    return path, public_url


def remove_image(path: str) -> None:
    if _is_supabase_configured():
        try:
            storage = get_supabase_client().storage.from_(settings.supabase_storage_bucket)
            storage.remove([path])
        except Exception:
            pass

    local_path = UPLOAD_DIR / path
    if local_path.exists():
        try:
            local_path.unlink()
        except Exception:
            pass


def remove_images(paths: list[str]) -> None:
    if not paths:
        return
    for path in paths:
        remove_image(path)


def get_local_image_bytes(path: str) -> bytes | None:
    local_path = UPLOAD_DIR / path
    if local_path.exists():
        return local_path.read_bytes()
    return None
