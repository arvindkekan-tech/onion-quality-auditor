"""Persistence for inspection workflow state with Supabase and SQLite fallback."""

from __future__ import annotations

import logging
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

logger = logging.getLogger("onivis")


class PersistenceError(RuntimeError):
    """Raised when persistence cannot complete an operation."""


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8]}"


_supabase_disabled = False
_supabase_error_reason: str | None = None


def check_supabase_health(force_recheck: bool = False) -> tuple[bool, str | None]:
    global _supabase_disabled, _supabase_error_reason
    if _supabase_disabled and not force_recheck:
        return False, _supabase_error_reason

    try:
        client = get_supabase_client()
        if client is None:
            return False, "Supabase client is None"
        client.table("inspections").select("id").limit(1).execute()
        _supabase_disabled = False
        _supabase_error_reason = None
        return True, None
    except Exception as exc:
        _supabase_disabled = True
        _supabase_error_reason = str(exc)
        logger.warning("[PERSISTENCE] Supabase connectivity check failed: %s. Using SQLite local_store.", exc)
        return False, _supabase_error_reason


def disable_supabase_and_fallback(reason: str) -> None:
    global _supabase_disabled, _supabase_error_reason
    if not _supabase_disabled:
        logger.error("[PERSISTENCE] Supabase runtime failure (%s). Failing over to SQLite local_store.", reason)
    _supabase_disabled = True
    _supabase_error_reason = reason


def _is_supabase_active() -> bool:
    global _supabase_disabled
    if _supabase_disabled:
        return False
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
        disable_supabase_and_fallback(str(exc))
        raise PersistenceError(f"Supabase operation failed: {exc}") from exc


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
            "imagesResults": result_row.get("imagesResults"),
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
    local_insp = local_store.create_inspection(
        id=id,
        variety=variety,
        weight_kg=weight_kg,
        location=location,
        created_at=created_at,
        user_id=user_id,
    )
    if _is_supabase_active():
        try:
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
            if created is not None:
                return _inspection_from_row(created)
        except Exception as exc:
            disable_supabase_and_fallback(f"create_inspection failed: {exc}")

    return local_insp


def get_inspection(inspection_id: str, user_id: str | None = None) -> StoredInspection | None:
    insp = None
    if _is_supabase_active():
        try:
            row = _get_inspection_row(inspection_id)
            if row:
                if user_id is not None and row.get("user_id") and row.get("user_id") != user_id:
                    return None
                insp = _inspection_from_row(row)
        except Exception as exc:
            disable_supabase_and_fallback(f"get_inspection failed: {exc}")

    local_insp = local_store.get_inspection(inspection_id, user_id=user_id)
    if insp is None:
        return local_insp
    if insp.result is None and local_insp and local_insp.result is not None:
        return local_insp
    if insp.analysis_status in ("pending", "processing") and local_insp and local_insp.analysis_status == "completed":
        return local_insp
    return insp


def list_inspections(user_id: str | None = None) -> list[StoredInspection]:
    if _is_supabase_active():
        try:
            query = _client().table("inspections").select("*")
            if user_id is not None:
                query = query.eq("user_id", user_id)
            response = _execute(query.order("created_at", desc=True))
            return [_inspection_from_row(row) for row in response.data or []]
        except Exception as exc:
            disable_supabase_and_fallback(f"list_inspections failed: {exc}")

    return local_store.list_inspections(user_id=user_id)


def get_image(inspection_id: str, image_id: str) -> StoredImage | None:
    if _is_supabase_active():
        try:
            response = _execute(
                _client()
                .table("inspection_images")
                .select("*")
                .eq("inspection_id", inspection_id)
                .eq("id", image_id)
                .limit(1)
            )
            row = _first(response)
            if row:
                return _image_from_row(row)
            return None
        except Exception as exc:
            disable_supabase_and_fallback(f"get_image failed: {exc}")

    return local_store.get_image(inspection_id, image_id)


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
    local_img = local_store.create_image(
        id=id,
        inspection_id=inspection_id,
        uploaded_at=uploaded_at,
        filename=filename,
        content_type=content_type,
        storage_path=storage_path,
        url=url,
    )
    if _is_supabase_active():
        try:
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
            if row is not None:
                try:
                    _execute(
                        _client()
                        .table("inspections")
                        .update({"status": "in_progress"})
                        .eq("id", inspection_id)
                    )
                except Exception:
                    pass
                return _image_from_row(row)
        except Exception as exc:
            disable_supabase_and_fallback(f"create_image failed: {exc}")

    return local_img


