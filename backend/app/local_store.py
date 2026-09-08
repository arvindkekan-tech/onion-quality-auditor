"""SQLite-backed persistence fallback when Supabase is unconfigured or offline."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from app.store_types import StoredImage, StoredInspection

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "onivis.db"


def _get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS inspections (
                id TEXT PRIMARY KEY,
                variety TEXT NOT NULL,
                weight_kg REAL NOT NULL,
                location TEXT NOT NULL,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL,
                analysis_status TEXT,
                analysis_poll_count INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS inspection_images (
                id TEXT PRIMARY KEY,
                inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
                uploaded_at TEXT NOT NULL,
                filename TEXT NOT NULL,
                content_type TEXT NOT NULL,
                storage_path TEXT NOT NULL UNIQUE,
                url TEXT
            );

            CREATE TABLE IF NOT EXISTS analysis_results (
                inspection_id TEXT PRIMARY KEY REFERENCES inspections(id) ON DELETE CASCADE,
                grade TEXT NOT NULL,
                confidence REAL NOT NULL,
                classification TEXT,
                total_onions INTEGER,
                model_name TEXT,
                defects TEXT NOT NULL,
                summary TEXT NOT NULL,
                analyzed_at TEXT NOT NULL,
                healthy_count INTEGER,
                rotten_damaged_count INTEGER,
                sprouted_count INTEGER,
                uncertain_count INTEGER,
                annotated_image_url TEXT,
                annotated_image_path TEXT,
                size_estimation TEXT,
                detections TEXT,
                grade_explanation TEXT,
                attention_required INTEGER DEFAULT 0,
                attention_reason TEXT
            );

            CREATE TABLE IF NOT EXISTS reviews (
                inspection_id TEXT PRIMARY KEY REFERENCES inspections(id) ON DELETE CASCADE,
                certificate_id TEXT,
                approved INTEGER NOT NULL,
                notes TEXT,
                override_grade TEXT,
                reviewed_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS certificates (
                id TEXT PRIMARY KEY,
                inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
                grade TEXT NOT NULL,
                issued_at TEXT NOT NULL,
                batch_label TEXT NOT NULL,
                qr_token TEXT NOT NULL UNIQUE,
                inspector_name TEXT,
                batch_id TEXT,
                procurement_centre TEXT,
                specification TEXT,
                sample_size INTEGER,
                confidence REAL,
                defect_summary TEXT,
                audit_timeline TEXT,
                ai_grade TEXT,
                officer_grade TEXT,
                override_count INTEGER DEFAULT 0,
                dual_assessment TEXT
            );

            CREATE TABLE IF NOT EXISTS onion_decisions (
                id TEXT PRIMARY KEY,
                inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
                onion_id TEXT NOT NULL,
                image_id TEXT,
                ai_class TEXT NOT NULL,
                officer_class TEXT NOT NULL,
                final_class TEXT NOT NULL,
                ai_size TEXT,
                officer_size TEXT,
                final_size TEXT,
                reason TEXT,
                officer_name TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'INSPECTOR',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                token TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS verified_feedback (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
                onion_id TEXT NOT NULL,
                ai_class TEXT NOT NULL,
                ai_confidence REAL,
                ai_size TEXT,
                officer_class TEXT NOT NULL,
                officer_size TEXT,
                reason TEXT,
                procurement_centre TEXT,
                variety TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS review_requests (
                id TEXT PRIMARY KEY,
                inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
                farmer_name TEXT NOT NULL,
                phone_number TEXT,
                reason_category TEXT NOT NULL,
                comments TEXT,
                status TEXT NOT NULL DEFAULT 'PENDING',
                created_at TEXT NOT NULL
            );
            """
        )
        # Migrate existing inspections table for user_id
        try:
            conn.execute("ALTER TABLE inspections ADD COLUMN user_id TEXT")
        except Exception:
            pass
        # Migrate existing certificates table if columns are missing
        for col_def in [
            ("ai_grade", "TEXT"),
            ("officer_grade", "TEXT"),
            ("override_count", "INTEGER DEFAULT 0"),
            ("dual_assessment", "TEXT"),
        ]:
            try:
                conn.execute(f"ALTER TABLE certificates ADD COLUMN {col_def[0]} {col_def[1]}")
            except Exception:
                pass
        # Migrate existing analysis_results table if columns are missing
        for col_def in [
            ("images_results", "TEXT"),
            ("ai_assessment", "TEXT"),
            ("officer_assessment", "TEXT"),
            ("attention_queue", "TEXT"),
            ("why_this_grade", "TEXT"),
            ("standards_matrix", "TEXT"),
        ]:
            try:
                conn.execute(f"ALTER TABLE analysis_results ADD COLUMN {col_def[0]} {col_def[1]}")
            except Exception:
                pass

        # Migrate review_requests table for closed-loop response
        for col_def in [
            ("in_review_at", "TEXT"),
            ("completed_at", "TEXT"),
            ("completed_by", "TEXT"),
            ("finding", "TEXT"),
            ("explanation", "TEXT"),
            ("evidence_reviewed", "TEXT"),
            ("re_audit_grade", "TEXT"),
            ("officer_notes", "TEXT"),
        ]:
            try:
                conn.execute(f"ALTER TABLE review_requests ADD COLUMN {col_def[0]} {col_def[1]}")
            except Exception:
                pass


