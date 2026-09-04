"""Application settings loaded from environment variables."""

import os


class Settings:
    app_name: str = os.getenv("ONIVIS_APP_NAME", "ONIVIS API")
    environment: str = os.getenv("ONIVIS_ENV", "local")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_storage_bucket: str = os.getenv(
        "SUPABASE_STORAGE_BUCKET", "inspection-images"
    )
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "https://onivis-frontend.onrender.com",
    ]


settings = Settings()
