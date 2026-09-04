from dataclasses import dataclass
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app import storage, store
from app.main import app

client = TestClient(app)


@dataclass
class FakeResponse:
    data: Any


class FakeQuery:
    def __init__(self, client: "FakeSupabase", table: str) -> None:
        self.client = client
        self.table_name = table
        self.operation = "select"
        self.payload: Any = None
        self.filters: list[tuple[str, Any]] = []
        self.max_rows: int | None = None
        self.order_column: str | None = None
        self.order_desc = False

    def select(self, _columns: str) -> "FakeQuery":
        self.operation = "select"
        return self

    def insert(self, payload: dict[str, Any]) -> "FakeQuery":
        self.operation = "insert"
        self.payload = payload
        return self

    def upsert(self, payload: dict[str, Any]) -> "FakeQuery":
        self.operation = "upsert"
        self.payload = payload
        return self

    def update(self, payload: dict[str, Any]) -> "FakeQuery":
        self.operation = "update"
        self.payload = payload
        return self

    def delete(self) -> "FakeQuery":
        self.operation = "delete"
        return self

    def eq(self, column: str, value: Any) -> "FakeQuery":
        self.filters.append((column, value))
        return self

    def limit(self, count: int) -> "FakeQuery":
        self.max_rows = count
        return self

    def order(self, column: str, desc: bool = False) -> "FakeQuery":
        self.order_desc = desc
        self.order_column = column
        return self

    def execute(self) -> FakeResponse:
        rows = self.client.tables.setdefault(self.table_name, [])
        matches = [
            row
            for row in rows
            if all(row.get(column) == value for column, value in self.filters)
        ]

        if self.operation == "select":
            if self.order_column:
                matches.sort(
                    key=lambda row: row[self.order_column],
                    reverse=self.order_desc,
                )
            if self.max_rows is not None:
                matches = matches[: self.max_rows]
            return FakeResponse([dict(row) for row in matches])

        if self.operation == "insert":
            row = dict(self.payload)
            rows.append(row)
            return FakeResponse([dict(row)])

        if self.operation == "upsert":
            row = dict(self.payload)
            key = "inspection_id" if self.table_name in {"analysis_results", "reviews"} else "id"
            existing = next((item for item in rows if item.get(key) == row[key]), None)
            if existing is None:
                rows.append(row)
            else:
                existing.update(row)
            return FakeResponse([dict(row)])

        if self.operation == "update":
            for row in matches:
                row.update(self.payload)
            return FakeResponse([dict(row) for row in matches])

        if self.operation == "delete":
            self.client.tables[self.table_name] = [
                row for row in rows if row not in matches
            ]
            return FakeResponse([])

        raise AssertionError(f"Unsupported fake operation: {self.operation}")


class FakeStorageBucket:
    def __init__(self, client: "FakeSupabase") -> None:
        self.client = client

    def upload(self, path: str, content: bytes, _options: dict[str, str]) -> None:
        self.client.objects[path] = content

    def get_public_url(self, path: str) -> str:
        return f"https://storage.test/inspection-images/{path}"

    def remove(self, paths: list[str]) -> None:
        for path in paths:
            self.client.objects.pop(path, None)


class FakeStorage:
    def __init__(self, client: "FakeSupabase") -> None:
        self.client = client

    def from_(self, _bucket: str) -> FakeStorageBucket:
        return FakeStorageBucket(self.client)


class FakeSupabase:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {}
        self.objects: dict[str, bytes] = {}
        self.storage = FakeStorage(self)

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self, name)