def _safe_json_loads(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return None


def create_inspection(
    *,
    id: str,
    variety: str,
    weight_kg: float,
    location: str,
    created_at: str,
    user_id: str | None = None,
) -> StoredInspection:
    init_db()
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO inspections (id, variety, weight_kg, location, created_at, status, analysis_status, analysis_poll_count, user_id)
            VALUES (?, ?, ?, ?, ?, 'draft', NULL, 0, ?)
            """,
            (id, variety, weight_kg, location, created_at, user_id),
        )
    return get_inspection(id)  # type: ignore


def get_inspection(inspection_id: str, user_id: str | None = None) -> StoredInspection | None:
    init_db()
    with _get_connection() as conn:
        if user_id is not None:
            row = conn.execute(
                "SELECT * FROM inspections WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
                (inspection_id, user_id),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM inspections WHERE id = ?", (inspection_id,)
            ).fetchone()
        if not row:
            return None

        img_rows = conn.execute(
            "SELECT * FROM inspection_images WHERE inspection_id = ? ORDER BY uploaded_at",
            (inspection_id,),
        ).fetchall()
        images = [
            StoredImage(
                id=img["id"],
                uploaded_at=img["uploaded_at"],
                filename=img["filename"],
                content_type=img["content_type"],
                storage_path=img["storage_path"],
                url=img["url"],
            )
            for img in img_rows
        ]

        res_row = conn.execute(
            "SELECT * FROM analysis_results WHERE inspection_id = ?", (inspection_id,)
        ).fetchone()
        result = None
        if res_row:
            result = {
                "inspectionId": res_row["inspection_id"],
                "grade": res_row["grade"],
                "confidence": res_row["confidence"],
                "classification": res_row["classification"],
                "totalOnions": res_row["total_onions"],
                "modelName": res_row["model_name"],
                "defects": _safe_json_loads(res_row["defects"]) or [],
                "summary": res_row["summary"],
                "analyzedAt": res_row["analyzed_at"],
                "healthyCount": res_row["healthy_count"],
                "rottenDamagedCount": res_row["rotten_damaged_count"],
                "sproutedCount": res_row["sprouted_count"],
                "uncertainCount": res_row["uncertain_count"],
                "annotatedImageUrl": res_row["annotated_image_url"],
                "annotatedImagePath": res_row["annotated_image_path"],
                "sizeEstimation": _safe_json_loads(res_row["size_estimation"]),
                "detections": _safe_json_loads(res_row["detections"]),
                "gradeExplanation": res_row["grade_explanation"],
                "attentionRequired": bool(res_row["attention_required"]),
                "attentionReason": res_row["attention_reason"],
                "imagesResults": _safe_json_loads(res_row["images_results"]) if "images_results" in res_row.keys() else None,
                "aiAssessment": _safe_json_loads(res_row["ai_assessment"]) if "ai_assessment" in res_row.keys() else None,
                "officerAssessment": _safe_json_loads(res_row["officer_assessment"]) if "officer_assessment" in res_row.keys() else None,
                "attentionQueue": _safe_json_loads(res_row["attention_queue"]) if "attention_queue" in res_row.keys() and res_row["attention_queue"] else None,
                "whyThisGrade": _safe_json_loads(res_row["why_this_grade"]) if "why_this_grade" in res_row.keys() and res_row["why_this_grade"] else None,
                "standardsMatrix": _safe_json_loads(res_row["standards_matrix"]) if "standards_matrix" in res_row.keys() and res_row["standards_matrix"] else None,
            }

        rev_row = conn.execute(
            "SELECT * FROM reviews WHERE inspection_id = ?", (inspection_id,)
        ).fetchone()
        review = None
        if rev_row:
            review = {
                "certificateId": rev_row["certificate_id"],
                "approved": bool(rev_row["approved"]),
                "notes": rev_row["notes"],
                "overrideGrade": rev_row["override_grade"],
            }

        cert_row = conn.execute(
            "SELECT * FROM certificates WHERE inspection_id = ?", (inspection_id,)
        ).fetchone()
        certificate = None
        if cert_row:
            certificate = {
                "id": cert_row["id"],
                "inspectionId": cert_row["inspection_id"],
                "grade": cert_row["grade"],
                "issuedAt": cert_row["issued_at"],
                "batchLabel": cert_row["batch_label"],
                "qrToken": cert_row["qr_token"],
                "inspectorName": cert_row["inspector_name"],
                "batchId": cert_row["batch_id"],
                "procurementCentre": cert_row["procurement_centre"],
                "specification": cert_row["specification"],
                "sampleSize": cert_row["sample_size"],
                "confidence": cert_row["confidence"],
                "defectSummary": cert_row["defect_summary"],
                "auditTimeline": _safe_json_loads(cert_row["audit_timeline"]),
            }

        return StoredInspection(
            id=row["id"],
            variety=row["variety"],
            weight_kg=float(row["weight_kg"]),
            location=row["location"],
            created_at=row["created_at"],
            status=row["status"],
            images=images,
            analysis_status=row["analysis_status"],
            analysis_poll_count=row["analysis_poll_count"],
            result=result,
            review=review,
            certificate=certificate,
            user_id=row["user_id"] if "user_id" in row.keys() else None,
        )


def list_inspections(user_id: str | None = None) -> list[StoredInspection]:
    init_db()
    with _get_connection() as conn:
        if user_id is not None:
            rows = conn.execute(
                "SELECT id FROM inspections WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id FROM inspections ORDER BY created_at DESC"
            ).fetchall()
        inspections = []
        for r in rows:
            insp = get_inspection(r["id"], user_id=user_id)
            if insp:
                inspections.append(insp)
        return inspections


def get_image(inspection_id: str, image_id: str) -> StoredImage | None:
    init_db()
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM inspection_images WHERE inspection_id = ? AND id = ?",
            (inspection_id, image_id),
        ).fetchone()
        if not row:
            return None
        return StoredImage(
            id=row["id"],
            uploaded_at=row["uploaded_at"],
            filename=row["filename"],
            content_type=row["content_type"],
            storage_path=row["storage_path"],
            url=row["url"],
        )


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
    init_db()
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO inspection_images (id, inspection_id, uploaded_at, filename, content_type, storage_path, url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (id, inspection_id, uploaded_at, filename, content_type, storage_path, url),
        )
        conn.execute(
            "UPDATE inspections SET status = 'in_progress' WHERE id = ?",
            (inspection_id,),
        )
    return StoredImage(
        id=id,
        uploaded_at=uploaded_at,
        filename=filename,
        content_type=content_type,
        storage_path=storage_path,
        url=url,
    )


def update_inspection(inspection_id: str, values: dict[str, Any]) -> None:
    init_db()
    if not values:
        return
    clauses = [f"{k} = ?" for k in values.keys()]
    params = list(values.values()) + [inspection_id]
    with _get_connection() as conn:
        conn.execute(
            f"UPDATE inspections SET {', '.join(clauses)} WHERE id = ?", params
        )


def delete_inspection(inspection_id: str, user_id: str | None = None) -> bool:
    init_db()
    with _get_connection() as conn:
        if user_id is not None:
            res = conn.execute(
                "DELETE FROM inspections WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
                (inspection_id, user_id),
            )
        else:
            res = conn.execute("DELETE FROM inspections WHERE id = ?", (inspection_id,))
        return res.rowcount > 0


def save_analysis_result(inspection_id: str, result: dict[str, Any]) -> None:
    init_db()
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO analysis_results (
                inspection_id, grade, confidence, classification, total_onions,
                model_name, defects, summary, analyzed_at, healthy_count,
                rotten_damaged_count, sprouted_count, uncertain_count,
                annotated_image_url, annotated_image_path, size_estimation, detections,
                grade_explanation, attention_required, attention_reason,
                images_results, ai_assessment, officer_assessment,
                attention_queue, why_this_grade, standards_matrix
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(inspection_id) DO UPDATE SET
                grade = excluded.grade,
                confidence = excluded.confidence,
                classification = excluded.classification,
                total_onions = excluded.total_onions,
                model_name = excluded.model_name,
                defects = excluded.defects,
                summary = excluded.summary,
                analyzed_at = excluded.analyzed_at,
                healthy_count = excluded.healthy_count,
                rotten_damaged_count = excluded.rotten_damaged_count,
                sprouted_count = excluded.sprouted_count,
                uncertain_count = excluded.uncertain_count,
                annotated_image_url = excluded.annotated_image_url,
                annotated_image_path = excluded.annotated_image_path,
                size_estimation = excluded.size_estimation,
                detections = excluded.detections,
                grade_explanation = excluded.grade_explanation,
                attention_required = excluded.attention_required,
                attention_reason = excluded.attention_reason,
                images_results = excluded.images_results,
                ai_assessment = excluded.ai_assessment,
                officer_assessment = excluded.officer_assessment,
                attention_queue = excluded.attention_queue,
                why_this_grade = excluded.why_this_grade,
                standards_matrix = excluded.standards_matrix
            """,
            (
                inspection_id,
                result["grade"],
                result["confidence"],
                result.get("classification"),
                result.get("totalOnions"),
                result.get("modelName"),
                json.dumps(result.get("defects", [])),
                result["summary"],
                result["analyzedAt"],
                result.get("healthyCount"),
                result.get("rottenDamagedCount"),
                result.get("sproutedCount"),
                result.get("uncertainCount"),
                result.get("annotatedImageUrl"),
                result.get("annotatedImagePath"),
                json.dumps(result["sizeEstimation"]) if result.get("sizeEstimation") else None,
                json.dumps(result["detections"]) if result.get("detections") else None,
                result.get("gradeExplanation"),
                1 if result.get("attentionRequired") else 0,
                result.get("attentionReason"),
                json.dumps(result["imagesResults"]) if result.get("imagesResults") else None,
                json.dumps(result["aiAssessment"]) if result.get("aiAssessment") else None,
                json.dumps(result["officerAssessment"]) if result.get("officerAssessment") else None,
                json.dumps(result["attentionQueue"]) if result.get("attentionQueue") else None,
                json.dumps(result["whyThisGrade"]) if result.get("whyThisGrade") else None,
                json.dumps(result["standardsMatrix"]) if result.get("standardsMatrix") else None,
            ),
        )


