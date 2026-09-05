from __future__ import annotations

from pathlib import PurePosixPath
import re

from app.core.config import settings
from app.core.supabase import get_supabase_client


def safe_filename(filename: str) -> str:
    name = PurePosixPath(filename).name
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip(".-")
    return name or "image"


def upload_image(
    inspection_id: str,
    image_id: str,
    filename: str,
    content: bytes,
    content_type: str,
) -> tuple[str, str]:
    path = f"{inspection_id}/{image_id}-{safe_filename(filename)}"
    storage = get_supabase_client().storage.from_(settings.supabase_storage_bucket)
    storage.upload(
        path,
        content,
        {"content-type": content_type, "upsert": "false"},
    )
    public_url = storage.get_public_url(path)
    return path, public_url


def remove_image(path: str) -> None:
    storage = get_supabase_client().storage.from_(settings.supabase_storage_bucket)
    storage.remove([path])


def remove_images(paths: list[str]) -> None:
    if not paths:
        return
    storage = get_supabase_client().storage.from_(settings.supabase_storage_bucket)
    storage.remove(paths)