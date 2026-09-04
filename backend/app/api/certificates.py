from fastapi import APIRouter, HTTPException

from app.schemas.certificate import Certificate, VerificationResult
from app import store

router = APIRouter(tags=["Certificates"])


@router.get(
    "/certificates/{certificate_id}",
    response_model=Certificate,
    response_model_exclude_none=True,
)
def read_certificate(certificate_id: str) -> Certificate:
    certificate = store.get_certificate(certificate_id)
    if certificate is None:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return Certificate.model_validate(certificate)


@router.get(
    "/verify/{token}",
    response_model=VerificationResult,
    response_model_exclude_none=True,
)
def verify_certificate(token: str) -> VerificationResult:
    certificate = store.get_certificate_by_token(token)
    if certificate is None:
        return VerificationResult(
            valid=False,
            message="Certificate not found or has been revoked.",
        )
    return VerificationResult(
        valid=True,
        message="Certificate is valid and has not been revoked.",
        certificate=Certificate.model_validate(certificate),
        auditTimeline=certificate.get("auditTimeline"),
    )
