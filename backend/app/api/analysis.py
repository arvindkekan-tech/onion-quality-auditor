from fastapi import APIRouter, HTTPException

from app.api.inspections import _require_inspection
from app.analysis_provider import get_analysis_provider
from app.schemas.analysis import AnalysisStatusResponse, InspectionResult
from app import store

router = APIRouter(prefix="/inspections", tags=["Analysis"])

def _complete_analysis(inspection: store.StoredInspection) -> None:
    try:
        normalized = get_analysis_provider().analyze(inspection)
    except Exception:
        store.update_inspection(
            inspection.id,
            {"analysis_status": "failed", "status": "in_progress"},
        )
        return
    result = {
        "inspectionId": inspection.id,
        "grade": normalized.grade,
        "confidence": normalized.confidence,
        "classification": normalized.classification,
        "totalOnions": normalized.total_onions,
        "modelName": normalized.model_name,
        "defects": normalized.defects,
        "summary": normalized.summary,
        "analyzedAt": normalized.analyzed_at,
        "healthyCount": normalized.healthy_count,
        "rottenDamagedCount": normalized.rotten_damaged_count,
        "sproutedCount": normalized.sprouted_count,
        "uncertainCount": normalized.uncertain_count,
        "annotatedImageUrl": normalized.annotated_image_url,
        "annotatedImagePath": normalized.annotated_image_path,
        "sizeEstimation": normalized.size_estimation,
        "detections": normalized.detections,
        "gradeExplanation": getattr(normalized, "grade_explanation", None),
        "attentionRequired": getattr(normalized, "attention_required", False),
        "attentionReason": getattr(normalized, "attention_reason", None),
    }
    store.save_analysis_result(inspection.id, result)
    store.update_inspection(
        inspection.id,
        {"analysis_status": "completed", "status": "completed"},
    )


def _status_payload(inspection: store.StoredInspection) -> AnalysisStatusResponse:
    status = inspection.analysis_status
    if status is None:
        return AnalysisStatusResponse(
            inspectionId=inspection.id,
            status="pending",
            progress=0,
            message="Waiting to start analysis.",
        )
    if status == "pending":
        return AnalysisStatusResponse(
            inspectionId=inspection.id,
            status="pending",
            progress=0,
            message="Analysis queued.",
        )
    if status == "processing":
        progress = 35 if inspection.analysis_poll_count < 2 else 75
        message = (
            "Running quality model…"
            if inspection.analysis_poll_count < 2
            else "Aggregating defect signals…"
        )
        return AnalysisStatusResponse(
            inspectionId=inspection.id,
            status="processing",
            progress=progress,
            message=message,
        )
    if status == "failed":
        return AnalysisStatusResponse(
            inspectionId=inspection.id,
            status="failed",
            progress=0,
            message="Analysis failed. Please try again.",
        )
    return AnalysisStatusResponse(
        inspectionId=inspection.id,
        status="completed",
        progress=100,
        message="Analysis complete.",
    )


@router.post("/{inspection_id}/analyze", response_model=AnalysisStatusResponse)
def analyze_inspection(inspection_id: str) -> AnalysisStatusResponse:
    inspection = _require_inspection(inspection_id)
    if not inspection.images:
        raise HTTPException(
            status_code=400,
            detail="Upload at least one JPEG or PNG image before analysis.",
        )

    store.update_inspection(
        inspection_id,
        {
            "analysis_status": "pending",
            "analysis_poll_count": 0,
        },
    )
    inspection = _require_inspection(inspection_id)
    return _status_payload(inspection)


@router.get("/{inspection_id}/analysis-status", response_model=AnalysisStatusResponse)
def get_analysis_status(inspection_id: str) -> AnalysisStatusResponse:
    inspection = _require_inspection(inspection_id)

    if inspection.analysis_status in {"pending", "processing"}:
        poll_count = inspection.analysis_poll_count + 1
        if poll_count < 4:
            store.update_inspection(
                inspection_id,
                {"analysis_poll_count": poll_count, "analysis_status": "processing"},
            )
        else:
            _complete_analysis(inspection)

        inspection = _require_inspection(inspection_id)

    return _status_payload(inspection)


@router.get("/{inspection_id}/results", response_model=InspectionResult)
def get_inspection_results(inspection_id: str) -> InspectionResult:
    inspection = _require_inspection(inspection_id)
    if inspection.result is None:
        raise HTTPException(
            status_code=400,
            detail="Results not available yet. Complete analysis first.",
        )
    return InspectionResult.model_validate(inspection.result)
