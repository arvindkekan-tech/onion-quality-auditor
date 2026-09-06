from fastapi import APIRouter, HTTPException, UploadFile

from app.schemas.analysis import ImageQualityResult, QualityCheckItem, ReviewInput, ReviewResponse
from app.schemas.inspection import (
    InspectionCreate,
    InspectionHistoryResponse,
    InspectionImageResponse,
    InspectionResponse,
)
from app import store
from app.storage import remove_image, remove_images, upload_image

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


def _require_inspection(inspection_id: str) -> store.StoredInspection:
    inspection = store.get_inspection(inspection_id)
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return inspection


def _to_response(inspection: store.StoredInspection) -> InspectionResponse:
    return InspectionResponse(
        id=inspection.id,
        variety=inspection.variety,
        weightKg=inspection.weight_kg,
        location=inspection.location,
        createdAt=inspection.created_at,
        status=inspection.status,
    )


def _to_history_response(
    inspection: store.StoredInspection,
) -> InspectionHistoryResponse:
    result = inspection.result or {}
    latest_image = inspection.images[-1] if inspection.images else None
    certificate_id = (
        inspection.certificate.get("id")
        if inspection.certificate
        else inspection.review.get("certificateId")
        if inspection.review
        else None
    )
    return InspectionHistoryResponse(
        id=inspection.id,
        variety=inspection.variety,
        location=inspection.location,
        createdAt=inspection.created_at,
        status=inspection.status,
        grade=result.get("grade"),
        totalOnions=result.get("totalOnions"),
        imageId=latest_image.id if latest_image else None,
        analysisStatus=inspection.analysis_status,
        certificateId=certificate_id,
        reviewSubmitted=inspection.review is not None,
    )


def _is_allowed_image(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    if content_type in ALLOWED_IMAGE_TYPES:
        return True
    name = (file.filename or "").lower()
    return any(name.endswith(ext) for ext in ALLOWED_EXTENSIONS)


@router.post("", response_model=InspectionResponse)
def create_inspection(payload: InspectionCreate) -> InspectionResponse:
    inspection = store.create_inspection(
        id=store.new_id("insp"),
        variety=payload.variety,
        weight_kg=payload.weightKg,
        location=payload.location,
        created_at=store.utc_now_iso(),
    )
    return _to_response(inspection)


@router.get("", response_model=list[InspectionHistoryResponse])
def list_inspection_history() -> list[InspectionHistoryResponse]:
    return [_to_history_response(item) for item in store.list_inspections()]


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection_by_id(inspection_id: str) -> InspectionResponse:
    return _to_response(_require_inspection(inspection_id))


@router.delete("/{inspection_id}", status_code=204)
def delete_inspection(inspection_id: str) -> None:
    inspection = _require_inspection(inspection_id)
    try:
        remove_images([image.storage_path for image in inspection.images])
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to remove inspection images from Storage",
        ) from exc
    store.delete_inspection(inspection_id)


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

    content = await file.read()
    image_id = store.new_id("img")
    filename = file.filename or "unknown"
    content_type = file.content_type or "application/octet-stream"
    storage_path, url = upload_image(
        inspection_id,
        image_id,
        filename,
        content,
        content_type,
    )
    try:
        image = store.create_image(
            id=image_id,
            inspection_id=inspection_id,
            uploaded_at=store.utc_now_iso(),
            filename=filename,
            content_type=content_type,
            storage_path=storage_path,
            url=url,
        )
    except Exception:
        try:
            remove_image(storage_path)
        except Exception:
            pass
        raise

    return InspectionImageResponse(
        id=image.id,
        url=image.url,
        uploadedAt=image.uploaded_at,
    )


@router.post(
    "/{inspection_id}/images/{image_id}/quality-check",
    response_model=ImageQualityResult,
)
def check_image_quality(inspection_id: str, image_id: str) -> ImageQualityResult:
    inspection = _require_inspection(inspection_id)
    if store.get_image(inspection_id, image_id) is None:
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

    if payload.approved:
        certificate_id = store.new_id("cert")
        issued_at = store.utc_now_iso()
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
        store.save_review_and_certificate(
            inspection_id,
            {
                "approved": True,
                "notes": payload.notes,
                "overrideGrade": payload.overrideGrade,
            },
            certificate,
        )
        return ReviewResponse(
            inspectionId=inspection_id,
            certificateId=certificate_id,
            approved=True,
            notes=payload.notes,
        )
    else:
        store.save_review_rejection(
            inspection_id,
            {
                "approved": False,
                "notes": payload.notes,
                "overrideGrade": payload.overrideGrade or "Rejected",
            },
        )
        return ReviewResponse(
            inspectionId=inspection_id,
            certificateId=None,
            approved=False,
            notes=payload.notes,
        )
