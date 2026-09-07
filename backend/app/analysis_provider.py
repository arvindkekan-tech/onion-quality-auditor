"""Analysis provider boundary for demo and real ONIVIS model adapters."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import cv2
import httpx
import numpy as np

from app.core.config import settings
from app.grading import calculate_commercial_grade
from app.real_ml import OnionInferenceEngine, SizeEstimator
from app.storage import get_local_image_bytes, upload_image
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
    grade_explanation: str | None = None
    attention_required: bool = False
    attention_reason: str | None = None
    images_results: list[dict[str, Any]] | None = None
    attention_queue: list[dict[str, Any]] | None = None
    why_this_grade: dict[str, Any] | None = None
    standards_matrix: list[dict[str, Any]] | None = None


class AnalysisProvider(Protocol):
    def analyze(self, inspection: StoredInspection) -> NormalizedAnalysisResult:
        ...


class DemoFallbackProvider:
    """Explicit deterministic fallback for development/testing only."""

    def analyze(self, inspection: StoredInspection) -> NormalizedAnalysisResult:
        images_count = len(inspection.images) if inspection.images else 1
        per_img = 48 // images_count
        images_results = [
            {
                "imageId": img.id,
                "filename": img.filename,
                "url": img.url,
                "annotatedImageUrl": img.url,
                "totalOnions": per_img,
                "healthyCount": int(per_img * 0.87),
                "rottenDamagedCount": int(per_img * 0.06),
                "sproutedCount": int(per_img * 0.04),
                "uncertainCount": int(per_img * 0.03),
            }
            for img in (inspection.images or [])
        ]
        grade_res = calculate_commercial_grade(
            total_onions=48,
            healthy_count=46,
            rotten_damaged_count=1,
            sprouted_count=1,
            uncertain_count=0,
            average_confidence=0.91,
            images_results=images_results,
            average_diameter_mm=60.5,
        )
        return NormalizedAnalysisResult(
            grade=grade_res.grade,
            confidence=0.91,
            classification="grade_a",
            total_onions=48,
            defects=[
                {"label": "Sprouted", "count": 1, "category": "visual"},
                {"label": "Mechanical Damage", "count": 1, "category": "visual"},
                {"label": "Undersized", "count": 0, "category": "visual"},
                {"label": "Surface Discoloration", "count": 2, "category": "visual"},
                {"label": "External Rot", "count": 0, "category": "visual"},
                {"label": "Split / Cracked", "count": 0, "category": "visual"},
                {"label": "Oversized", "count": 0, "category": "visual"},
            ],
            summary="Demo fallback analysis; replace with the trained ONIVIS model.",
            model_name="ONIVIS Demo Fallback",
            analyzed_at=utc_now_iso(),
            healthy_count=46,
            rotten_damaged_count=1,
            sprouted_count=1,
            uncertain_count=0,
            grade_explanation=grade_res.explanation,
            attention_required=grade_res.attention_required,
            attention_reason=grade_res.attention_reason,
            images_results=images_results,
            attention_queue=grade_res.attention_queue,
            why_this_grade=grade_res.why_this_grade,
            standards_matrix=grade_res.standards_matrix,
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

    def _download_single_image_bytes(self, image: StoredImage) -> bytes:
        if not image.storage_path and not image.url:
            return np.zeros((240, 320, 3), dtype=np.uint8).tobytes()

        if image.storage_path:
            local_bytes = get_local_image_bytes(image.storage_path)
            if local_bytes:
                return local_bytes

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

        raise ValueError(f"Unable to fetch image bytes for image {image.id} from storage.")

    def _dominant_class(self, summary: dict[str, int]) -> str:
        ranked = [
            ("healthy", summary.get("healthy", 0)),
            ("rotten_damaged", summary.get("rotten_damaged", 0)),
            ("sprouted", summary.get("sprouted", 0)),
            ("uncertain", summary.get("uncertain", 0)),
        ]
        return max(ranked, key=lambda item: item[1])[0] if ranked else "uncertain"

    def analyze(self, inspection: StoredInspection) -> NormalizedAnalysisResult:
        target_images = inspection.images
        if not target_images:
            if getattr(self, "_engine", None) is not None:
                from app.store_types import StoredImage
                target_images = [
                    StoredImage(
                        id="dummy-img",
                        uploaded_at=utc_now_iso(),
                        filename="dummy.jpg",
                        content_type="image/jpeg",
                        storage_path="",
                        url=None,
                    )
                ]
            else:
                raise ValueError("No inspection image is available for real ML analysis.")

        if self._engine is None:
            raise RuntimeError("Real ML analysis is unavailable because the inference engine is not initialized.")

        total_healthy = 0
        total_rotten = 0
        total_sprouted = 0
        total_uncertain = 0
        total_onions = 0
        all_detections: list[dict[str, Any]] = []
        all_confidences: list[float] = []
        all_diameters: list[float] = []
        images_results: list[dict[str, Any]] = []

        global_onion_counter = 1

        for image_obj in target_images:
            img_bytes = self._download_single_image_bytes(image_obj)
            img_arr = np.frombuffer(img_bytes, dtype=np.uint8)
            cv_img = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
            if cv_img is None:
                cv_img = np.zeros((240, 320, 3), dtype=np.uint8)

            pred_result = self._engine.predict(cv_img)
            summary = pred_result.get("summary", {})
            img_healthy = int(summary.get("healthy", 0))
            img_rotten = int(summary.get("rotten_damaged", 0))
            img_sprouted = int(summary.get("sprouted", 0))
            img_uncertain = int(summary.get("uncertain", 0))
            img_total = int(pred_result.get("total_onions", 0))

            total_healthy += img_healthy
            total_rotten += img_rotten
            total_sprouted += img_sprouted
            total_uncertain += img_uncertain
            total_onions += img_total

            size_estimator = getattr(self, "_size_estimator", None)
            img_detections = pred_result.get("detections", [])
            if size_estimator is not None:
                size_estimator.estimate(
                    detections=img_detections,
                    image_width_px=pred_result.get("image_width", 0),
                    image_height_px=pred_result.get("image_height", 0),
                )

            annotated_image_bytes = pred_result.get("annotated_image")
            annotated_path = None
            annotated_url = None
            if annotated_image_bytes:
                annotation_id = f"annot-{inspection.id}-{image_obj.id}"
                safe_name = f"{inspection.id}-{image_obj.id}-annotated.jpg"
                try:
                    annotated_path, annotated_url = upload_image(
                        inspection.id,
                        annotation_id,
                        safe_name,
                        annotated_image_bytes,
                        "image/jpeg",
                    )
                except Exception:
                    pass

            for d in img_detections:
                d_copy = dict(d)
                d_copy["image_id"] = image_obj.id
                d_copy["onion_id"] = f"{image_obj.id}-onion-{d_copy.get('id', global_onion_counter)}"
                d_copy["display_label"] = global_onion_counter
                global_onion_counter += 1
                if d_copy.get("detection_confidence") is not None:
                    all_confidences.append(float(d_copy["detection_confidence"]))
                elif d_copy.get("classification_confidence") is not None:
                    all_confidences.append(float(d_copy["classification_confidence"]))
                if d_copy.get("estimated_diameter_mm"):
                    all_diameters.append(float(d_copy["estimated_diameter_mm"]))
                all_detections.append(d_copy)

            images_results.append({
                "imageId": image_obj.id,
                "filename": image_obj.filename,
                "url": image_obj.url,
                "annotatedImageUrl": annotated_url,
                "totalOnions": img_total,
                "healthyCount": img_healthy,
                "rottenDamagedCount": img_rotten,
                "sproutedCount": img_sprouted,
                "uncertainCount": img_uncertain,
            })

        average_confidence = float(sum(all_confidences) / len(all_confidences)) if all_confidences else 0.0

        defect_items = [
            {"label": "healthy", "count": total_healthy, "category": "classification"},
            {"label": "rotten_damaged", "count": total_rotten, "category": "classification"},
            {"label": "sprouted", "count": total_sprouted, "category": "classification"},
            {"label": "uncertain", "count": total_uncertain, "category": "classification"},
        ]

        overall_summary = {
            "healthy": total_healthy,
            "rotten_damaged": total_rotten,
            "sprouted": total_sprouted,
            "uncertain": total_uncertain,
        }
        dominant_class = self._dominant_class(overall_summary) if total_onions > 0 else "uncertain"

        avg_diam = round(sum(all_diameters) / len(all_diameters), 2) if all_diameters else None

        grade_result = calculate_commercial_grade(
            total_onions=total_onions,
            healthy_count=total_healthy,
            rotten_damaged_count=total_rotten,
            sprouted_count=total_sprouted,
            uncertain_count=total_uncertain,
            average_confidence=average_confidence,
            detections=all_detections,
            images_results=images_results,
            average_diameter_mm=avg_diam,
        )

        size_estimation = getattr(self, "_size_estimation", None)
        if size_estimation is None and all_diameters:
            size_estimation = {
                "average_diameter_mm": avg_diam,
                "minimum_diameter_mm": round(min(all_diameters), 2),
                "maximum_diameter_mm": round(max(all_diameters), 2),
                "sample_count": len(all_diameters),
                "calibration": {
                    "window_width_mm": settings.window_width_mm,
                    "window_height_mm": settings.window_height_mm,
                },
            }

        primary_annotated_url = getattr(self, "_annotated_image_url", None)
        primary_annotated_path = None
        if not primary_annotated_url and images_results:
            for ir in images_results:
                if ir.get("annotatedImageUrl"):
                    primary_annotated_url = ir["annotatedImageUrl"]
                    break

        if total_onions == 0:
            analysis_summary = "No onions detected. Please recapture with sufficient sample coverage."
        else:
            analysis_summary = (
                f"Detected {total_onions} onions across {len(images_results)} image(s): "
                f"healthy={total_healthy}, rotten_damaged={total_rotten}, sprouted={total_sprouted}, uncertain={total_uncertain}. "
                f"Commercial assessment: {grade_result.explanation}."
            )

        return NormalizedAnalysisResult(
            grade=grade_result.grade,
            confidence=round(average_confidence, 4),
            classification=dominant_class,
            total_onions=total_onions,
            defects=defect_items,
            summary=analysis_summary,
            model_name="YOLO Onion Detection + YOLO Classification",
            analyzed_at=utc_now_iso(),
            detections=all_detections,
            healthy_count=total_healthy,
            rotten_damaged_count=total_rotten,
            sprouted_count=total_sprouted,
            uncertain_count=total_uncertain,
            annotated_image_url=primary_annotated_url,
            annotated_image_path=primary_annotated_path,
            size_estimation=size_estimation,
            grade_explanation=grade_result.explanation,
            attention_required=grade_result.attention_required,
            attention_reason=grade_result.attention_reason,
            images_results=images_results,
            attention_queue=grade_result.attention_queue,
            why_this_grade=grade_result.why_this_grade,
            standards_matrix=grade_result.standards_matrix,
        )


def get_analysis_provider() -> AnalysisProvider:
    provider_name = (settings.analysis_provider or "demo").lower()
    if provider_name in {"real", "onivis_real", "yolo"}:
        return RealMLProvider()
    if provider_name == "demo":
        return DemoFallbackProvider()
    raise RuntimeError(f"Unsupported analysis provider: {settings.analysis_provider}")
