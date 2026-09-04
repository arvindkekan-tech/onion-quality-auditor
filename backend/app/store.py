"""In-memory inspection state for the MVP. No database."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

InspectionStatus = Literal["draft", "in_progress", "completed", "reviewed"]
AnalysisStatus = Literal["pending", "processing", "completed", "failed"]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8]}"


@dataclass
class StoredImage:
    id: str
    uploaded_at: str
    filename: str
    content_type: str


@dataclass
class StoredInspection:
    id: str
    variety: str
    weight_kg: float
    location: str
    created_at: str
    status: InspectionStatus
    images: list[StoredImage] = field(default_factory=list)
    analysis_status: AnalysisStatus | None = None
    analysis_poll_count: int = 0
    result: dict | None = None
    review: dict | None = None
    certificate: dict | None = None


inspections: dict[str, StoredInspection] = {}
certificates: dict[str, dict] = {}
certificates_by_token: dict[str, str] = {}


def reset() -> None:
    inspections.clear()
    certificates.clear()
    certificates_by_token.clear()


def get_inspection(inspection_id: str) -> StoredInspection | None:
    return inspections.get(inspection_id)


def get_certificate(certificate_id: str) -> dict | None:
    return certificates.get(certificate_id)


def get_certificate_by_token(token: str) -> dict | None:
    certificate_id = certificates_by_token.get(token)
    if certificate_id is None:
        return None
    return certificates.get(certificate_id)


def store_certificate(certificate: dict) -> None:
    certificates[certificate["id"]] = certificate
    certificates_by_token[certificate["qrToken"]] = certificate["id"]
