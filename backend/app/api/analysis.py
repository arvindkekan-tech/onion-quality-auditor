from fastapi import APIRouter, HTTPException

from app.api.inspections import _require_inspection
from app.schemas.analysis import AnalysisStatusResponse, InspectionResult
from app.store import StoredInspection, utc_now_iso

router = APIRouter(prefix="/inspections", tags=["Analysis"])

MOCK_RESULT_TEMPLATE = {
    "grade": "Grade A",
    "confidence": 0.91,
    "classification": "grade_a",
    "totalOnions": 48,
    "modelName": "ONIVIS Vision Model",
    "defects": [
        {"label": "Sprouted", "count": 2, "category": "visual"},
        {"label": "Mechanical Damage", "count": 3, "category": "visual"},
        {"label": "Undersized", "count": 1, "category": "visual"},
        {"label": "Surface Discoloration", "count": 4, "category": "visual"},
        {"label": "External Rot", "count": 0, "category": "visual"},
        {"label": "Split / Cracked", "count": 1, "category": "visual"},
        {"label": "Oversized", "count": 0, "category": "visual"},
    ],
    "summary": (
        "Batch meets Grade A procurement thresholds. "
        "Minor visible defects within tolerance."
    ),
}


def _complete_analysis(inspection: StoredInspection) -> None:
    inspection.analysis_status = "completed"
    inspection.status = "completed"
    inspection.result = {
        "inspectionId": inspection.id,
        **MOCK_RESULT_TEMPLATE,
        "analyzedAt": utc_now_iso(),
    }


def _status_payload(inspection: StoredInspection) -> AnalysisStatusResponse:
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

    inspection.analysis_status = "pending"
    inspection.analysis_poll_count = 0
    inspection.result = None
    return _status_payload(inspection)


@router.get("/{inspection_id}/analysis-status", response_model=AnalysisStatusResponse)
def get_analysis_status(inspection_id: str) -> AnalysisStatusResponse:
    inspection = _require_inspection(inspection_id)

    if inspection.analysis_status in {"pending", "processing"}:
        inspection.analysis_poll_count += 1
        if inspection.analysis_poll_count < 4:
            inspection.analysis_status = "processing"
        else:
            _complete_analysis(inspection)

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
