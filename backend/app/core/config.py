"""Minimal app settings. Reads optional environment variables; no extra packages."""

import os


class Settings:
    # Used in API metadata and the root JSON response.
    app_name: str = os.getenv("ONIVIS_APP_NAME", "ONIVIS API")
    # local / staging / production — informational only for now.
    environment: str = os.getenv("ONIVIS_ENV", "local")


settings = Settings()
