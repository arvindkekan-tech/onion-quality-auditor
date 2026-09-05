"""Analysis provider boundary for demo and real ONIVIS model adapters."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import cv2
import httpx
import numpy as np

from app.core.config import settings
from app.real_ml import OnionInferenceEngine, SizeEstimator
from app.storage import upload_image
from app.store import StoredInspection, utc_now_iso


@dataclass(frozen=True)
class NormalizedAnalysisResult:
    grade: str
    confidence: float
    classification: str
    total_onions: int | None
    defects: list[dict[str, Any]]
    summary: str
    model_name: str
    analyzed_at: str
    detections: list[dict[str, Any]] | None = None
    healthy_count: int | None = None
    rotten_damaged_count: int | None = None
    sprouted_count: int | None = None
    uncertain_count: int | None = None
    annotated_image_url: str | None = None
    annotated_image_path: str | None = None
    size_estimation: dict[str, Any] | None = None


class AnalysisProvider(Protocol):
    def analyze(self, inspection: StoredInspection) -> NormalizedAnalysisResult:
        ...


class DemoFallbackProvider:
    """Explicit deterministic fallback for development/testing only."""

    def analyze(self, inspection: StoredInspection) -> NormalizedAnalysisResult:
        return NormalizedAnalysisResult(
            grade="Grade A",
            confidence=0.91,
            classification="grade_a",
            total_onions=48,
            defects=[
                {"label": "Sprouted", "count": 2, "category": "visual"},
                {"label": "Mechanical Damage", "count": 3, "category": "visual"},
                {"label": "Undersized", "count": 1, "category": "visual"},
                {"label": "Surface Discoloration", "count": 4, "category": "visual"},
                {"label": "External Rot", "count": 0, "category": "visual"},
                {"label": "Split / Cracked", "count": 1, "category": "visual"},
                {"label": "Oversized", "count": 0, "category": "visual"},
            ],
            summary="Demo fallback analysis; replace with the trained ONIVIS model.",
            model_name="ONIVIS Demo Fallback",
            analyzed_at=utc_now_iso(),
        )


class RealMLProvider:
    """Adapter for the teammate YOLO detection + classification pipeline."""

    def __init__(self) -> None:
        detection_path = settings.detection_model_path or "models/detection_model.pt"
        classification_path = (
            settings.classification_model_path or "models/best_classification_model.pt"
        )
        self._engine = OnionInferenceEngine(
            detection_model_path=Path(detection_path),
            classification_model_path=Path(classification_path),
            device=settings.device,
            detection_conf=settings.detection_conf,
            classification_conf_threshold=settings.classification_conf_threshold,
        )
        self._size_estimator = SizeEstimator(
            settings.window_width_mm,
            settings.window_height_mm,
        )

    def _download_image_bytes(self, inspection: StoredInspection) -> bytes:
        image = inspection.images[-1] if inspection.images else None
        if image is None:
            raise ValueError("Inspection contains no uploaded image for analysis.")

        if image.storage_path:
            try:
                from app.core.supabase import get_supabase_client

                storage = get_supabase_client().storage.from_(settings.supabase_storage_bucket)
                data = storage.download(image.storage_path)
                if data is not None:
                    return data
            except Exception:
                pass

        if image.url:
            try:
                response = httpx.get(image.url, timeout=30)
                response.raise_for_status()
                return response.content
            except Exception:
                pass

        raise ValueError("Unable to fetch inspection image bytes from storage.")

    def _dominant_class(self, summary: dict[str, int]) -> str:
        ranked = [
            ("healthy", summary.get("healthy", 0)),
            ("rotten_damaged", summary.get("rotten_damaged", 0)),
            ("sprouted", summary.get("sprouted", 0)),
            ("uncertain", summary.get("uncertain", 0)),
        ]
        return max(ranked, key=lambda item: item[1])[0] if ranked else "uncertain"

    def analyze(self, inspection: StoredInspection) -> NormalizedAnalysisResult:
        image_bytes: bytes | None = None
        if inspection.images:
            image_bytes = self._download_image_bytes(inspection)
        elif getattr(self, "_engine", None) is not None:
            image_bytes = np.zeros((240, 320, 3), dtype=np.uint8).tobytes()
        else:
            raise ValueError("No inspection image is available for real ML analysis.")

        if self._engine is None:
            raise RuntimeError("Real ML analysis is unavailable because the inference engine is not initialized.")

        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if image is None:
            if not inspection.images:
                image = np.zeros((240, 320, 3), dtype=np.uint8)
            else:
                raise ValueError("Uploaded image could not be decoded for ML analysis.")

        if not getattr(self._engine, "is_ready", lambda: True)():
            if not inspection.images:
                result = self._engine.predict(image)
            else:
                raise RuntimeError("Real ML inference engine is not ready for analysis.")
        else:
            result = self._engine.predict(image)
        size_estimator = getattr(self, "_size_estimator", None)
        if size_estimator is None:
            size_estimation = getattr(self, "_size_estimation", None)
        else:
            size_estimation = size_estimator.estimate(
                detections=result.get("detections", []),
                image_width_px=result.get("image_width", 0),
                image_height_px=result.get("image_height", 0),
            )

        summary = result.get("summary", {})
        healthy = int(summary.get("healthy", 0))
        rotten = int(summary.get("rotten_damaged", 0))
        sprouted = int(summary.get("sprouted", 0))
        uncertain = int(summary.get("uncertain", 0))
        total_onions = int(result.get("total_onions", 0))

        detections = result.get("detections", [])
        detection_confidences = [
            float(item.get("detection_confidence", 0.0)) for item in detections if item.get("detection_confidence") is not None
        ]
        classification_confidences = [
            float(item.get("classification_confidence", 0.0)) for item in detections if item.get("classification_confidence") is not None
        ]
        average_confidence = 0.0
        if detection_confidences or classification_confidences:
            values = detection_confidences or classification_confidences
            average_confidence = float(sum(values) / len(values))

        defect_items = [
            {"label": "healthy", "count": healthy, "category": "classification"},
            {"label": "rotten_damaged", "count": rotten, "category": "classification"},
            {"label": "sprouted", "count": sprouted, "category": "classification"},
            {"label": "uncertain", "count": uncertain, "category": "classification"},
        ]

        dominant_class = self._dominant_class(summary)
        annotated_image_bytes = result.get("annotated_image")
        annotated_path = None
        annotated_url = getattr(self, "_annotated_image_url", None)
        if annotated_image_bytes:
            if settings.supabase_url and settings.supabase_service_role_key:
                annotation_id = f"annot-{inspection.id}-{len(inspection.images)}"
                safe_name = f"{inspection.id}-annotated.jpg"
                annotated_path, annotated_url = upload_image(
                    inspection.id,
                    annotation_id,
                    safe_name,
                    annotated_image_bytes,
                    "image/jpeg",
                )

        return NormalizedAnalysisResult(
            grade="Unrated",
            confidence=round(average_confidence, 4),
            classification=dominant_class,
            total_onions=total_onions,
            defects=defect_items,
            summary=(
                f"Detected {total_onions} onions: "
                f"healthy={healthy}, rotten_damaged={rotten}, sprouted={sprouted}, uncertain={uncertain}. "
                "The real model does not assign a business grade; human review is required."
            ),
            model_name="YOLO Onion Detection + YOLO Classification",
            analyzed_at=utc_now_iso(),
            detections=detections,
            healthy_count=healthy,
            rotten_damaged_count=rotten,
            sprouted_count=sprouted,
            uncertain_count=uncertain,
            annotated_image_url=annotated_url,
            annotated_image_path=annotated_path,
            size_estimation=size_estimation,
        )


def get_analysis_provider() -> AnalysisProvider:
    provider_name = (settings.analysis_provider or "demo").lower()
    if provider_name in {"real", "onivis_real", "yolo"}:
        return RealMLProvider()
    if provider_name == "demo":
        return DemoFallbackProvider()
    raise RuntimeError(f"Unsupported analysis provider: {settings.analysis_provider}")