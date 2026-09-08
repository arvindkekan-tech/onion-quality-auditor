"""Tests for the Officer-Side Re-Audit Request Queue, Closed-Loop Workflow, and Public Tracking."""

from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_user(name: str) -> tuple[str, str]:
    email = f"{uuid4().hex[:8]}@apmc.gov.in"
    res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "SecurePassword123!",
            "name": name,
            "role": "INSPECTOR",
        },
    )
    assert res.status_code in (200, 201), res.text
    data = res.json()
    return data["user"]["id"], data["accessToken"]


def _create_inspection_and_cert(token: str) -> tuple[str, str]:
    # 1. Create inspection
    create_res = client.post(
        "/api/v1/inspections",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "variety": "Nashik Red",
            "weightKg": 25.0,
            "location": "Lasalgaon APMC",
        },
    )
    assert create_res.status_code in (200, 201), create_res.text
    insp_id = create_res.json()["id"]

    # 2. Upload image & quality check
    upload = client.post(
        f"/api/v1/inspections/{insp_id}/images",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("sample.jpg", b"fake-image-bytes", "image/jpeg")},
    )
    assert upload.status_code in (200, 201), upload.text
    img_id = upload.json()["id"]

    client.post(
        f"/api/v1/inspections/{insp_id}/images/{img_id}/quality-check",
        headers={"Authorization": f"Bearer {token}"},
    )

    # 3. Trigger analysis and poll until completed
    client.post(
        f"/api/v1/inspections/{insp_id}/analyze",
        headers={"Authorization": f"Bearer {token}"},
    )
    for _ in range(5):
        st = client.get(
            f"/api/v1/inspections/{insp_id}/analysis-status",
            headers={"Authorization": f"Bearer {token}"},
        )
        if st.json().get("status") == "completed":
            break

    client.get(
        f"/api/v1/inspections/{insp_id}/results",
        headers={"Authorization": f"Bearer {token}"},
    )

    # 4. Review and approve to generate certificate
    review_res = client.patch(
        f"/api/v1/inspections/{insp_id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "approved": True,
            "notes": "Verified for export testing",
        },
    )
    assert review_res.status_code == 200, review_res.text
    cert_id = review_res.json()["certificateId"]
    assert cert_id is not None
    return insp_id, cert_id