@pytest.fixture(autouse=True)
def fake_supabase(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeSupabase()
    monkeypatch.setattr(store, "get_supabase_client", lambda: fake)
    monkeypatch.setattr(storage, "get_supabase_client", lambda: fake)


def _create_inspection() -> str:
    response = client.post(
        "/api/v1/inspections",
        json={
            "variety": "Nashik Red",
            "weightKg": 19.2,
            "location": "Lasalgaon APMC",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["variety"] == "Nashik Red"
    assert body["weightKg"] == 19.2
    assert body["location"] == "Lasalgaon APMC"
    assert body["status"] == "draft"
    assert body["id"]
    assert body["createdAt"]
    persisted = client.get(f"/api/v1/inspections/{body['id']}")
    assert persisted.status_code == 200
    assert persisted.json() == body
    return body["id"]


def _upload_image(inspection_id: str, filename: str = "sample.jpg", content_type: str = "image/jpeg") -> str:
    response = client.post(
        f"/api/v1/inspections/{inspection_id}/images",
        files={"file": (filename, b"fake-image-bytes", content_type)},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"]
    assert body["uploadedAt"]
    assert body["url"].startswith("https://storage.test/")
    return body["id"]


def test_health_and_root() -> None:
    root = client.get("/")
    assert root.status_code == 200
    assert root.json()["service"] == "onivis-api"

    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "service": "onivis-api"}


def test_full_inspection_flow() -> None:
    inspection_id = _create_inspection()
    image_id = _upload_image(inspection_id)

    quality = client.post(
        f"/api/v1/inspections/{inspection_id}/images/{image_id}/quality-check"
    )
    assert quality.status_code == 200, quality.text
    quality_body = quality.json()
    assert quality_body["imageId"] == image_id
    assert quality_body["passed"] is True
    assert quality_body["issues"] == []
    assert quality_body["score"] == 92
    assert len(quality_body["checks"]) == 4

    analyze = client.post(f"/api/v1/inspections/{inspection_id}/analyze")
    assert analyze.status_code == 200, analyze.text
    assert analyze.json()["status"] == "pending"
    assert analyze.json()["inspectionId"] == inspection_id

    statuses = []
    for _ in range(4):
        status = client.get(f"/api/v1/inspections/{inspection_id}/analysis-status")
        assert status.status_code == 200, status.text
        statuses.append(status.json()["status"])
    assert "processing" in statuses
    assert statuses[-1] == "completed"
    assert status.json()["progress"] == 100

    results = client.get(f"/api/v1/inspections/{inspection_id}/results")
    assert results.status_code == 200, results.text
    result_body = results.json()
    assert result_body["inspectionId"] == inspection_id
    assert result_body["grade"] == "Grade A"
    assert result_body["confidence"] == 0.91
    assert result_body["classification"] == "grade_a"
    assert result_body["totalOnions"] == 48
    assert result_body["modelName"] == "ONIVIS Vision Model"
    assert result_body["summary"]
    assert result_body["analyzedAt"]
    assert result_body["defects"][0]["label"] == "Sprouted"

    review = client.patch(
        f"/api/v1/inspections/{inspection_id}/review",
        json={"approved": True, "notes": "Looks good"},
    )
    assert review.status_code == 200, review.text
    review_body = review.json()
    assert review_body["inspectionId"] == inspection_id
    assert review_body["approved"] is True
    assert review_body["notes"] == "Looks good"
    certificate_id = review_body["certificateId"]
    assert certificate_id.startswith("cert-")

    certificate = client.get(f"/api/v1/certificates/{certificate_id}")
    assert certificate.status_code == 200, certificate.text
    cert_body = certificate.json()
    assert cert_body["id"] == certificate_id
    assert cert_body["inspectionId"] == inspection_id
    assert cert_body["grade"] == "Grade A"
    assert cert_body["issuedAt"]
    assert cert_body["batchLabel"] == "Nashik Red — Lasalgaon APMC"
    assert cert_body["qrToken"] == f"qr-{certificate_id}"
    assert cert_body["inspectorName"] == "Rajesh Patil"
    assert cert_body["procurementCentre"] == "Lasalgaon APMC"
    assert cert_body["specification"] == "Nashik Red"
    assert cert_body["sampleSize"] == 48
    assert cert_body["confidence"] == 0.91
    assert cert_body["defectSummary"] == "Looks good"

    verified = client.get(f"/api/v1/verify/{cert_body['qrToken']}")
    assert verified.status_code == 200, verified.text
    verify_body = verified.json()
    assert verify_body["valid"] is True
    assert verify_body["message"] == "Certificate is valid and has not been revoked."
    assert verify_body["certificate"]["id"] == certificate_id
    assert len(verify_body["auditTimeline"]) == 4


def test_analysis_status_uses_same_persisted_inspection_id() -> None:
    inspection_id = _create_inspection()
    image_id = _upload_image(inspection_id, filename="status-check.png", content_type="image/png")

    started = client.post(f"/api/v1/inspections/{inspection_id}/analyze")
    assert started.status_code == 200, started.text
    assert started.json()["inspectionId"] == inspection_id

    status = client.get(f"/api/v1/inspections/{inspection_id}/analysis-status")
    assert status.status_code == 200, status.text
    assert status.json()["inspectionId"] == inspection_id
    assert status.json()["status"] in {"pending", "processing", "completed"}


def test_inspection_history_is_newest_first_and_maps_analysis() -> None:
    older = store.create_inspection(
        id="insp-older",
        variety="Older Red",
        weight_kg=10,
        location="Yeola APMC",
        created_at="2026-09-04T10:00:00+00:00",
    )
    newer = store.create_inspection(
        id="insp-newer",
        variety="Newer Red",
        weight_kg=12,
        location="Lasalgaon APMC",
        created_at="2026-09-04T11:00:00+00:00",
    )
    store.save_analysis_result(
        older.id,
        {
            "inspectionId": older.id,
            "grade": "Grade A",
            "confidence": 0.91,
            "classification": "grade_a",
            "totalOnions": 48,
            "modelName": "ONIVIS Vision Model",
            "defects": [],
            "summary": "Ready",
            "analyzedAt": "2026-09-04T10:05:00+00:00",
        },
    )

    response = client.get("/api/v1/inspections")

    assert response.status_code == 200, response.text
    assert response.json() == [
        {
            "id": newer.id,
            "variety": "Newer Red",
            "location": "Lasalgaon APMC",
            "createdAt": newer.created_at,
            "status": "draft",
            "grade": None,
            "totalOnions": None,
            "imageId": None,
            "analysisStatus": None,
            "certificateId": None,
            "reviewSubmitted": False,
        },
        {
            "id": older.id,
            "variety": "Older Red",
            "location": "Yeola APMC",
            "createdAt": older.created_at,
            "status": "draft",
            "grade": "Grade A",
            "totalOnions": 48,
            "imageId": None,
            "analysisStatus": None,
            "certificateId": None,
            "reviewSubmitted": False,
        },
    ]


def test_inspection_history_exposes_resume_state() -> None:
    inspection_id = _create_inspection()
    image_id = _upload_image(inspection_id)

    initial = client.get("/api/v1/inspections").json()[0]
    assert initial["imageId"] == image_id
    assert initial["analysisStatus"] is None
    assert initial["certificateId"] is None
    assert initial["reviewSubmitted"] is False

    started = client.post(f"/api/v1/inspections/{inspection_id}/analyze")
    assert started.status_code == 200
    pending = client.get("/api/v1/inspections").json()[0]
    assert pending["analysisStatus"] == "pending"

    processing = client.get(f"/api/v1/inspections/{inspection_id}/analysis-status")
    assert processing.status_code == 200
    current = client.get("/api/v1/inspections").json()[0]
    assert current["analysisStatus"] == "processing"

    for _ in range(3):
        assert client.get(f"/api/v1/inspections/{inspection_id}/analysis-status").status_code == 200
    completed = client.get("/api/v1/inspections").json()[0]
    assert completed["analysisStatus"] == "completed"

    review = client.patch(
        f"/api/v1/inspections/{inspection_id}/review",
        json={"approved": True, "notes": "Ready"},
    )
    assert review.status_code == 200
    certificate_id = review.json()["certificateId"]
    reviewed = client.get("/api/v1/inspections").json()[0]
    assert reviewed["reviewSubmitted"] is True
    assert reviewed["certificateId"] == certificate_id


def test_png_upload_and_error_handling() -> None:
    inspection_id = _create_inspection()
    _upload_image(inspection_id, filename="sample.png", content_type="image/png")

    missing = client.get("/api/v1/inspections/does-not-exist")
    assert missing.status_code == 404
    assert missing.json()["message"] == "Inspection not found"

    bad_type = client.post(
        f"/api/v1/inspections/{inspection_id}/images",
        files={"file": ("notes.txt", b"not-an-image", "text/plain")},
    )
    assert bad_type.status_code == 400
    assert "JPEG or PNG" in bad_type.json()["message"]

    quality_missing_image = client.post(
        f"/api/v1/inspections/{inspection_id}/images/img-missing/quality-check"
    )
    assert quality_missing_image.status_code == 404

    results_too_soon = client.get(f"/api/v1/inspections/{inspection_id}/results")
    assert results_too_soon.status_code == 400

    invalid_create = client.post("/api/v1/inspections", json={"variety": ""})
    assert invalid_create.status_code == 400
    assert invalid_create.json()["code"] == "validation_error"


def test_certificate_and_verify_errors() -> None:
    missing = client.get("/api/v1/certificates/cert-missing")
    assert missing.status_code == 404
    assert missing.json()["message"] == "Certificate not found"

    invalid = client.get("/api/v1/verify/unknown-token")
    assert invalid.status_code == 200
    body = invalid.json()
    assert body["valid"] is False
    assert body["message"] == "Certificate not found or has been revoked."
    assert "certificate" not in body or body["certificate"] is None


def test_unversioned_prefix_matches_frontend_default_base_url() -> None:
    response = client.post(
        "/inspections",
        json={
            "variety": "Nashik Red",
            "weightKg": 12.0,
            "location": "Yeola APMC",
        },
    )
    assert response.status_code == 200
    assert response.json()["id"]


def test_cors_allows_frontend_origins() -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "https://onivis-frontend.onrender.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code in {200, 204}
    assert (
        response.headers.get("access-control-allow-origin")
        == "https://onivis-frontend.onrender.com"
    )
