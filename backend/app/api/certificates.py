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


from fastapi import Request, Response
from app.pdf import generate_certificate_pdf


@router.get("/certificates/{certificate_id}/pdf")
def download_certificate_pdf(certificate_id: str, request: Request) -> Response:
    certificate = store.get_certificate(certificate_id)
    if certificate is None:
        raise HTTPException(status_code=404, detail="Certificate not found")
    origin = f"{request.url.scheme}://{request.url.netloc}"
    pdf_bytes = generate_certificate_pdf(certificate, origin=origin)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="ONIVIS_Certificate_{certificate_id}.pdf"',
            "Content-Type": "application/pdf",
        },
    )


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
