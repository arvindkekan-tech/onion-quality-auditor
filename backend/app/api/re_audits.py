"""Independent Quality Re-audit queue, officer review & public tracking handling."""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.analysis import (
    CompleteReAuditInput,
    ReAuditRequestDetail,
    ReAuditTrackingResponse,
    TrackReAuditInput,
    UpdateReAuditStatusInput,
)
from app import store

router = APIRouter(tags=["Re-Audit Queue"])


@router.post("/re-audit-requests/track", response_model=ReAuditTrackingResponse)
def track_re_audit(payload: TrackReAuditInput) -> ReAuditTrackingResponse:
    """Public login-free tracking endpoint verifying Request ID and Farmer Phone Number."""
    res = store.track_review_request(
        request_id=payload.requestId,
        phone_number=payload.phoneNumber,
    )
    if not res:
        raise HTTPException(
            status_code=404,
            detail="No matching re-audit request found for the provided Request ID and Phone Number.",
        )
    return ReAuditTrackingResponse.model_validate(res)


@router.get("/re-audit-requests", response_model=list[ReAuditRequestDetail])
def list_officer_re_audits(
    user: AuthenticatedUser = Depends(get_current_user),
) -> list[ReAuditRequestDetail]:
    """Retrieve all independent quality re-audit requests for certificates authorized by this officer."""
    reqs = store.list_officer_re_audit_requests(user.id)
    return [ReAuditRequestDetail.model_validate(r) for r in reqs]


@router.get("/re-audit-requests/{request_id}", response_model=ReAuditRequestDetail)
def get_officer_re_audit_detail(
    request_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ReAuditRequestDetail:
    """Retrieve specific re-audit request with strict user-isolation enforcement."""
    req = store.get_officer_re_audit_request(request_id, user.id)
    if not req:
        raise HTTPException(
            status_code=404,
            detail="Re-audit request not found or you are not authorized to view it.",
        )
    return ReAuditRequestDetail.model_validate(req)


@router.patch("/re-audit-requests/{request_id}", response_model=ReAuditRequestDetail)
def update_officer_re_audit(
    request_id: str,
    payload: UpdateReAuditStatusInput,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ReAuditRequestDetail:
    """Update status of a re-audit request (e.g. PENDING -> IN_REVIEW)."""
    updated = store.update_officer_re_audit_status(
        request_id=request_id,
        user_id=user.id,
        status=payload.status,
        notes=payload.notes,
    )
    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Re-audit request not found or you are not authorized to modify it.",
        )
    return ReAuditRequestDetail.model_validate(updated)


@router.post("/re-audit-requests/{request_id}/complete", response_model=ReAuditRequestDetail)
def complete_officer_re_audit(
    request_id: str,
    payload: CompleteReAuditInput,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ReAuditRequestDetail:
    """Complete officer re-audit recording evidence, finding, explanation, and final determination."""
    if not payload.explanation.strip():
        raise HTTPException(
            status_code=400,
            detail="Officer explanation is strictly required to complete the re-audit.",
        )
    if not payload.evidenceReviewed:
        raise HTTPException(
            status_code=400,
            detail="At least one reviewed evidence item must be documented.",
        )

    completed = store.complete_officer_re_audit(
        request_id=request_id,
        user_id=user.id,
        finding=payload.finding,
        explanation=payload.explanation,
        evidence_reviewed=payload.evidenceReviewed,
        re_audit_grade=payload.reAuditGrade,
        notes=payload.notes,
    )
    if not completed:
        raise HTTPException(
            status_code=404,
            detail="Re-audit request not found or you are not authorized to complete it.",
        )
    return ReAuditRequestDetail.model_validate(completed)
