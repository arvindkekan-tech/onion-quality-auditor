from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.analysis import router as analysis_router
from app.api.auth import router as auth_router
from app.api.certificates import router as certificates_router
from app.api.health import router as health_router
from app.api.inspections import router as inspections_router
from app.core.config import settings
from app.store import PersistenceError

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
from app.storage import UPLOAD_DIR

app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(inspections_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1")
app.include_router(certificates_router, prefix="/api/v1")
# Frontend default VITE_API_BASE_URL is http://localhost:8000 (no /api/v1).
app.include_router(auth_router)
app.include_router(inspections_router)
app.include_router(analysis_router)
app.include_router(certificates_router)


@app.get("/health", tags=["health"])
def root_health() -> dict[str, str]:
    return {"status": "ok", "service": "onivis-api"}

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    message = detail if isinstance(detail, str) else str(detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": message, "code": str(exc.status_code)},
    )


@app.exception_handler(PersistenceError)
async def persistence_exception_handler(
    _request: Request,
    _exc: PersistenceError,
) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"message": "Persistence service unavailable", "code": "persistence_error"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request,
    _exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"message": "Invalid request", "code": "validation_error"},
    )


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "service": "onivis-api",
        "environment": settings.environment,
        "message": "ONIVIS API is running",
    }
