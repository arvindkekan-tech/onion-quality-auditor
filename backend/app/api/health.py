import os
from typing import Any
from fastapi import APIRouter

from app.core.config import settings
from app.store import check_supabase_health

router = APIRouter(prefix="/api/v1", tags=["health"])


def get_system_health() -> dict[str, Any]:
    supabase_configured = bool(settings.supabase_url and settings.supabase_service_role_key)
    supabase_ref = None
    if supabase_configured and settings.supabase_url and "supabase.co" in settings.supabase_url:
        supabase_ref = settings.supabase_url.split("//")[-1].split(".")[0]

    healthy, db_error = check_supabase_health()
    if healthy:
        db_status = "connected"
    elif supabase_configured:
        db_status = "sqlite_fallback"
    else:
        db_status = "sqlite_local"

    det_exists = os.path.exists(settings.detection_model_path)
    cls_exists = os.path.exists(settings.classification_model_path)

    overall_status = "ok"
    if not det_exists or not cls_exists:
        overall_status = "degraded"

    return {
        "status": overall_status,
        "service": "onivis-api",
        "environment": settings.environment,
        "commit": os.getenv("RENDER_GIT_COMMIT", "unknown"),
        "database": {
            "status": db_status,
            "supabaseConfigured": supabase_configured,
            "supabaseRef": supabase_ref,
            "error": db_error,
        },
        "ml": {
            "provider": settings.analysis_provider,
            "device": settings.device,
            "detectionModel": {
                "path": settings.detection_model_path,
                "exists": det_exists,
            },
            "classificationModel": {
                "path": settings.classification_model_path,
                "exists": cls_exists,
            },
        },
    }


@router.get("/health")
def health_check() -> dict[str, Any]:
    return get_system_health()
