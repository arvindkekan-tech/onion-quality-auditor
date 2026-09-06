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
            """
        )
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
        ]:
            try:
                conn.execute(f"ALTER TABLE analysis_results ADD COLUMN {col_def[0]} {col_def[1]}")
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
    *, id: str, variety: str, weight_kg: float, location: str, created_at: str
) -> StoredInspection:
    init_db()
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO inspections (id, variety, weight_kg, location, created_at, status, analysis_status, analysis_poll_count)
            VALUES (?, ?, ?, ?, ?, 'draft', NULL, 0)
            """,
            (id, variety, weight_kg, location, created_at),
        )
    return get_inspection(id)  # type: ignore


def get_inspection(inspection_id: str) -> StoredInspection | None:
    init_db()
    with _get_connection() as conn:
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
        )


def list_inspections() -> list[StoredInspection]:
    init_db()
    with _get_connection() as conn:
        rows = conn.execute(
            "SELECT id FROM inspections ORDER BY created_at DESC"
        ).fetchall()
        inspections = []
        for r in rows:
            insp = get_inspection(r["id"])
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


def delete_inspection(inspection_id: str) -> None:
    init_db()
    with _get_connection() as conn:
        conn.execute("DELETE FROM inspections WHERE id = ?", (inspection_id,))


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
                images_results, ai_assessment, officer_assessment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                officer_assessment = excluded.officer_assessment
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
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM certificates WHERE qr_token = ?", (token,)
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
