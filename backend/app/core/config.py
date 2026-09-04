"""Minimal app settings. Reads optional environment variables; no extra packages."""

import os


class Settings:
    app_name: str = os.getenv("ONIVIS_APP_NAME", "ONIVIS API")
    environment: str = os.getenv("ONIVIS_ENV", "local")
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "https://onivis-frontend.onrender.com",
    ]


settings = Settings()