def test_public_re_audit_submission_and_human_readable_id():
    # User A creates certificate
    user_a_id, token_a = _create_user("Officer Ramesh")
    insp_a_id, cert_a_id = _create_inspection_and_cert(token_a)

    # Farmer submits re-audit request with required phone number
    req_res = client.post(
        f"/api/v1/inspections/{insp_a_id}/request-review",
        json={
            "farmerName": "Kisan Suresh Patil",
            "phoneNumber": "9876543210",
            "reasonCategory": "Bulb Size / Caliber Disagreement",
            "comments": "Requesting independent caliber check of tray bulbs",
        },
    )
    assert req_res.status_code == 200, req_res.text
    req_data = req_res.json()
    # Must generate persistent human-readable ID e.g. RA-2026-000001
    assert req_data["id"].startswith("RA-"), f"Expected RA- ID, got {req_data['id']}"
    assert req_data["farmerName"] == "Kisan Suresh Patil"
    assert req_data["status"] == "PENDING"
    req_id = req_data["id"]

    # User A logs in and retrieves re-audit queue
    queue_res = client.get(
        "/api/v1/re-audit-requests",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert len(queue) >= 1
    found = next((item for item in queue if item["id"] == req_id), None)
    assert found is not None
    assert found["farmerName"] == "Kisan Suresh Patil"
    assert found["reasonCategory"] == "Bulb Size / Caliber Disagreement"
    assert found["certificateId"] == cert_a_id
    assert found["status"] == "PENDING"


def test_re_audit_queue_strict_user_isolation():
    # User A setup
    _, token_a = _create_user("Officer A")
    insp_a, cert_a = _create_inspection_and_cert(token_a)

    # Farmer submits request on User A's inspection
    req_a_res = client.post(
        f"/api/v1/inspections/{insp_a}/request-review",
        json={
            "farmerName": "Farmer for A",
            "phoneNumber": "9111111111",
            "reasonCategory": "Grade / Defect Classification Discrepancy",
            "comments": "User A certificate dispute",
        },
    )
    assert req_a_res.status_code == 200
    req_a_id = req_a_res.json()["id"]

    # User B setup
    _, token_b = _create_user("Officer B")
    insp_b, cert_b = _create_inspection_and_cert(token_b)

    # 1. User B must NOT see User A's re-audit request in queue
    queue_b_res = client.get(
        "/api/v1/re-audit-requests",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert queue_b_res.status_code == 200
    queue_b = queue_b_res.json()
    assert all(item["id"] != req_a_id for item in queue_b), "User B must not see User A request in queue!"

    # 2. User B must NOT be able to access User A's request directly by ID
    direct_b_res = client.get(
        f"/api/v1/re-audit-requests/{req_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert direct_b_res.status_code == 404, "User B should get 404 when accessing User A's request!"

    # 3. User B must NOT be able to modify User A's request
    patch_b_res = client.patch(
        f"/api/v1/re-audit-requests/{req_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"status": "IN_REVIEW"},
    )
    assert patch_b_res.status_code == 404, "User B should get 404 when trying to update User A's request!"

    # 4. Now farmer submits request on User B's inspection
    req_b_res = client.post(
        f"/api/v1/inspections/{insp_b}/request-review",
        json={
            "farmerName": "Farmer for B",
            "phoneNumber": "9222222222",
            "reasonCategory": "Skin Curing & Moisture Re-test",
        },
    )
    assert req_b_res.status_code == 200
    req_b_id = req_b_res.json()["id"]

    # User B sees ONLY User B's request
    queue_b_updated = client.get(
        "/api/v1/re-audit-requests",
        headers={"Authorization": f"Bearer {token_b}"},
    ).json()
    user_b_req_ids = [item["id"] for item in queue_b_updated]
    assert req_b_id in user_b_req_ids
    assert req_a_id not in user_b_req_ids

    # User A sees ONLY User A's request
    queue_a_updated = client.get(
        "/api/v1/re-audit-requests",
        headers={"Authorization": f"Bearer {token_a}"},
    ).json()
    user_a_req_ids = [item["id"] for item in queue_a_updated]
    assert req_a_id in user_a_req_ids
    assert req_b_id not in user_a_req_ids


def test_public_tracking_and_officer_completion_workflow():
    _, token = _create_user("Officer Workflow")
    insp, cert_id = _create_inspection_and_cert(token)

    # 1. Farmer submits request with phone number
    req_res = client.post(
        f"/api/v1/inspections/{insp}/request-review",
        json={
            "farmerName": "Kisan Santosh",
            "phoneNumber": "9822123456",
            "reasonCategory": "Grade dispute",
            "comments": "Observed sound skin on all export lot bulbs",
        },
    )
    assert req_res.status_code == 200
    req_data = req_res.json()
    req_id = req_data["id"]
    assert req_id.startswith("RA-")

    # 2. Public tracking while PENDING:
    # Correct phone -> Success
    track_res = client.post(
        "/api/v1/re-audit-requests/track",
        json={"requestId": req_id, "phoneNumber": "9822123456"},
    )
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["status"] == "PENDING"
    assert track_data["farmerName"] == "Kisan Santosh"
    assert track_data["reasonCategory"] == "Grade dispute"
    assert track_data["comments"] == "Observed sound skin on all export lot bulbs"
    assert track_data["certificateId"] == cert_id

    # Wrong phone -> Rejected with 404
    track_wrong_phone = client.post(
        "/api/v1/re-audit-requests/track",
        json={"requestId": req_id, "phoneNumber": "9999999999"},
    )
    assert track_wrong_phone.status_code == 404

    # Wrong request ID -> Rejected with 404
    track_wrong_id = client.post(
        "/api/v1/re-audit-requests/track",
        json={"requestId": "RA-2026-999999", "phoneNumber": "9822123456"},
    )
    assert track_wrong_id.status_code == 404

    # 3. Officer starts re-audit (IN_REVIEW)
    start_res = client.patch(
        f"/api/v1/re-audit-requests/{req_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "IN_REVIEW"},
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "IN_REVIEW"

    # Farmer tracks while IN_REVIEW -> Status is IN_REVIEW, inReviewAt is recorded
    track_in_review = client.post(
        "/api/v1/re-audit-requests/track",
        json={"requestId": req_id, "phoneNumber": "9822123456"},
    )
    assert track_in_review.status_code == 200
    assert track_in_review.json()["status"] == "IN_REVIEW"
    assert track_in_review.json()["inReviewAt"] is not None

    # 4. Officer completes re-audit:
    # Validation: explanation must be provided
    fail_res = client.post(
        f"/api/v1/re-audit-requests/{req_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "finding": "Original assessment confirmed",
            "explanation": "   ",
            "evidenceReviewed": ["Original inspection image"],
        },
    )
    assert fail_res.status_code == 400

    # Valid completion
    complete_res = client.post(
        f"/api/v1/re-audit-requests/{req_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "finding": "Original assessment confirmed",
            "explanation": "Re-examined original high-res tray captures and AI detection logs. Confirmed 4% minor skin defect within allowable tolerances.",
            "evidenceReviewed": [
                "Original inspection image",
                "Annotated inspection image",
                "AI detection evidence",
                "Grading calculation",
            ],
            "reAuditGrade": "Grade A",
        },
    )
    assert complete_res.status_code == 200
    completed_data = complete_res.json()
    assert completed_data["status"] == "COMPLETED"
    assert completed_data["finding"] == "Original assessment confirmed"
    assert "Re-examined original" in completed_data["explanation"]
    assert len(completed_data["evidenceReviewed"]) == 4

    # 5. Farmer tracks after completion -> sees complete response!
    track_final = client.post(
        "/api/v1/re-audit-requests/track",
        json={"requestId": req_id, "phoneNumber": "9822123456"},
    )
    assert track_final.status_code == 200
    final_data = track_final.json()
    assert final_data["status"] == "COMPLETED"
    assert final_data["finding"] == "Original assessment confirmed"
    assert "Re-examined original" in final_data["explanation"]
    assert "AI detection evidence" in final_data["evidenceReviewed"]
    assert final_data["completedAt"] is not None
    assert final_data["officerName"] is not None
