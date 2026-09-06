import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import store
from app.analysis_provider import NormalizedAnalysisResult
from app.schemas.analysis import OnionDecisionInput

client = TestClient(app)


class MockMultiImageEngine:
    def __init__(self):
        self.call_count = 0

    def predict(self, image):
        self.call_count += 1
        return {
            "total_onions": 10,
            "summary": {
                "healthy": 9,
                "rotten_damaged": 1,
                "sprouted": 0,
                "uncertain": 0,
            },
            "detections": [
                {
                    "id": i + 1,
                    "class_name": "healthy" if i < 9 else "rotten_damaged",
                    "final_class": "healthy" if i < 9 else "rotten_damaged",
                    "classification_confidence": 0.92,
                    "estimated_diameter_mm": 55.0,
                    "bbox": [10, 10, 50, 50],
                }
                for i in range(10)
            ],
            "annotated_image": b"fake-annotated-jpeg",
            "image_width": 640,
            "image_height": 480,
        }


def test_multi_image_aggregation_and_overrides(monkeypatch):
    import app.api.analysis as analysis_api
    from app import analysis_provider

    mock_engine = MockMultiImageEngine()
    provider = analysis_provider.RealMLProvider.__new__(analysis_provider.RealMLProvider)
    provider._engine = mock_engine
    monkeypatch.setattr(analysis_provider, "get_analysis_provider", lambda: provider)
    monkeypatch.setattr(analysis_api, "get_analysis_provider", lambda: provider)

    # 1. Create inspection
    resp = client.post(
        "/inspections",
        json={"variety": "Nashik Red", "weightKg": 50.0, "location": "Lasalgaon APMC"},
    )
    assert resp.status_code == 200
    inspection_id = resp.json()["id"]

    # 2. Upload 3 images to the same inspection
    image_ids = []
    for i in range(3):
        upload_resp = client.post(
            f"/inspections/{inspection_id}/images",
            files={"file": (f"tray_{i+1}.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg")},
        )
        assert upload_resp.status_code == 200
        image_ids.append(upload_resp.json()["id"])

    assert len(image_ids) == 3

    # 3. Trigger analysis and poll until completion
    client.post(f"/inspections/{inspection_id}/analyze")
    for _ in range(5):
        poll = client.get(f"/inspections/{inspection_id}/analysis-status").json()
        if poll["status"] == "completed":
            break

    # 4. Fetch results
    results = client.get(f"/inspections/{inspection_id}/results").json()
    assert results["totalOnions"] == 30  # 10 * 3
    assert results["healthyCount"] == 27  # 9 * 3
    assert results["rottenDamagedCount"] == 3  # 1 * 3
    assert results["grade"] == "URS"  # 3/30 = 10% defects -> URS (<=15% threshold)
    assert len(results["imagesResults"]) == 3
    assert len(results["detections"]) == 30

    # Verify each detection has an image_id and unique onion_id
    for d in results["detections"]:
        assert "image_id" in d
        assert "onion_id" in d
        assert d["image_id"] in image_ids

    # 5. Test recalculation preview: Override 2 rotten onions to healthy
    overridden_items = [
        {"onionId": results["detections"][9]["onion_id"], "aiClass": "rotten_damaged", "officerClass": "healthy"},
        {"onionId": results["detections"][19]["onion_id"], "aiClass": "rotten_damaged", "officerClass": "healthy"},
    ]
    recalc_resp = client.post(
        f"/inspections/{inspection_id}/recalculate",
        json={"onionDecisions": overridden_items},
    )
    assert recalc_resp.status_code == 200
    recalc_data = recalc_resp.json()
    assert recalc_data["healthyCount"] == 29
    assert recalc_data["rottenDamagedCount"] == 1
    # 1/30 = 3.3% defects -> Grade A!
    assert recalc_data["grade"] == "Grade A"
    assert recalc_data["overrideCount"] == 2

    # 6. Submit review with approval & overrides
    review_resp = client.patch(
        f"/inspections/{inspection_id}/review",
        json={
            "approved": True,
            "notes": "Inspector corrected two misclassified shadows.",
            "onionDecisions": overridden_items,
        },
    )
    assert review_resp.status_code == 200
    review_data = review_resp.json()
    assert review_data["approved"] is True
    assert review_data["finalGrade"] == "Grade A"
    assert review_data["overrideCount"] == 2
    cert_id = review_data["certificateId"]
    assert cert_id is not None

    # 7. Verify Certificate has Officer Final Grade and dual assessment
    cert_resp = client.get(f"/certificates/{cert_id}")
    assert cert_resp.status_code == 200
    cert = cert_resp.json()
    assert cert["grade"] == "Grade A"
    assert cert["officerGrade"] == "Grade A"
    assert cert["aiGrade"] == "URS"
    assert cert["sampleSize"] == 30
    assert cert["overrideCount"] == 2
    assert "dualAssessment" in cert
    assert cert["dualAssessment"]["officer"]["grade"] == "Grade A"
    assert cert["dualAssessment"]["ai"]["grade"] == "URS"

    # 8. Verify audit decisions endpoint
    decisions_resp = client.get(f"/inspections/{inspection_id}/decisions")
    assert decisions_resp.status_code == 200
    decisions = decisions_resp.json()
    assert len(decisions) == 2
    assert decisions[0]["officerClass"] == "healthy"
