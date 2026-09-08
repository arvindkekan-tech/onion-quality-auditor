import logging
import threading
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.api.inspections import _require_inspection
from app.analysis_provider import get_analysis_provider
from app.schemas.analysis import AnalysisStatusResponse, InspectionResult
from app import store

router = APIRouter(prefix="/inspections", tags=["Analysis"])
logger = logging.getLogger("onivis")
_analysis_lock = threading.Lock()


def _complete_analysis(inspection: store.StoredInspection) -> None:
    if not _analysis_lock.acquire(blocking=False):
        # Another worker or request is already running inference; do not duplicate
        return
    try:
        fresh_inspection = store.get_inspection(inspection.id)
        if fresh_inspection and fresh_inspection.analysis_status == "completed" and fresh_inspection.result is not None:
            return

        target = fresh_inspection or inspection
        normalized = get_analysis_provider().analyze(target)
        ai_assessment = {
            "grade": normalized.grade,
            "totalOnions": normalized.total_onions,
            "healthyCount": normalized.healthy_count,
            "rottenDamagedCount": normalized.rotten_damaged_count,
            "sproutedCount": normalized.sprouted_count,
            "uncertainCount": normalized.uncertain_count,
            "defectRatio": (
                round(((normalized.rotten_damaged_count or 0) + (normalized.sprouted_count or 0)) / (normalized.total_onions or 1), 4)
                if normalized.total_onions
                else 0.0
            ),
            "confidence": normalized.confidence,
            "explanation": getattr(normalized, "grade_explanation", None),
        }
        result = {
            "inspectionId": target.id,
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
            "imagesResults": getattr(normalized, "images_results", None),
            "aiAssessment": ai_assessment,
            "officerAssessment": dict(ai_assessment),
            "attentionQueue": getattr(normalized, "attention_queue", None),
            "whyThisGrade": getattr(normalized, "why_this_grade", None),
            "standardsMatrix": getattr(normalized, "standards_matrix", None),
        }
        store.save_analysis_result(target.id, result)
        store.update_inspection(
            target.id,
            {"analysis_status": "completed", "status": "completed"},
        )
        import gc
        gc.collect()
    except Exception as exc:
        logger.exception("[ANALYSIS] Analysis execution failed for %s: %s", inspection.id, exc)
        store.update_inspection(
            inspection.id,
            {"analysis_status": "failed", "status": "in_progress"},
        )
    finally:
        _analysis_lock.release()


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
        poll = inspection.analysis_poll_count
        if poll <= 1:
            progress = 35
            message = "Detecting onion bulbs with YOLOv8…"
        elif poll == 2:
            progress = 70
            message = "Classifying defects and quality grades…"
        elif poll == 3:
            progress = 85
            message = "Estimating physical dimensions and APMC compliance…"
        else:
            progress = min(95, 85 + (poll - 3) * 2)
            message = "Finalizing quality inspection report…"
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