def update_inspection(inspection_id: str, values: dict[str, Any]) -> None:
    local_store.update_inspection(inspection_id, values)
    if _is_supabase_active():
        try:
            _execute(_client().table("inspections").update(values).eq("id", inspection_id))
            return
        except Exception as exc:
            disable_supabase_and_fallback(f"update_inspection failed: {exc}")


def delete_inspection(inspection_id: str, user_id: str | None = None) -> None:
    local_store.delete_inspection(inspection_id, user_id=user_id)
    if _is_supabase_active():
        try:
            query = _client().table("inspections").delete().eq("id", inspection_id)
            if user_id is not None:
                query = query.eq("user_id", user_id)
            _execute(query)
            return
        except Exception as exc:
            disable_supabase_and_fallback(f"delete_inspection failed: {exc}")


def save_analysis_result(inspection_id: str, result: dict[str, Any]) -> None:
    local_store.save_analysis_result(inspection_id, result)
    if _is_supabase_active():
        try:
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
            return
        except Exception as exc:
            disable_supabase_and_fallback(f"save_analysis_result failed: {exc}")


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
    local_store.save_review_and_certificate(inspection_id, review, certificate)
    if _is_supabase_active():
        try:
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
            update_inspection(inspection_id, {"status": "reviewed"})
            return
        except Exception as exc:
            disable_supabase_and_fallback(f"save_review_and_certificate failed: {exc}")


def save_review_rejection(
    inspection_id: str,
    review: dict[str, Any],
) -> None:
    local_store.save_review_rejection(inspection_id, review)
    if _is_supabase_active():
        try:
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
            return
        except Exception as exc:
            disable_supabase_and_fallback(f"save_review_rejection failed: {exc}")


def get_certificate(certificate_id: str) -> dict[str, Any] | None:
    if _is_supabase_active():
        try:
            response = _execute(
                _client()
                .table("certificates")
                .select("*")
                .eq("id", certificate_id)
                .limit(1)
            )
            row = _first(response)
            if row:
                return _certificate_from_row(row)
        except Exception as exc:
            disable_supabase_and_fallback(f"get_certificate failed: {exc}")

    return local_store.get_certificate(certificate_id)


def get_certificate_by_token(token: str) -> dict[str, Any] | None:
    if _is_supabase_active():
        try:
            response = _execute(
                _client()
                .table("certificates")
                .select("*")
                .eq("qr_token", token)
                .limit(1)
            )
            row = _first(response)
            if row:
                return _certificate_from_row(row)
        except Exception as exc:
            disable_supabase_and_fallback(f"get_certificate_by_token failed: {exc}")

    return local_store.get_certificate_by_token(token)


def save_onion_decisions(inspection_id: str, decisions: list[dict[str, Any]]) -> None:
    if not decisions:
        return
    if _is_supabase_active():
        try:
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
            return
        except Exception as exc:
            disable_supabase_and_fallback(f"save_onion_decisions failed: {exc}")

    local_store.save_onion_decisions(inspection_id, decisions)


def get_onion_decisions(inspection_id: str) -> list[dict[str, Any]]:
    if _is_supabase_active():
        try:
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
        except Exception as exc:
            disable_supabase_and_fallback(f"get_onion_decisions failed: {exc}")

    return local_store.get_onion_decisions(inspection_id)


