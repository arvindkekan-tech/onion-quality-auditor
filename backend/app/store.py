"""Persistence for inspection workflow state with Supabase and SQLite fallback."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from app.core.config import settings
from app.core.supabase import get_supabase_client
from app import local_store
from app.store_types import (
    AnalysisStatus,
    InspectionStatus,
    StoredImage,
    StoredInspection,
)


class PersistenceError(RuntimeError):
    """Raised when persistence cannot complete an operation."""


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8]}"


def _is_supabase_active() -> bool:
    try:
        client = get_supabase_client()
        return client is not None
    except Exception:
        return False


def _client():
    return get_supabase_client()


def _first(response: Any) -> dict[str, Any] | None:
    data = response.data
    if isinstance(data, list):
        return data[0] if data else None
    return data


def _execute(operation: Any) -> Any:
    try:
        return operation.execute()
    except Exception as exc:
        raise PersistenceError("Persistence operation failed") from exc


def _image_from_row(row: dict[str, Any]) -> StoredImage:
    return StoredImage(
        id=row["id"],
        uploaded_at=row["uploaded_at"],
        filename=row["filename"],
        content_type=row["content_type"],
        storage_path=row["storage_path"],
        url=row.get("url"),
    )


def _inspection_from_row(row: dict[str, Any]) -> StoredInspection:
    inspection_id = row["id"]
    images_response = _execute(
        _client()
        .table("inspection_images")
        .select("*")
        .eq("inspection_id", inspection_id)
        .order("uploaded_at")
    )
    result_response = _execute(
        _client()
        .table("analysis_results")
        .select("*")
        .eq("inspection_id", inspection_id)
        .limit(1)
    )
    review_response = _execute(
        _client()
        .table("reviews")
        .select("*")
        .eq("inspection_id", inspection_id)
        .limit(1)
    )
    certificate_response = _execute(
        _client()
        .table("certificates")
        .select("*")
        .eq("inspection_id", inspection_id)
        .limit(1)
    )
    result_row = _first(result_response)
    result = None
    if result_row:
        result = {
            "inspectionId": result_row["inspection_id"],
            "grade": result_row["grade"],
            "confidence": result_row["confidence"],
            "classification": result_row.get("classification"),
            "totalOnions": result_row.get("total_onions"),
            "modelName": result_row.get("model_name"),
            "defects": result_row["defects"],
            "summary": result_row["summary"],
            "analyzedAt": result_row["analyzed_at"],
            "healthyCount": result_row.get("healthy_count"),
            "rottenDamagedCount": result_row.get("rotten_damaged_count"),
            "sproutedCount": result_row.get("sprouted_count"),
            "uncertainCount": result_row.get("uncertain_count"),
            "annotatedImageUrl": result_row.get("annotated_image_url"),
            "annotatedImagePath": result_row.get("annotated_image_path"),
            "sizeEstimation": result_row.get("size_estimation"),
            "detections": result_row.get("detections"),
            "gradeExplanation": result_row.get("grade_explanation"),
            "attentionRequired": bool(result_row.get("attention_required", False)),
            "attentionReason": result_row.get("attention_reason"),
            "imagesResults": result_row.get("images_results"),
            "aiAssessment": result_row.get("ai_assessment"),
            "officerAssessment": result_row.get("officer_assessment"),
        }
    review_row = _first(review_response)
    review = None
    if review_row:
        review = {
            "certificateId": review_row.get("certificate_id"),
            "approved": review_row["approved"],
            "notes": review_row.get("notes"),
            "overrideGrade": review_row.get("override_grade"),
        }
    certificate_row = _first(certificate_response)
    certificate = _certificate_from_row(certificate_row) if certificate_row else None
    return StoredInspection(
        id=inspection_id,
        variety=row["variety"],
        weight_kg=float(row["weight_kg"]),
        location=row["location"],
        created_at=row["created_at"],
        status=row["status"],
        images=[_image_from_row(item) for item in images_response.data or []],
        analysis_status=row.get("analysis_status"),
        analysis_poll_count=row.get("analysis_poll_count", 0),
        result=result,
        review=review,
        certificate=certificate,
        user_id=row.get("user_id"),
    )


def _get_inspection_row(inspection_id: str) -> dict[str, Any] | None:
    response = _execute(
        _client()
        .table("inspections")
        .select("*")
        .eq("id", inspection_id)
        .limit(1)
    )
    return _first(response)


def create_inspection(
    *,
    id: str,
    variety: str,
    weight_kg: float,
    location: str,
    created_at: str,
    user_id: str | None = None,
) -> StoredInspection:
    if not _is_supabase_active():
        return local_store.create_inspection(
            id=id,
            variety=variety,
            weight_kg=weight_kg,
            location=location,
            created_at=created_at,
            user_id=user_id,
        )
    row = {
        "id": id,
        "variety": variety,
        "weight_kg": weight_kg,
        "location": location,
        "created_at": created_at,
        "status": "draft",
        "analysis_status": None,
        "analysis_poll_count": 0,
        "user_id": user_id,
    }
    response = _execute(_client().table("inspections").insert(row))
    created = _first(response)
    if created is None:
        raise PersistenceError("Supabase did not return the created inspection")
    return _inspection_from_row(created)


def get_inspection(inspection_id: str, user_id: str | None = None) -> StoredInspection | None:
    if not _is_supabase_active():
        return local_store.get_inspection(inspection_id, user_id=user_id)
    row = _get_inspection_row(inspection_id)
    if not row:
        return None
    if user_id is not None and row.get("user_id") and row.get("user_id") != user_id:
        return None
    return _inspection_from_row(row)


def list_inspections(user_id: str | None = None) -> list[StoredInspection]:
    if not _is_supabase_active():
        return local_store.list_inspections(user_id=user_id)
    query = _client().table("inspections").select("*")
    if user_id is not None:
        query = query.eq("user_id", user_id)
    response = _execute(query.order("created_at", desc=True))
    return [_inspection_from_row(row) for row in response.data or []]


def get_image(inspection_id: str, image_id: str) -> StoredImage | None:
    if not _is_supabase_active():
        return local_store.get_image(inspection_id, image_id)
    response = _execute(
        _client()
        .table("inspection_images")
        .select("*")
        .eq("inspection_id", inspection_id)
        .eq("id", image_id)
        .limit(1)
    )
    row = _first(response)
    return _image_from_row(row) if row else None


def create_image(
    *,
    id: str,
    inspection_id: str,
    uploaded_at: str,
    filename: str,
    content_type: str,
    storage_path: str,
    url: str,
) -> StoredImage:
    if not _is_supabase_active():
        return local_store.create_image(
            id=id,
            inspection_id=inspection_id,
            uploaded_at=uploaded_at,
            filename=filename,
            content_type=content_type,
            storage_path=storage_path,
            url=url,
        )
    response = _execute(
        _client()
        .table("inspection_images")
        .insert(
            {
                "id": id,
                "inspection_id": inspection_id,
                "uploaded_at": uploaded_at,
                "filename": filename,
                "content_type": content_type,
                "storage_path": storage_path,
                "url": url,
            }
        )
    )
    row = _first(response)
    if row is None:
        raise PersistenceError("Supabase did not return the created image")
    try:
        _execute(
            _client()
            .table("inspections")
            .update({"status": "in_progress"})
            .eq("id", inspection_id)
        )
    except PersistenceError:
        _execute(_client().table("inspection_images").delete().eq("id", id))
        raise
    return _image_from_row(row)


def update_inspection(inspection_id: str, values: dict[str, Any]) -> None:
    if not _is_supabase_active():
        local_store.update_inspection(inspection_id, values)
        return
    _execute(_client().table("inspections").update(values).eq("id", inspection_id))


def delete_inspection(inspection_id: str, user_id: str | None = None) -> None:
    if not _is_supabase_active():
        local_store.delete_inspection(inspection_id, user_id=user_id)
        return
    query = _client().table("inspections").delete().eq("id", inspection_id)
    if user_id is not None:
        query = query.eq("user_id", user_id)
    _execute(query)


def save_analysis_result(inspection_id: str, result: dict[str, Any]) -> None:
    if not _is_supabase_active():
        local_store.save_analysis_result(inspection_id, result)
        return
    row = {
        "inspection_id": inspection_id,
        "grade": result["grade"],
        "confidence": result["confidence"],
        "classification": result.get("classification"),
        "total_onions": result.get("totalOnions"),
        "model_name": result.get("modelName"),
        "defects": result["defects"],
        "summary": result["summary"],
        "analyzed_at": result["analyzedAt"],
        "healthy_count": result.get("healthyCount"),
        "rotten_damaged_count": result.get("rottenDamagedCount"),
        "sprouted_count": result.get("sproutedCount"),
        "uncertain_count": result.get("uncertainCount"),
        "annotated_image_url": result.get("annotatedImageUrl"),
        "annotated_image_path": result.get("annotatedImagePath"),
        "size_estimation": result.get("sizeEstimation"),
        "detections": result.get("detections"),
        "grade_explanation": result.get("gradeExplanation"),
        "attention_required": result.get("attentionRequired", False),
        "attention_reason": result.get("attentionReason"),
        "images_results": result.get("imagesResults"),
        "ai_assessment": result.get("aiAssessment"),
        "officer_assessment": result.get("officerAssessment"),
    }
    _execute(_client().table("analysis_results").upsert(row))


def _certificate_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "inspectionId": row["inspection_id"],
        "grade": row["grade"],
        "issuedAt": row["issued_at"],
        "batchLabel": row["batch_label"],
        "qrToken": row["qr_token"],
        "inspectorName": row.get("inspector_name"),
        "batchId": row.get("batch_id"),
        "procurementCentre": row.get("procurement_centre"),
        "specification": row.get("specification"),
        "sampleSize": row.get("sample_size"),
        "confidence": row.get("confidence"),
        "defectSummary": row.get("defect_summary"),
        "auditTimeline": row.get("audit_timeline"),
        "aiGrade": row.get("ai_grade"),
        "officerGrade": row.get("officer_grade") or row["grade"],
        "overrideCount": row.get("override_count", 0),
        "dualAssessment": row.get("dual_assessment"),
    }


def save_review_and_certificate(
    inspection_id: str,
    review: dict[str, Any],
    certificate: dict[str, Any],
) -> None:
    if not _is_supabase_active():
        local_store.save_review_and_certificate(inspection_id, review, certificate)
        return
    certificate_row = {
        "id": certificate["id"],
        "inspection_id": inspection_id,
        "grade": certificate["grade"],
        "issued_at": certificate["issuedAt"],
        "batch_label": certificate["batchLabel"],
        "qr_token": certificate["qrToken"],
        "inspector_name": certificate.get("inspectorName"),
        "batch_id": certificate.get("batchId"),
        "procurement_centre": certificate.get("procurementCentre"),
        "specification": certificate.get("specification"),
        "sample_size": certificate.get("sampleSize"),
        "confidence": certificate.get("confidence"),
        "defect_summary": certificate.get("defectSummary"),
        "audit_timeline": certificate.get("auditTimeline"),
        "ai_grade": certificate.get("aiGrade"),
        "officer_grade": certificate.get("officerGrade") or certificate["grade"],
        "override_count": certificate.get("overrideCount", 0),
        "dual_assessment": certificate.get("dualAssessment"),
    }
    _execute(_client().table("certificates").insert(certificate_row))
    try:
        _execute(
            _client()
            .table("reviews")
            .upsert(
                {
                    "inspection_id": inspection_id,
                    "certificate_id": certificate["id"],
                    "approved": review["approved"],
                    "notes": review.get("notes"),
                    "override_grade": review.get("overrideGrade"),
                    "reviewed_at": certificate["issuedAt"],
                }
            )
        )
    except PersistenceError:
        _execute(
            _client().table("certificates").delete().eq("id", certificate["id"])
        )
        raise
    try:
        update_inspection(inspection_id, {"status": "reviewed"})
    except PersistenceError:
        _execute(
            _client().table("reviews").delete().eq("inspection_id", inspection_id)
        )
        _execute(
            _client().table("certificates").delete().eq("id", certificate["id"])
        )
        raise


def save_review_rejection(
    inspection_id: str,
    review: dict[str, Any],
) -> None:
    if not _is_supabase_active():
        local_store.save_review_rejection(inspection_id, review)
        return
    # Delete certificate if exists
    try:
        _execute(_client().table("certificates").delete().eq("inspection_id", inspection_id))
    except Exception:
        pass
    _execute(
        _client()
        .table("reviews")
        .upsert(
            {
                "inspection_id": inspection_id,
                "certificate_id": None,
                "approved": False,
                "notes": review.get("notes"),
                "override_grade": review.get("overrideGrade"),
                "reviewed_at": utc_now_iso(),
            }
        )
    )
    update_inspection(inspection_id, {"status": "rejected"})


def get_certificate(certificate_id: str) -> dict[str, Any] | None:
    if not _is_supabase_active():
        return local_store.get_certificate(certificate_id)
    response = _execute(
        _client()
        .table("certificates")
        .select("*")
        .eq("id", certificate_id)
        .limit(1)
    )
    row = _first(response)
    return _certificate_from_row(row) if row else None


def get_certificate_by_token(token: str) -> dict[str, Any] | None:
    if not _is_supabase_active():
        return local_store.get_certificate_by_token(token)
    response = _execute(
        _client()
        .table("certificates")
        .select("*")
        .eq("qr_token", token)
        .limit(1)
    )
    row = _first(response)
    return _certificate_from_row(row) if row else None


def save_onion_decisions(inspection_id: str, decisions: list[dict[str, Any]]) -> None:
    if not decisions:
        return
    if not _is_supabase_active():
        local_store.save_onion_decisions(inspection_id, decisions)
        return
    rows = [
        {
            "id": d.get("id") or f"dec-{d.get('onionId', '')}-{uuid4().hex[:6]}",
            "inspection_id": inspection_id,
            "onion_id": d.get("onionId", ""),
            "image_id": d.get("imageId"),
            "ai_class": d.get("aiClass", "unknown"),
            "officer_class": d.get("officerClass", "unknown"),
            "final_class": d.get("finalClass") or d.get("officerClass", "unknown"),
            "ai_size": d.get("aiSize"),
            "officer_size": d.get("officerSize"),
            "final_size": d.get("finalSize") or d.get("officerSize"),
            "reason": d.get("reason"),
            "officer_name": d.get("officerName"),
            "created_at": d.get("createdAt") or utc_now_iso(),
        }
        for d in decisions
    ]
    _execute(_client().table("onion_decisions").upsert(rows))


def get_onion_decisions(inspection_id: str) -> list[dict[str, Any]]:
    if not _is_supabase_active():
        return local_store.get_onion_decisions(inspection_id)
    response = _execute(
        _client()
        .table("onion_decisions")
        .select("*")
        .eq("inspection_id", inspection_id)
        .order("created_at")
    )
    return [
        {
            "id": r["id"],
            "inspectionId": r["inspection_id"],
            "onionId": r["onion_id"],
            "imageId": r.get("image_id"),
            "aiClass": r["ai_class"],
            "officerClass": r["officer_class"],
            "finalClass": r["final_class"],
            "aiSize": r.get("ai_size"),
            "officerSize": r.get("officer_size"),
            "finalSize": r.get("final_size"),
            "reason": r.get("reason"),
            "officerName": r.get("officer_name"),
            "createdAt": r["created_at"],
        }
        for r in response.data or []
    ]


def create_user(
    *,
    id: str,
    email: str,
    password_hash: str,
    name: str,
    role: str = "INSPECTOR",
    created_at: str,
) -> dict[str, Any]:
    return local_store.create_user(
        id=id,
        email=email,
        password_hash=password_hash,
        name=name,
        role=role,
        created_at=created_at,
    )


def get_user_by_email(email: str) -> dict[str, Any] | None:
    return local_store.get_user_by_email(email)


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    return local_store.get_user_by_id(user_id)


def create_reset_token(email: str, token: str, expires_at: str) -> None:
    local_store.create_reset_token(email, token, expires_at)


def verify_and_consume_reset_token(token: str) -> str | None:
    return local_store.verify_and_consume_reset_token(token)


def update_user_password(email: str, password_hash: str) -> bool:
    return local_store.update_user_password(email, password_hash)


def get_adaptive_recommendation(ai_class: str, confidence: float | None = None) -> dict[str, Any]:
    return local_store.get_adaptive_recommendation(ai_class, confidence)


def save_review_request(
    inspection_id: str,
    farmer_name: str,
    phone_number: str | None,
    reason_category: str,
    comments: str | None,
) -> dict[str, Any]:
    return local_store.save_review_request(
        inspection_id, farmer_name, phone_number, reason_category, comments
    )


def get_review_requests(inspection_id: str) -> list[dict[str, Any]]:
    return local_store.get_review_requests(inspection_id)


save_review_approval = save_review_and_certificate
