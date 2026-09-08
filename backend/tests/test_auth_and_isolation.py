"""Tests for authentication and user-scoped data isolation."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


from uuid import uuid4


def test_auth_signup_login_flow():
    email = f"inspector.{uuid4().hex[:8]}@apmc.gov.in"
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "SecurePassword123!",
            "name": "Inspector Ramesh Shinde",
            "role": "INSPECTOR",
        },
    )
    assert signup_res.status_code in (200, 201), signup_res.text
    signup_data = signup_res.json()
    assert "accessToken" in signup_data
    assert signup_data["user"]["email"] == email
    assert signup_data["user"]["name"] == "Inspector Ramesh Shinde"

    dup_res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "AnotherPassword",
            "name": "Inspector Ramesh Shinde",
        },
    )
    assert dup_res.status_code == 400

    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "SecurePassword123!",
        },
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["accessToken"]

    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email


def test_user_data_isolation():
    email_a = f"officer.a.{uuid4().hex[:8]}@apmc.gov.in"
    email_b = f"officer.b.{uuid4().hex[:8]}@apmc.gov.in"
    res_a = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email_a,
            "password": "PasswordA123!",
            "name": "Officer A",
        },
    )
    assert res_a.status_code in (200, 201), res_a.text
    token_a = res_a.json()["accessToken"]

    res_b = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email_b,
            "password": "PasswordB123!",
            "name": "Officer B",
        },
    )
    assert res_b.status_code in (200, 201), res_b.text
    token_b = res_b.json()["accessToken"]

    create_a = client.post(
        "/api/v1/inspections",
        json={"variety": "Nashik Red", "weightKg": 100.0, "location": "Lasalgaon Mandi A"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert create_a.status_code == 200
    insp_a_id = create_a.json()["id"]

    list_b = client.get(
        "/api/v1/inspections",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert list_b.status_code == 200
    b_ids = [item["id"] for item in list_b.json()]
    assert insp_a_id not in b_ids

    get_b = client.get(
        f"/api/v1/inspections/{insp_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_b.status_code in (403, 404)

    get_a = client.get(
        f"/api/v1/inspections/{insp_a_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert get_a.status_code == 200
    assert get_a.json()["id"] == insp_a_id


def test_password_reset_flow():
    forgot_res = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "inspector.test@apmc.gov.in"},
    )
    assert forgot_res.status_code == 200

    from app import store
    token_val = store.new_id("rst")
    from datetime import datetime, timezone, timedelta
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    store.create_reset_token("inspector.test@apmc.gov.in", token_val, expires_at)

    reset_res = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": token_val,
            "newPassword": "NewSecurePassword456!",
        },
    )
    assert reset_res.status_code == 200

    login_new = client.post(
        "/api/v1/auth/login",
        json={
            "email": "inspector.test@apmc.gov.in",
            "password": "NewSecurePassword456!",
        },
    )
    assert login_new.status_code == 200


def test_profile_update_and_flexible_cert_lookup():
    from uuid import uuid4
    email = f"officer.update.{uuid4().hex[:8]}@apmc.gov.in"
    res = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "Secret123!", "name": "Initial Officer"},
    )
    assert res.status_code in (200, 201)
    token = res.json()["accessToken"]

    patch_res = client.patch(
        "/api/v1/auth/me",
        json={"name": "Updated Officer Name"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Updated Officer Name"

    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Updated Officer Name"