def save_review_and_certificate(
    inspection_id: str,
    review: dict[str, Any],
    certificate: dict[str, Any],
) -> None:
    init_db()
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO certificates (
                id, inspection_id, grade, issued_at, batch_label, qr_token,
                inspector_name, batch_id, procurement_centre, specification,
                sample_size, confidence, defect_summary, audit_timeline,
                ai_grade, officer_grade, override_count, dual_assessment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                certificate["id"],
                inspection_id,
                certificate["grade"],
                certificate["issuedAt"],
                certificate["batchLabel"],
                certificate["qrToken"],
                certificate.get("inspectorName"),
                certificate.get("batchId"),
                certificate.get("procurementCentre"),
                certificate.get("specification"),
                certificate.get("sampleSize"),
                certificate.get("confidence"),
                certificate.get("defectSummary"),
                json.dumps(certificate.get("auditTimeline")),
                certificate.get("aiGrade"),
                certificate.get("officerGrade") or certificate["grade"],
                certificate.get("overrideCount", 0),
                json.dumps(certificate.get("dualAssessment")) if certificate.get("dualAssessment") else None,
            ),
        )
        conn.execute(
            """
            INSERT INTO reviews (inspection_id, certificate_id, approved, notes, override_grade, reviewed_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(inspection_id) DO UPDATE SET
                certificate_id = excluded.certificate_id,
                approved = excluded.approved,
                notes = excluded.notes,
                override_grade = excluded.override_grade,
                reviewed_at = excluded.reviewed_at
            """,
            (
                inspection_id,
                certificate["id"],
                1 if review["approved"] else 0,
                review.get("notes"),
                review.get("overrideGrade"),
                certificate["issuedAt"],
            ),
        )
        conn.execute(
            "UPDATE inspections SET status = 'reviewed' WHERE id = ?",
            (inspection_id,),
        )


