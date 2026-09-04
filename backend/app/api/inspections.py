from fastapi import APIRouter, HTTPException, UploadFile

from app.schemas.analysis import ImageQualityResult, QualityCheckItem, ReviewInput, ReviewResponse
from app.schemas.inspection import InspectionCreate, InspectionImageResponse, InspectionResponse
from app.store import (
    StoredImage,
    StoredInspection,
    get_inspection,
    inspections,
    new_id,
    store_certificate,
    utc_now_iso,
)

router = APIRouter(prefix="/inspections", tags=["Inspections"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/pjpeg",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

QUALITY_CHECKS = (
    QualityCheckItem(
        key="sharpness",
        label="Sharpness / Focus",
        score=94,
        passed=True,
        explanation="Edges of onion bulbs are clearly defined.",
    ),
    QualityCheckItem(
        key="lighting",
        label="Lighting Uniformity",
        score=88,
        passed=True,
        explanation="Even illumination across the sample tray.",
    ),
    QualityCheckItem(
        key="coverage",
        label="Sample Coverage",
        score=91,
        passed=True,
        explanation="Minimum 80% of frame occupied by sample.",
    ),
    QualityCheckItem(
        key="contrast",
        label="Colour Contrast",
        score=86,
        passed=False,
        explanation="Sufficient contrast for defect detection.",
    ),
)


def _require_inspection(inspection_id: str) -> StoredInspection:
    inspection = get_inspection(inspection_id)
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return inspection


def _to_response(inspection: StoredInspection) -> InspectionResponse:
    return InspectionResponse(
        id=inspection.id,
        variety=inspection.variety,
        weightKg=inspection.weight_kg,
        location=inspection.location,
        createdAt=inspection.created_at,
        status=inspection.status,
    )


def _is_allowed_image(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    if content_type in ALLOWED_IMAGE_TYPES:
        return True
    name = (file.filename or "").lower()
    return any(name.endswith(ext) for ext in ALLOWED_EXTENSIONS)


@router.post("", response_model=InspectionResponse)
def create_inspection(payload: InspectionCreate) -> InspectionResponse:
    inspection = StoredInspection(
        id=new_id("insp"),
        variety=payload.variety,
        weight_kg=payload.weightKg,
        location=payload.location,
        created_at=utc_now_iso(),
        status="draft",
    )
    inspections[inspection.id] = inspection
    return _to_response(inspection)


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection_by_id(inspection_id: str) -> InspectionResponse:
    return _to_response(_require_inspection(inspection_id))


@router.post("/{inspection_id}/images", response_model=InspectionImageResponse)
async def upload_inspection_image(
    inspection_id: str,
    file: UploadFile,
) -> InspectionImageResponse:
    inspection = _require_inspection(inspection_id)

    if not _is_allowed_image(file):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload a JPEG or PNG image.",
        )

    await file.read()

    image = StoredImage(
        id=new_id("img"),
        uploaded_at=utc_now_iso(),
        filename=file.filename or "unknown",
        content_type=file.content_type or "application/octet-stream",
    )
    inspection.images.append(image)
    inspection.status = "in_progress"

    return InspectionImageResponse(id=image.id, uploadedAt=image.uploaded_at)


@router.post(
    "/{inspection_id}/images/{image_id}/quality-check",
    response_model=ImageQualityResult,
)
def check_image_quality(inspection_id: str, image_id: str) -> ImageQualityResult:
    inspection = _require_inspection(inspection_id)
    if not any(image.id == image_id for image in inspection.images):
        raise HTTPException(status_code=404, detail="Image not found")

    return ImageQualityResult(
        imageId=image_id,
        passed=True,
        issues=[],
        score=92,
        checks=list(QUALITY_CHECKS),
    )


@router.patch("/{inspection_id}/review", response_model=ReviewResponse)
def submit_review(inspection_id: str, payload: ReviewInput) -> ReviewResponse:
    inspection = _require_inspection(inspection_id)
    if inspection.result is None:
        raise HTTPException(
            status_code=400,
            detail="Results not available yet. Complete analysis first.",
        )

    certificate_id = new_id("cert")
    issued_at = utc_now_iso()
    result = inspection.result or {}
    grade = payload.overrideGrade or result.get("grade") or "Grade A"
    qr_token = f"qr-{certificate_id}"
    analyzed_at = result.get("analyzedAt") or issued_at
    certificate = {
        "id": certificate_id,
        "inspectionId": inspection_id,
        "grade": grade,
        "issuedAt": issued_at,
        "batchLabel": f"{inspection.variety} — {inspection.location}",
        "qrToken": qr_token,
        "inspectorName": "Rajesh Patil",
        "procurementCentre": inspection.location,
        "specification": inspection.variety,
        "sampleSize": result.get("totalOnions"),
        "confidence": result.get("confidence"),
        "defectSummary": payload.notes or result.get("summary"),
        "auditTimeline": [
            {"event": "Inspection completed", "time": inspection.created_at},
            {"event": "AI analysis verified", "time": analyzed_at},
            {"event": "Human review approved", "time": issued_at},
            {"event": "Certificate issued", "time": issued_at},
        ],
    }
    inspection.status = "reviewed"
    inspection.review = {
        "certificateId": certificate_id,
        "approved": payload.approved,
        "notes": payload.notes,
        "overrideGrade": payload.overrideGrade,
    }
    inspection.certificate = certificate
    store_certificate(certificate)
    return ReviewResponse(
        inspectionId=inspection_id,
        certificateId=certificate_id,
        approved=payload.approved,
        notes=payload.notes,
    )
