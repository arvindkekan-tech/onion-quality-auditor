from __future__ import annotations

from types import SimpleNamespace

from app.analysis_provider import RealMLProvider, get_analysis_provider
from app.store import StoredInspection


class FakeEngine:
    def predict(self, image):
        return {
            "total_onions": 3,
            "summary": {"healthy": 2, "rotten_damaged": 1, "sprouted": 0, "uncertain": 0},
            "detections": [
                {
                    "id": 1,
                    "bbox": [10, 20, 80, 90],
                    "detection_confidence": 0.93,
                    "predicted_class": "healthy",
                    "final_class": "healthy",
                    "classification_confidence": 0.9,
                    "probabilities": {"healthy": 0.88, "rotten_damaged": 0.09, "sprouted": 0.03, "uncertain": 0.0},
                    "estimated_diameter_mm": 42.5,
                },
                {
                    "id": 2,
                    "bbox": [110, 40, 170, 100],
                    "detection_confidence": 0.91,
                    "predicted_class": "rotten_damaged",
                    "final_class": "rotten_damaged",
                    "classification_confidence": 0.84,
                    "probabilities": {"healthy": 0.12, "rotten_damaged": 0.81, "sprouted": 0.03, "uncertain": 0.04},
                    "estimated_diameter_mm": 46.2,
                },
                {
                    "id": 3,
                    "bbox": [210, 60, 260, 130],
                    "detection_confidence": 0.88,
                    "predicted_class": "healthy",
                    "final_class": "healthy",
                    "classification_confidence": 0.78,
                    "probabilities": {"healthy": 0.82, "rotten_damaged": 0.05, "sprouted": 0.11, "uncertain": 0.02},
                    "estimated_diameter_mm": 39.7,
                },
            ],
            "annotated_image": b"fake-annotated-bytes",
            "image_width": 320,
            "image_height": 240,
        }


def test_real_provider_normalizes_real_ml_result(monkeypatch):
    provider = RealMLProvider.__new__(RealMLProvider)
    provider._engine = FakeEngine()
    provider._annotated_image_url = "https://storage.test/annotated/result.jpg"
    provider._size_estimation = {"average_diameter_mm": 42.8, "status": "estimated"}

    inspection = StoredInspection(
        id="insp-real",
        variety="Nashik Red",
        weight_kg=20.0,
        location="Lasalgaon APMC",
        created_at="2026-09-06T00:00:00+00:00",
        status="in_progress",
        images=[],
    )

    result = provider.analyze(inspection)

    assert result.total_onions == 3
    assert result.grade == "Unrated"
    assert result.confidence > 0
    assert result.classification == "healthy"
    assert result.defects[0]["label"] == "healthy"
    assert result.detections is not None and len(result.detections) == 3
    assert result.detections[0]["bbox"] == [10, 20, 80, 90]
    assert result.size_estimation == {"average_diameter_mm": 42.8, "status": "estimated"}
    assert result.model_name.startswith("YOLO")


def test_real_provider_selection_uses_real_when_enabled(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.analysis_provider", "real")

    provider = get_analysis_provider()

    assert isinstance(provider, RealMLProvider)