def save_review_rejection(
    inspection_id: str,
    review: dict[str, Any],
) -> None:
    init_db()
    from app.store import utc_now_iso
    reviewed_at = utc_now_iso()
    with _get_connection() as conn:
        conn.execute("DELETE FROM certificates WHERE inspection_id = ?", (inspection_id,))
        conn.execute(
            """
            INSERT INTO reviews (inspection_id, certificate_id, approved, notes, override_grade, reviewed_at)
            VALUES (?, NULL, 0, ?, ?, ?)
            ON CONFLICT(inspection_id) DO UPDATE SET
                certificate_id = NULL,
                approved = 0,
                notes = excluded.notes,
                override_grade = excluded.override_grade,
                reviewed_at = excluded.reviewed_at
            """,
            (
                inspection_id,
                review.get("notes"),
                review.get("overrideGrade"),
                reviewed_at,
            ),
        )
        conn.execute(
            "UPDATE inspections SET status = 'rejected' WHERE id = ?",
            (inspection_id,),
        )


def get_certificate(certificate_id: str) -> dict[str, Any] | None:
    init_db()
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM certificates WHERE id = ?", (certificate_id,)
        ).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "inspectionId": row["inspection_id"],
            "grade": row["grade"],
            "issuedAt": row["issued_at"],
            "batchLabel": row["batch_label"],
            "qrToken": row["qr_token"],
            "inspectorName": row["inspector_name"],
            "batchId": row["batch_id"],
            "procurementCentre": row["procurement_centre"],
            "specification": row["specification"],
            "sampleSize": row["sample_size"],
            "confidence": row["confidence"],
            "defectSummary": row["defect_summary"],
            "auditTimeline": _safe_json_loads(row["audit_timeline"]),
            "aiGrade": row["ai_grade"] if "ai_grade" in row.keys() else None,
            "officerGrade": row["officer_grade"] if "officer_grade" in row.keys() else row["grade"],
            "overrideCount": row["override_count"] if "override_count" in row.keys() else 0,
            "dualAssessment": _safe_json_loads(row["dual_assessment"]) if "dual_assessment" in row.keys() else None,
        }


