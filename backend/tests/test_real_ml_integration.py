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
    assert result.grade == "Rejected"
    assert "Rejected" in result.grade_explanation
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


def test_commercial_grading_thresholds():
    from app.grading import calculate_commercial_grade

    # Zero detection
    g_zero = calculate_commercial_grade(
        total_onions=0, healthy_count=0, rotten_damaged_count=0,
        sprouted_count=0, uncertain_count=0, average_confidence=0.0
    )
    assert g_zero.grade == "Unrated"
    assert g_zero.attention_required is True

    # 2 defects out of 53 = 3.77% <= 5% -> Grade A
    g_a = calculate_commercial_grade(
        total_onions=53, healthy_count=50, rotten_damaged_count=1,
        sprouted_count=1, uncertain_count=1, average_confidence=0.89
    )
    assert g_a.grade == "Grade A"
    assert "Grade A" in g_a.explanation
    assert g_a.defect_ratio == 0.0377

    # 1 defect out of 10 = 10% -> URS
    g_urs = calculate_commercial_grade(
        total_onions=10, healthy_count=9, rotten_damaged_count=1,
        sprouted_count=0, uncertain_count=0, average_confidence=0.85
    )
    assert g_urs.grade == "URS"
    assert "URS" in g_urs.explanation

    # 2 defects out of 10 = 20% -> Rejected
    g_rej = calculate_commercial_grade(
        total_onions=10, healthy_count=8, rotten_damaged_count=1,
        sprouted_count=1, uncertain_count=0, average_confidence=0.80
    )
    assert g_rej.grade == "Rejected"
    assert "Rejected" in g_rej.explanation


def test_zero_detection_summary_and_grade():
    class ZeroEngine:
        def predict(self, _img):
            return {
                "total_onions": 0,
                "summary": {"healthy": 0, "rotten_damaged": 0, "sprouted": 0, "uncertain": 0},
                "detections": [],
                "annotated_image": b"",
                "image_width": 320,
                "image_height": 240,
            }

    provider = RealMLProvider.__new__(RealMLProvider)
    provider._engine = ZeroEngine()
    provider._size_estimation = None
    provider._annotated_image_url = None

    inspection = StoredInspection(
        id="insp-zero",
        variety="Nashik Red",
        weight_kg=10.0,
        location="Lasalgaon APMC",
        created_at="2026-09-06T00:00:00+00:00",
        status="in_progress",
        images=[],
    )

    result = provider.analyze(inspection)
    assert result.total_onions == 0
    assert result.grade == "Unrated"
    assert "No onions detected" in result.summary
    assert result.attention_required is True


def test_local_store_sqlite_fallback(tmp_path, monkeypatch):
    from app import local_store

    test_db = tmp_path / "test_onivis.db"
    monkeypatch.setattr(local_store, "DB_PATH", test_db)

    insp = local_store.create_inspection(
        id="test-local-1",
        variety="Nashik Red",
        weight_kg=15.0,
        location="Lasalgaon",
        created_at="2026-09-06T01:00:00Z",
    )
    assert insp.id == "test-local-1"

    fetched = local_store.get_inspection("test-local-1")
    assert fetched is not None
    assert fetched.variety == "Nashik Red"

    # Save analysis result
    local_store.save_analysis_result(
        "test-local-1",
        {
            "grade": "Grade A",
            "confidence": 0.92,
            "classification": "healthy",
            "totalOnions": 50,
            "modelName": "YOLO",
            "defects": [],
            "summary": "Sample summary",
            "analyzedAt": "2026-09-06T01:05:00Z",
            "healthyCount": 48,
            "rottenDamagedCount": 1,
            "sproutedCount": 1,
            "uncertainCount": 0,
            "annotatedImageUrl": "http://localhost:8000/uploads/annot.jpg",
            "annotatedImagePath": "annot.jpg",
            "sizeEstimation": {"average_diameter_mm": 45.0},
            "detections": [{"id": 1, "final_class": "healthy"}],
            "gradeExplanation": "Grade A — defect ratio 4.0%",
            "attentionRequired": False,
            "attentionReason": None,
        },
    )

    fetched_with_res = local_store.get_inspection("test-local-1")
    assert fetched_with_res.result["grade"] == "Grade A"
    assert fetched_with_res.result["totalOnions"] == 50
    assert fetched_with_res.result["detections"][0]["final_class"] == "healthy"

    # Rejection flow in local store
    local_store.save_review_rejection("test-local-1", {"notes": "Rejected test"})
    rejected_insp = local_store.get_inspection("test-local-1")
    assert rejected_insp.status == "rejected"
    assert rejected_insp.review["approved"] is False

    # Delete
    local_store.delete_inspection("test-local-1")
    assert local_store.get_inspection("test-local-1") is None
