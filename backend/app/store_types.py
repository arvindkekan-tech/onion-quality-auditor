"""Common types and dataclasses for inspection persistence."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

InspectionStatus = Literal["draft", "in_progress", "completed", "reviewed", "rejected"]
AnalysisStatus = Literal["pending", "processing", "completed", "failed"]


@dataclass
class StoredImage:
    id: str
    uploaded_at: str
    filename: str
    content_type: str
    storage_path: str
    url: str | None = None


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
    result: dict[str, Any] | None = None
    review: dict[str, Any] | None = None
    certificate: dict[str, Any] | None = None