def get_certificate_by_token(token: str) -> dict[str, Any] | None:
    init_db()
    clean_token = token.strip()
    qr_variant = clean_token if clean_token.startswith("qr-") else f"qr-{clean_token}"
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM certificates WHERE qr_token = ? OR id = ? OR qr_token = ?",
            (clean_token, clean_token, qr_variant),
        ).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "inspectionId": row["inspection_id"],
            "grade": row["grade"],
            "issuedAt": row["issued_at"],
            "batchLabel": row["batch_label"],
            "qrToken": row["qr_token"],
            "inspectorName": row["inspector_name"],
            "batchId": row["batch_id"],
            "procurementCentre": row["procurement_centre"],
            "specification": row["specification"],
            "sampleSize": row["sample_size"],
            "confidence": row["confidence"],
            "defectSummary": row["defect_summary"],
            "auditTimeline": _safe_json_loads(row["audit_timeline"]),
            "aiGrade": row["ai_grade"] if "ai_grade" in row.keys() else None,
            "officerGrade": row["officer_grade"] if "officer_grade" in row.keys() else row["grade"],
            "overrideCount": row["override_count"] if "override_count" in row.keys() else 0,
            "dualAssessment": _safe_json_loads(row["dual_assessment"]) if "dual_assessment" in row.keys() else None,
        }


def save_onion_decisions(inspection_id: str, decisions: list[dict[str, Any]]) -> None:
    if not decisions:
        return
    init_db()
    from uuid import uuid4
    from app.store import utc_now_iso
    with _get_connection() as conn:
        for d in decisions:
            decision_id = d.get("id") or f"dec-{d.get('onionId', '')}-{uuid4().hex[:6]}"
            conn.execute(
                """
                INSERT OR REPLACE INTO onion_decisions (
                    id, inspection_id, onion_id, image_id, ai_class,
                    officer_class, final_class, ai_size, officer_size,
                    final_size, reason, officer_name, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    decision_id,
                    inspection_id,
                    d.get("onionId", ""),
                    d.get("imageId"),
                    d.get("aiClass", "unknown"),
                    d.get("officerClass", "unknown"),
                    d.get("finalClass") or d.get("officerClass", "unknown"),
                    d.get("aiSize"),
                    d.get("officerSize"),
                    d.get("finalSize") or d.get("officerSize"),
                    d.get("reason"),
                    d.get("officerName"),
                    d.get("createdAt") or utc_now_iso(),
                ),
            )
            # When officer overrides AI decision, record as verified feedback
            off_cls = d.get("officerClass")
            ai_cls = d.get("aiClass")
            if off_cls and ai_cls and off_cls != ai_cls:
                fb_id = f"fb-{uuid4().hex[:8]}"
                insp_row = conn.execute("SELECT location, variety, user_id FROM inspections WHERE id = ?", (inspection_id,)).fetchone()
                loc = insp_row["location"] if insp_row else None
                var = insp_row["variety"] if insp_row else None
                u_id = insp_row["user_id"] if insp_row else None
                conn.execute(
                    """
                    INSERT INTO verified_feedback (
                        id, user_id, inspection_id, onion_id, ai_class,
                        ai_confidence, ai_size, officer_class, officer_size,
                        reason, procurement_centre, variety, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        fb_id,
                        u_id,
                        inspection_id,
                        d.get("onionId", ""),
                        ai_cls,
                        float(d.get("aiConfidence", 0.0)) if d.get("aiConfidence") else None,
                        d.get("aiSize"),
                        off_cls,
                        d.get("officerSize"),
                        d.get("reason"),
                        loc,
                        var,
                        d.get("createdAt") or utc_now_iso(),
                    ),
                )


def get_onion_decisions(inspection_id: str) -> list[dict[str, Any]]:
    init_db()
    with _get_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM onion_decisions WHERE inspection_id = ? ORDER BY created_at ASC",
            (inspection_id,),
        )
        return [
            {
                "id": row["id"],
                "inspectionId": row["inspection_id"],
                "onionId": row["onion_id"],
                "imageId": row["image_id"],
                "aiClass": row["ai_class"],
                "officerClass": row["officer_class"],
                "finalClass": row["final_class"],
                "aiSize": row["ai_size"],
                "officerSize": row["officer_size"],
                "finalSize": row["final_size"],
                "reason": row["reason"],
                "officerName": row["officer_name"],
                "createdAt": row["created_at"],
            }
            for row in cursor.fetchall()
        ]


def get_adaptive_recommendation(ai_class: str, confidence: float | None = None) -> dict[str, Any]:
    init_db()
    with _get_connection() as conn:
        rows = conn.execute(
            "SELECT officer_class, reason FROM verified_feedback WHERE ai_class = ?",
            (ai_class,),
        ).fetchall()
        if not rows:
            return {"hasAdaptiveInsight": False}
        total_similar = len(rows)
        counts: dict[str, int] = {}
        reasons: list[str] = []
        for r in rows:
            cls = r["officer_class"]
            counts[cls] = counts.get(cls, 0) + 1
            if r["reason"] and r["reason"] not in reasons and len(reasons) < 3:
                reasons.append(r["reason"])

        top_corrected_class = max(counts.items(), key=lambda x: x[1])[0]
        top_count = counts[top_corrected_class]

        from_display = ai_class.replace("_", " ").title()
        to_display = top_corrected_class.replace("_", " ").title()

        return {
            "hasAdaptiveInsight": True,
            "similarCasesCount": total_similar,
            "correctedCount": top_count,
            "fromClass": ai_class,
            "toClass": top_corrected_class,
            "insightText": f"Based on {total_similar} previously verified similar case(s), {top_count} were corrected from {from_display} to {to_display}.",
            "recommendation": f"Review carefully: historical officer consensus suggests checking for subtle {to_display.lower()} characteristics.",
            "commonReasons": reasons,
        }


