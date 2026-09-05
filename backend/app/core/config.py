"""Application settings loaded from environment variables."""

import os
from pathlib import Path


def _resolve_model_path(name: str, default_filename: str) -> str:
    env_value = os.getenv(name)
    if env_value and env_value.strip():
        return env_value.strip()

    candidates = [
        Path(__file__).resolve().parents[1] / "models" / default_filename,
        Path(__file__).resolve().parents[2] / "models" / default_filename,
        Path.home() / "Downloads" / "onion_ai_api_share" / "models" / default_filename,
        Path.home() / "Downloads" / "onion-backend" / "models" / default_filename,
    ]

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    return str(candidates[0])


def _float_env(name: str) -> float | None:
    value = os.getenv(name)
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


class Settings:
    app_name: str = os.getenv("ONIVIS_APP_NAME", "ONIVIS API")
    environment: str = os.getenv("ONIVIS_ENV", "local")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_storage_bucket: str = os.getenv(
        "SUPABASE_STORAGE_BUCKET", "inspection-images"
    )
    analysis_provider: str = (
        os.getenv("ANALYSIS_PROVIDER")
        or os.getenv("ONIVIS_ANALYSIS_PROVIDER", "demo")
    )
    detection_model_path: str = _resolve_model_path(
        "DETECTION_MODEL_PATH", "detection_model.pt"
    )
    classification_model_path: str = _resolve_model_path(
        "CLASSIFICATION_MODEL_PATH", "best_classification_model.pt"
    )
    device: str = os.getenv("DEVICE", "cpu")
    detection_conf: float = float(os.getenv("DETECTION_CONF", "0.10"))
    classification_conf_threshold: float = float(
        os.getenv("CLASSIFICATION_CONF_THRESHOLD", "0.50")
    )
    window_width_mm: float | None = _float_env("WINDOW_WIDTH_MM")
    window_height_mm: float | None = _float_env("WINDOW_HEIGHT_MM")
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "https://onivis-frontend.onrender.com",
    ]


settings = Settings()
