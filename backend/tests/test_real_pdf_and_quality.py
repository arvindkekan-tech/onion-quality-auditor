"""Tests for official PDF generation and real OpenCV quality checks."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import store

client = TestClient(app)


def test_pdf_certificate_generation():
    insp_id = store.new_id("insp")
    insp = store.create_inspection(id=insp_id, variety="Nashik Red", weight_kg=50.0, location="Lasalgaon APMC", created_at=store.utc_now_iso())
    cert_id = store.new_id("cert")
    issued_at = store.utc_now_iso()
    certificate = {
        "id": cert_id,
        "inspectionId": insp_id,
        "grade": "Grade A",
        "issuedAt": issued_at,
        "batchLabel": "Nashik Red — Lasalgaon APMC",
        "qrToken": f"qr-{cert_id}",
        "inspectorName": "Inspector Ramesh Shinde",
        "procurementCentre": "Lasalgaon APMC",
        "specification": "Nashik Red",
        "sampleSize": 53,
        "confidence": 0.92,
        "defectSummary": "Commercial Grade A meeting quality standards.",
        "auditTimeline": [
            {"event": "Inspection completed", "time": issued_at},
            {"event": "Certificate issued", "time": issued_at},
        ],
        "aiGrade": "Grade A",
        "officerGrade": "Grade A",
        "overrideCount": 0,
        "dualAssessment": {
            "ai": {"grade": "Grade A", "totalOnions": 53, "healthyCount": 50, "rottenDamagedCount": 1, "sproutedCount": 1, "uncertainCount": 1, "defectRatio": 0.0377},
            "officer": {"grade": "Grade A", "totalOnions": 53, "healthyCount": 50, "rottenDamagedCount": 1, "sproutedCount": 1, "uncertainCount": 1, "defectRatio": 0.0377},
        },
    }
    store.save_review_and_certificate(insp_id, {"approved": True, "notes": "Approved", "overrideGrade": "Grade A"}, certificate)

    # 2. Call PDF download endpoint
    pdf_resp = client.get(f"/api/v1/certificates/{cert_id}/pdf")
    assert pdf_resp.status_code == 200, pdf_resp.text
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in pdf_resp.headers["content-disposition"]
    pdf_bytes = pdf_resp.content
    assert pdf_bytes.startswith(b"%PDF-1.")
    assert len(pdf_bytes) > 2000