def save_review_request(
    inspection_id: str,
    farmer_name: str,
    phone_number: str,
    reason_category: str,
    comments: str | None,
) -> dict[str, Any]:
    init_db()
    from app.store import utc_now_iso
    import datetime
    now = utc_now_iso()
    with _get_connection() as conn:
        # Generate persistent, unique human-readable Request ID e.g. RA-2026-000001
        year = datetime.datetime.now(datetime.timezone.utc).year
        row_cnt = conn.execute("SELECT COUNT(*) as cnt FROM review_requests").fetchone()
        count = (row_cnt["cnt"] if row_cnt else 0) + 1
        req_id = f"RA-{year}-{count:06d}"
        while conn.execute("SELECT 1 FROM review_requests WHERE id = ?", (req_id,)).fetchone():
            count += 1
            req_id = f"RA-{year}-{count:06d}"

        conn.execute(
            """
            INSERT INTO review_requests (id, inspection_id, farmer_name, phone_number, reason_category, comments, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
            """,
            (req_id, inspection_id, farmer_name, phone_number, reason_category, comments, now),
        )
        cert_row = conn.execute(
            "SELECT id, audit_timeline FROM certificates WHERE inspection_id = ?",
            (inspection_id,),
        ).fetchone()
        if cert_row and cert_row["audit_timeline"]:
            timeline = _safe_json_loads(cert_row["audit_timeline"]) or []
            timeline.append({
                "time": now,
                "event": f"Farmer Appeal Registered: {reason_category} ({farmer_name})",
            })
            conn.execute(
                "UPDATE certificates SET audit_timeline = ? WHERE inspection_id = ?",
                (json.dumps(timeline), inspection_id),
            )
    cert_id = cert_row["id"] if cert_row else None
    return {
        "id": req_id,
        "inspectionId": inspection_id,
        "certificateId": cert_id,
        "farmerName": farmer_name,
        "reasonCategory": reason_category,
        "status": "PENDING",
        "createdAt": now,
        "message": "Farmer review request logged in APMC Mandi audit trail.",
    }


def get_review_requests(inspection_id: str) -> list[dict[str, Any]]:
    init_db()
    with _get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM review_requests WHERE inspection_id = ? ORDER BY created_at DESC",
            (inspection_id,),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "inspectionId": r["inspection_id"],
                "farmerName": r["farmer_name"],
                "phoneNumber": r["phone_number"],
                "reasonCategory": r["reason_category"],
                "comments": r["comments"],
                "status": r["status"],
                "createdAt": r["created_at"],
            }
            for r in rows
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
    init_db()
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO users (id, email, password_hash, name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (id, email.lower().strip(), password_hash, name, role, created_at),
        )
    return {
        "id": id,
        "email": email.lower().strip(),
        "name": name,
        "role": role,
        "createdAt": created_at,
    }


def get_user_by_email(email: str) -> dict[str, Any] | None:
    init_db()
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email.lower().strip(),),
        ).fetchone()
        if not row:
            return None
        return dict(row)


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    init_db()
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            return None
        return dict(row)


def create_reset_token(email: str, token: str, expires_at: str) -> None:
    init_db()
    with _get_connection() as conn:
        conn.execute(
            "INSERT INTO password_reset_tokens (token, email, expires_at) VALUES (?, ?, ?)",
            (token, email.lower().strip(), expires_at),
        )


def verify_and_consume_reset_token(token: str) -> str | None:
    init_db()
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT email, expires_at FROM password_reset_tokens WHERE token = ?",
            (token,),
        ).fetchone()
        if not row:
            return None
        conn.execute("DELETE FROM password_reset_tokens WHERE token = ?", (token,))
        return str(row["email"])


def update_user_password(email: str, password_hash: str) -> bool:
    init_db()
    with _get_connection() as conn:
        res = conn.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?",
            (password_hash, email.lower().strip()),
        )
        return res.rowcount > 0


save_review_approval = save_review_and_certificate


def update_user_profile(user_id: str, name: str) -> dict[str, Any] | None:
    init_db()
    with _get_connection() as conn:
        conn.execute("UPDATE users SET name = ? WHERE id = ?", (name.strip(), user_id))
        row = conn.execute("SELECT id, email, name, role, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "email": row["email"],
            "name": row["name"],
            "role": row["role"],
            "createdAt": row["created_at"],
        }


