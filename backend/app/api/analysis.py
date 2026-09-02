from fastapi import APIRouter, HTTPException, UploadFile

from app.api.inspections import inspections
from app.schemas.analysis import AnalysisResponse, DefectCounts, ImageUploadResponse

router = APIRouter(prefix="/api/v1/inspections", tags=["Analysis"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/pjpeg",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def _require_inspection(inspection_id: str) -> None:
    if inspection_id not in inspections:
        raise HTTPException(status_code=404, detail="Inspection not found")


def _is_allowed_image(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    if content_type in ALLOWED_IMAGE_TYPES:
        return True
    name = (file.filename or "").lower()
    return any(name.endswith(ext) for ext in ALLOWED_EXTENSIONS)


@router.post("/{inspection_id}/images", response_model=ImageUploadResponse)
async def upload_inspection_image(
    inspection_id: str,
    file: UploadFile,
) -> ImageUploadResponse:
    _require_inspection(inspection_id)

    if not _is_allowed_image(file):
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload a JPEG or PNG image.")

    # Read the file to confirm the upload, but do not save it to disk yet.
    await file.read()

    return ImageUploadResponse(
        inspection_id=inspection_id,
        filename=file.filename or "unknown",
        content_type=file.content_type or "application/octet-stream",
        status="uploaded",
    )


@router.post("/{inspection_id}/analyze", response_model=AnalysisResponse)
def analyze_inspection(inspection_id: str) -> AnalysisResponse:
    _require_inspection(inspection_id)

    # MOCK result only — not real defect detection. Same values every time.
    return AnalysisResponse(
        inspection_id=inspection_id,
        status="completed",
        grade="A",
        confidence=0.92,
        defects=DefectCounts(
            damaged=2,
            rotted=1,
            sprouted=0,
            undersized=3,
        ),
        visual_quality_score=91,
    )
