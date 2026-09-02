from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.inspections import router as inspections_router
from app.api.analysis import router as analysis_router
from app.core.config import settings

app = FastAPI(title=settings.app_name)

# Versioned API routes (health first; more routers will be added later).
app.include_router(health_router)
app.include_router(inspections_router)
app.include_router(analysis_router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "service": "onivis-api",
        "environment": settings.environment,
        "message": "ONIVIS API is running",
    }