def list_officer_re_audit_requests(user_id: str) -> list[dict[str, Any]]:
    init_db()
    with _get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                rr.id,
                rr.inspection_id,
                rr.farmer_name,
                rr.phone_number,
                rr.reason_category,
                rr.comments,
                rr.status,
                rr.created_at,
                rr.in_review_at,
                rr.completed_at,
                rr.completed_by,
                rr.finding,
                rr.explanation,
                rr.evidence_reviewed,
                rr.re_audit_grade,
                rr.officer_notes,
                c.id AS certificate_id,
                c.grade AS original_grade,
                c.inspector_name,
                c.sample_size,
                c.defect_summary,
                c.procurement_centre,
                i.variety,
                i.location,
                i.created_at AS inspection_date
            FROM review_requests rr
            JOIN inspections i ON rr.inspection_id = i.id
            LEFT JOIN certificates c ON c.inspection_id = i.id
            WHERE i.user_id = ?
            ORDER BY rr.created_at DESC
            """,
            (user_id,),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "inspectionId": r["inspection_id"],
                "certificateId": r["certificate_id"],
                "farmerName": r["farmer_name"],
                "phoneNumber": r["phone_number"],
                "reasonCategory": r["reason_category"],
                "comments": r["comments"],
                "status": r["status"] or "PENDING",
                "createdAt": r["created_at"],
                "inReviewAt": r["in_review_at"],
                "completedAt": r["completed_at"],
                "completedBy": r["completed_by"],
                "finding": r["finding"],
                "explanation": r["explanation"],
                "evidenceReviewed": _safe_json_loads(r["evidence_reviewed"]) if r["evidence_reviewed"] else None,
                "reAuditGrade": r["re_audit_grade"],
                "originalGrade": r["original_grade"],
                "inspectionDate": r["inspection_date"],
                "variety": r["variety"],
                "location": r["location"],
                "sampleSize": r["sample_size"],
                "defectSummary": r["defect_summary"],
                "inspectorName": r["inspector_name"],
                "procurementCentre": r["procurement_centre"] or r["location"],
            }
            for r in rows
        ]


def get_officer_re_audit_request(request_id: str, user_id: str) -> dict[str, Any] | None:
    init_db()
    with _get_connection() as conn:
        r = conn.execute(
            """
            SELECT
                rr.id,
                rr.inspection_id,
                rr.farmer_name,
                rr.phone_number,
                rr.reason_category,
                rr.comments,
                rr.status,
                rr.created_at,
                rr.in_review_at,
                rr.completed_at,
                rr.completed_by,
                rr.finding,
                rr.explanation,
                rr.evidence_reviewed,
                rr.re_audit_grade,
                rr.officer_notes,
                c.id AS certificate_id,
                c.grade AS original_grade,
                c.inspector_name,
                c.sample_size,
                c.defect_summary,
                c.procurement_centre,
                i.variety,
                i.location,
                i.created_at AS inspection_date
            FROM review_requests rr
            JOIN inspections i ON rr.inspection_id = i.id
            LEFT JOIN certificates c ON c.inspection_id = i.id
            WHERE rr.id = ? AND i.user_id = ?
            """,
            (request_id, user_id),
        ).fetchone()
        if not r:
            return None
        return {
            "id": r["id"],
            "inspectionId": r["inspection_id"],
            "certificateId": r["certificate_id"],
            "farmerName": r["farmer_name"],
            "phoneNumber": r["phone_number"],
            "reasonCategory": r["reason_category"],
            "comments": r["comments"],
            "status": r["status"] or "PENDING",
            "createdAt": r["created_at"],
            "inReviewAt": r["in_review_at"],
            "completedAt": r["completed_at"],
            "completedBy": r["completed_by"],
            "finding": r["finding"],
            "explanation": r["explanation"],
            "evidenceReviewed": _safe_json_loads(r["evidence_reviewed"]) if r["evidence_reviewed"] else None,
            "reAuditGrade": r["re_audit_grade"],
            "originalGrade": r["original_grade"],
            "inspectionDate": r["inspection_date"],
            "variety": r["variety"],
            "location": r["location"],
            "sampleSize": r["sample_size"],
            "defectSummary": r["defect_summary"],
            "inspectorName": r["inspector_name"],
            "procurementCentre": r["procurement_centre"] or r["location"],
        }


def update_officer_re_audit_status(
    request_id: str,
    user_id: str,
    status: str,
    notes: str | None = None,
) -> dict[str, Any] | None:
    init_db()
    from app.store import utc_now_iso
    now = utc_now_iso()
    with _get_connection() as conn:
        check = conn.execute(
            """
            SELECT rr.id, rr.inspection_id, rr.in_review_at FROM review_requests rr
            JOIN inspections i ON rr.inspection_id = i.id
            WHERE rr.id = ? AND i.user_id = ?
            """,
            (request_id, user_id),
        ).fetchone()
        if not check:
            return None
        clean_status = status.strip().upper()
        if clean_status == "IN_REVIEW":
            in_review_time = check["in_review_at"] or now
            conn.execute(
                """
                UPDATE review_requests
                SET status = ?, in_review_at = COALESCE(in_review_at, ?), officer_notes = COALESCE(?, officer_notes)
                WHERE id = ?
                """,
                (clean_status, in_review_time, notes, request_id),
            )
        else:
            conn.execute(
                """
                UPDATE review_requests
                SET status = ?, officer_notes = COALESCE(?, officer_notes)
                WHERE id = ?
                """,
                (clean_status, notes, request_id),
            )
    return get_officer_re_audit_request(request_id, user_id)


def complete_officer_re_audit(
    request_id: str,
    user_id: str,
    finding: str,
    explanation: str,
    evidence_reviewed: list[str],
    re_audit_grade: str | None = None,
    notes: str | None = None,
) -> dict[str, Any] | None:
    init_db()
    from app.store import utc_now_iso
    now = utc_now_iso()
    with _get_connection() as conn:
        check = conn.execute(
            """
            SELECT rr.id, rr.inspection_id, u.name as officer_name, c.id as cert_id, c.audit_timeline
            FROM review_requests rr
            JOIN inspections i ON rr.inspection_id = i.id
            LEFT JOIN users u ON u.id = i.user_id
            LEFT JOIN certificates c ON c.inspection_id = i.id
            WHERE rr.id = ? AND i.user_id = ?
            """,
            (request_id, user_id),
        ).fetchone()
        if not check:
            return None

        officer_name = check["officer_name"] or "Authorized Officer"
        evidence_json = json.dumps(evidence_reviewed)

        conn.execute(
            """
            UPDATE review_requests
            SET status = 'COMPLETED',
                completed_at = ?,
                completed_by = ?,
                finding = ?,
                explanation = ?,
                evidence_reviewed = ?,
                re_audit_grade = ?,
                officer_notes = COALESCE(?, officer_notes)
            WHERE id = ?
            """,
            (
                now,
                officer_name,
                finding.strip(),
                explanation.strip(),
                evidence_json,
                re_audit_grade,
                notes,
                request_id,
            ),
        )

        # Update certificate audit timeline with verified re-audit event
        if check["cert_id"] and check["audit_timeline"]:
            timeline = _safe_json_loads(check["audit_timeline"]) or []
            timeline.append({
                "time": now,
                "event": f"Re-Audit Determination Finalized: {finding.strip()} (Officer: {officer_name})",
            })
            conn.execute(
                "UPDATE certificates SET audit_timeline = ? WHERE id = ?",
                (json.dumps(timeline), check["cert_id"]),
            )

    return get_officer_re_audit_request(request_id, user_id)


def track_review_request(request_id: str, phone_number: str) -> dict[str, Any] | None:
    init_db()
    clean_req_id = request_id.strip()
    clean_phone = phone_number.strip()
    import re
    # Extract digits for comparison
    digits_input = re.sub(r"\D", "", clean_phone)
    if len(digits_input) > 10:
        digits_input = digits_input[-10:]

    with _get_connection() as conn:
        r = conn.execute(
            """
            SELECT
                rr.id,
                rr.inspection_id,
                rr.farmer_name,
                rr.phone_number,
                rr.reason_category,
                rr.comments,
                rr.status,
                rr.created_at,
                rr.in_review_at,
                rr.completed_at,
                rr.completed_by,
                rr.finding,
                rr.explanation,
                rr.evidence_reviewed,
                rr.re_audit_grade,
                c.id AS certificate_id,
                c.grade AS original_grade,
                c.inspector_name,
                c.sample_size,
                c.procurement_centre,
                i.variety,
                i.location,
                i.created_at AS inspection_date
            FROM review_requests rr
            JOIN inspections i ON rr.inspection_id = i.id
            LEFT JOIN certificates c ON c.inspection_id = i.id
            WHERE rr.id = ?
            """,
            (clean_req_id,),
        ).fetchone()

        if not r:
            return None

        # Verify phone number match
        stored_phone = r["phone_number"] or ""
        digits_stored = re.sub(r"\D", "", stored_phone)
        if len(digits_stored) > 10:
            digits_stored = digits_stored[-10:]

        if not digits_input or (digits_input != digits_stored and clean_phone != stored_phone):
            return None  # Phone mismatch -> 404 security rejection

        evidence_list = _safe_json_loads(r["evidence_reviewed"]) if r["evidence_reviewed"] else None

        return {
            "id": r["id"],
            "certificateId": r["certificate_id"],
            "inspectionId": r["inspection_id"],
            "farmerName": r["farmer_name"],
            "phoneNumber": r["phone_number"],
            "reasonCategory": r["reason_category"],
            "comments": r["comments"],
            "status": r["status"] or "PENDING",
            "createdAt": r["created_at"],
            "inReviewAt": r["in_review_at"],
            "completedAt": r["completed_at"],
            "originalGrade": r["original_grade"],
            "originalInspectionDate": r["inspection_date"],
            "procurementCentre": r["procurement_centre"] or r["location"],
            "variety": r["variety"],
            "sampleSize": r["sample_size"],
            "evidenceReviewed": evidence_list,
            "finding": r["finding"],
            "explanation": r["explanation"],
            "reAuditGrade": r["re_audit_grade"],
            "officerName": r["completed_by"] or r["inspector_name"] or "Authorized Mandi Officer",
        }