def create_user(
    *,
    id: str,
    email: str,
    password_hash: str,
    name: str,
    role: str = "INSPECTOR",
    created_at: str,
) -> dict[str, Any]:
    user = local_store.create_user(
        id=id,
        email=email,
        password_hash=password_hash,
        name=name,
        role=role,
        created_at=created_at,
    )
    if _is_supabase_active():
        try:
            _client().table("users").upsert({
                "id": id,
                "email": email.lower().strip(),
                "password_hash": password_hash,
                "name": name,
                "role": role,
                "created_at": created_at,
            }).execute()
        except Exception as exc:
            logger.warning("[PERSISTENCE] Could not mirror user to Supabase: %s", exc)
    return user


def get_user_by_email(email: str) -> dict[str, Any] | None:
    user = local_store.get_user_by_email(email)
    if user and _is_supabase_active():
        try:
            _client().table("users").upsert({
                "id": user["id"],
                "email": user["email"],
                "password_hash": user["password_hash"],
                "name": user["name"],
                "role": user["role"],
                "created_at": user.get("created_at") or utc_now_iso(),
            }).execute()
        except Exception:
            pass
    return user


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
    if _is_supabase_active():
        try:
            row = {
                "id": new_id("req"),
                "inspection_id": inspection_id,
                "farmer_name": farmer_name,
                "phone_number": phone_number,
                "reason_category": reason_category,
                "comments": comments,
                "status": "PENDING",
                "created_at": utc_now_iso(),
            }
            res = _execute(_client().table("review_requests").insert(row))
            created = _first(res)
            if created:
                return {
                    "id": created["id"],
                    "inspectionId": created["inspection_id"],
                    "farmerName": created["farmer_name"],
                    "phoneNumber": created.get("phone_number"),
                    "reasonCategory": created["reason_category"],
                    "comments": created.get("comments"),
                    "status": created["status"],
                    "createdAt": created["created_at"],
                }
        except Exception as exc:
            disable_supabase_and_fallback(f"save_review_request failed: {exc}")

    return local_store.save_review_request(
        inspection_id, farmer_name, phone_number, reason_category, comments
    )


def get_review_requests(inspection_id: str) -> list[dict[str, Any]]:
    if _is_supabase_active():
        try:
            res = _execute(
                _client()
                .table("review_requests")
                .select("*")
                .eq("inspection_id", inspection_id)
                .order("created_at", desc=True)
            )
            return [
                {
                    "id": r["id"],
                    "inspectionId": r["inspection_id"],
                    "farmerName": r["farmer_name"],
                    "phoneNumber": r.get("phone_number"),
                    "reasonCategory": r["reason_category"],
                    "comments": r.get("comments"),
                    "status": r["status"],
                    "createdAt": r["created_at"],
                }
                for r in res.data or []
            ]
        except Exception as exc:
            disable_supabase_and_fallback(f"get_review_requests failed: {exc}")

    return local_store.get_review_requests(inspection_id)


save_review_approval = save_review_and_certificate


def update_user_profile(user_id: str, name: str) -> dict[str, Any] | None:
    return local_store.update_user_profile(user_id, name)


def list_officer_re_audit_requests(user_id: str) -> list[dict[str, Any]]:
    return local_store.list_officer_re_audit_requests(user_id)


def get_officer_re_audit_request(request_id: str, user_id: str) -> dict[str, Any] | None:
    return local_store.get_officer_re_audit_request(request_id, user_id)


def update_officer_re_audit_status(
    request_id: str,
    user_id: str,
    status: str,
    notes: str | None = None,
) -> dict[str, Any] | None:
    return local_store.update_officer_re_audit_status(request_id, user_id, status, notes)


def complete_officer_re_audit(
    request_id: str,
    user_id: str,
    finding: str,
    explanation: str,
    evidence_reviewed: list[str],
    re_audit_grade: str | None = None,
    notes: str | None = None,
) -> dict[str, Any] | None:
    return local_store.complete_officer_re_audit(
        request_id=request_id,
        user_id=user_id,
        finding=finding,
        explanation=explanation,
        evidence_reviewed=evidence_reviewed,
        re_audit_grade=re_audit_grade,
        notes=notes,
    )


def track_review_request(request_id: str, phone_number: str) -> dict[str, Any] | None:
    return local_store.track_review_request(request_id, phone_number)
