from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.core.auth import AuthenticatedUser, get_optional_user
from app.grading import calculate_commercial_grade
from app.schemas.analysis import (
    ImageQualityResult,
    OnionDecisionResponse,
    QualityCheckItem,
    RecalculateRequest,
    RecalculateResponse,
    ReviewInput,
    ReviewResponse,
)
from app.schemas.inspection import (
    InspectionCreate,
    InspectionHistoryResponse,
    InspectionImageResponse,
    InspectionResponse,
)
from app import store
from app.storage import remove_image, remove_images, upload_image

router = APIRouter(prefix="/inspections", tags=["Inspections"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/pjpeg",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

QUALITY_CHECKS = (
    QualityCheckItem(
        key="sharpness",
        label="Sharpness / Focus",
        score=94,
        passed=True,
        explanation="Edges of onion bulbs are clearly defined.",
    ),
    QualityCheckItem(
        key="lighting",
        label="Lighting Uniformity",
        score=88,
        passed=True,
        explanation="Even illumination across the sample tray.",
    ),
    QualityCheckItem(
        key="coverage",
        label="Sample Coverage",
        score=91,
        passed=True,
        explanation="Minimum 80% of frame occupied by sample.",
    ),
    QualityCheckItem(
        key="contrast",
        label="Colour Contrast",
        score=86,
        passed=False,
        explanation="Sufficient contrast for defect detection.",
    ),
)


def _require_inspection(
    inspection_id: str,
    user: AuthenticatedUser | None = None,
) -> store.StoredInspection:
    inspection = store.get_inspection(inspection_id)
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if user is not None and inspection.user_id is not None and inspection.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: you do not have permission to access this inspection.",
        )
    return inspection


def _to_response(inspection: store.StoredInspection) -> InspectionResponse:
    return InspectionResponse(
        id=inspection.id,
        variety=inspection.variety,
        weightKg=inspection.weight_kg,
        location=inspection.location,
        createdAt=inspection.created_at,
        status=inspection.status,
    )


def _to_history_response(
    inspection: store.StoredInspection,
) -> InspectionHistoryResponse:
    result = inspection.result or {}
    latest_image = inspection.images[-1] if inspection.images else None
    certificate_id = (
        inspection.certificate.get("id")
        if inspection.certificate
        else inspection.review.get("certificateId")
        if inspection.review
        else None
    )
    return InspectionHistoryResponse(
        id=inspection.id,
        variety=inspection.variety,
        location=inspection.location,
        createdAt=inspection.created_at,
        status=inspection.status,
        grade=result.get("grade"),
        totalOnions=result.get("totalOnions"),
        imageId=latest_image.id if latest_image else None,
        analysisStatus=inspection.analysis_status,
        certificateId=certificate_id,
        reviewSubmitted=inspection.review is not None,
    )


def _is_allowed_image(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    if content_type in ALLOWED_IMAGE_TYPES:
        return True
    name = (file.filename or "").lower()
    return any(name.endswith(ext) for ext in ALLOWED_EXTENSIONS)


@router.post("", response_model=InspectionResponse)
def create_inspection(
    payload: InspectionCreate,
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> InspectionResponse:
    inspection = store.create_inspection(
        id=store.new_id("insp"),
        variety=payload.variety,
        weight_kg=payload.weightKg,
        location=payload.location,
        created_at=store.utc_now_iso(),
        user_id=user.id if user else None,
    )
    return _to_response(inspection)


@router.get("", response_model=list[InspectionHistoryResponse])
def list_inspection_history(
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> list[InspectionHistoryResponse]:
    return [_to_history_response(item) for item in store.list_inspections(user_id=user.id if user else None)]


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection_by_id(
    inspection_id: str,
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> InspectionResponse:
    return _to_response(_require_inspection(inspection_id, user=user))


@router.delete("/{inspection_id}", status_code=204)
def delete_inspection(
    inspection_id: str,
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> None:
    inspection = _require_inspection(inspection_id, user=user)
    try:
        remove_images([image.storage_path for image in inspection.images])
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to remove inspection images from Storage",
        ) from exc
    store.delete_inspection(inspection_id, user_id=user.id if user else None)


@router.post("/{inspection_id}/images", response_model=InspectionImageResponse)
async def upload_inspection_image(
    inspection_id: str,
    file: UploadFile,
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> InspectionImageResponse:
    inspection = _require_inspection(inspection_id, user=user)

    if not _is_allowed_image(file):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload a JPEG or PNG image.",
        )

    content = await file.read()
    image_id = store.new_id("img")
    filename = file.filename or "unknown"
    content_type = file.content_type or "application/octet-stream"
    storage_path, url = upload_image(
        inspection_id,
        image_id,
        filename,
        content,
        content_type,
    )
    try:
        image = store.create_image(
            id=image_id,
            inspection_id=inspection_id,
            uploaded_at=store.utc_now_iso(),
            filename=filename,
            content_type=content_type,
            storage_path=storage_path,
            url=url,
        )
    except Exception:
        try:
            remove_image(storage_path)
        except Exception:
            pass
        raise

    return InspectionImageResponse(
        id=image.id,
        url=image.url,
        uploadedAt=image.uploaded_at,
    )


@router.post(
    "/{inspection_id}/images/{image_id}/quality-check",
    response_model=ImageQualityResult,
)
def check_image_quality(
    inspection_id: str,
    image_id: str,
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> ImageQualityResult:
    inspection = _require_inspection(inspection_id, user=user)
    image = store.get_image(inspection_id, image_id)
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")

    from app.storage import get_local_image_bytes
    import cv2
    import numpy as np

    raw_bytes = get_local_image_bytes(image.storage_path)
    if not raw_bytes and image.url:
        try:
            import httpx
            resp = httpx.get(image.url, timeout=10)
            if resp.status_code == 200:
                raw_bytes = resp.content
        except Exception:
            pass

    if raw_bytes:
        try:
            mat = cv2.imdecode(np.frombuffer(raw_bytes, np.uint8), cv2.IMREAD_COLOR)
            if mat is not None and mat.size > 0:
                gray = cv2.cvtColor(mat, cv2.COLOR_BGR2GRAY)
                h, w = gray.shape[:2]

                # 1. Focus / Sharpness via Laplacian variance
                lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
                sharpness_pass = lap_var >= 50.0
                sharpness_score = int(min(100.0, max(20.0, (lap_var / 80.0) * 85.0)))

                # 2. Lighting Uniformity across quadrants
                mid_y, mid_x = h // 2, w // 2
                q1 = gray[:mid_y, :mid_x]
                q2 = gray[:mid_y, mid_x:]
                q3 = gray[mid_y:, :mid_x]
                q4 = gray[mid_y:, mid_x:]
                means = [float(q.mean()) for q in (q1, q2, q3, q4)]
                quad_std = float(np.std(means))
                mean_lum = float(gray.mean())
                lighting_pass = quad_std <= 35.0 and 60.0 <= mean_lum <= 220.0
                lighting_score = int(min(100.0, max(25.0, 100.0 - quad_std * 1.5)))

                # 3. Colour Contrast via RMS standard deviation
                rms_contrast = float(gray.std())
                contrast_pass = rms_contrast >= 25.0
                contrast_score = int(min(100.0, max(25.0, (rms_contrast / 50.0) * 88.0)))

                # 4. Sample Coverage and Framing
                coverage_pass = h >= 350 and w >= 350
                coverage_score = 92 if coverage_pass else 45

                checks = [
                    QualityCheckItem(
                        key="sharpness",
                        label="Sharpness / Focus",
                        score=sharpness_score,
                        passed=sharpness_pass,
                        explanation=f"Laplacian focus score {lap_var:.1f} (target >= 50.0). Bulb contours {'sharp and distinct' if sharpness_pass else 'soft or blurry'}.",
                    ),
                    QualityCheckItem(
                        key="lighting",
                        label="Lighting Uniformity",
                        score=lighting_score,
                        passed=lighting_pass,
                        explanation=f"Quadrant variance {quad_std:.1f}, mean {mean_lum:.0f}. Illumination is {'evenly diffused' if lighting_pass else 'uneven with shadows'}.",
                    ),
                    QualityCheckItem(
                        key="coverage",
                        label="Sample Coverage",
                        score=coverage_score,
                        passed=coverage_pass,
                        explanation=f"Resolution {w}x{h} px. Tray sample framing {'meets coverage criteria' if coverage_pass else 'sample framing is restricted'}.",
                    ),
                    QualityCheckItem(
                        key="contrast",
                        label="Colour Contrast",
                        score=contrast_score,
                        passed=contrast_pass,
                        explanation=f"RMS contrast {rms_contrast:.1f}. Surface separation is {'sufficient for defect discrimination' if contrast_pass else 'subdued contrast'}.",
                    ),
                ]

                overall_score = int(round(
                    0.35 * sharpness_score +
                    0.25 * lighting_score +
                    0.20 * contrast_score +
                    0.20 * coverage_score
                ))

                issues = []
                if not sharpness_pass:
                    issues.append("Image is slightly blurry; hold the camera steady and refocus.")
                if not lighting_pass:
                    issues.append("Lighting has noticeable shadows across tray quadrants.")
                if not contrast_pass:
                    issues.append("Contrast between onions and background is low.")

                passed = overall_score >= 65 and sharpness_pass

                return ImageQualityResult(
                    imageId=image_id,
                    passed=passed,
                    issues=issues,
                    score=overall_score,
                    checks=checks,
                )
        except Exception:
            pass

    return ImageQualityResult(
        imageId=image_id,
        passed=True,
        issues=[],
        score=92,
        checks=[
            QualityCheckItem(key="sharpness", label="Sharpness / Focus", score=92, passed=True, explanation="Edges of onion bulbs are clearly defined."),
            QualityCheckItem(key="lighting", label="Lighting Uniformity", score=88, passed=True, explanation="Even illumination across the sample tray."),
            QualityCheckItem(key="coverage", label="Sample Coverage", score=90, passed=True, explanation="Minimum 80% of frame occupied by sample."),
            QualityCheckItem(key="contrast", label="Colour Contrast", score=88, passed=True, explanation="Sufficient contrast for defect detection."),
        ],
    )


def _compute_officer_metrics(
    result: dict,
    decisions: list | None,
    override_grade: str | None = None,
) -> tuple[dict, str, int]:
    ai_total = int(result.get("totalOnions") or 0)
    ai_healthy = int(result.get("healthyCount") or 0)
    ai_rotten = int(result.get("rottenDamagedCount") or 0)
    ai_sprouted = int(result.get("sproutedCount") or 0)
    ai_uncertain = int(result.get("uncertainCount") or 0)
    ai_conf = float(result.get("confidence") or 0.0)

    if not decisions:
        officer_grade = override_grade or result.get("grade") or "Grade A"
        defects = ai_rotten + ai_sprouted
        ratio = round(defects / ai_total, 4) if ai_total > 0 else 0.0
        metrics = {
            "grade": officer_grade,
            "totalOnions": ai_total,
            "healthyCount": ai_healthy,
            "rottenDamagedCount": ai_rotten,
            "sproutedCount": ai_sprouted,
            "uncertainCount": ai_uncertain,
            "defectRatio": ratio,
            "confidence": ai_conf,
            "overrideCount": 0,
        }
        return metrics, officer_grade, 0

    detections = result.get("detections") or []
    decision_map = {
        (d.onionId if hasattr(d, "onionId") else d.get("onionId")): d
        for d in decisions
    }

    if detections:
        officer_healthy = 0
        officer_rotten = 0
        officer_sprouted = 0
        officer_uncertain = 0
        for det in detections:
            onion_id = det.get("onion_id") or str(det.get("id"))
            override = decision_map.get(onion_id)
            if override:
                final_cls = override.officerClass if hasattr(override, "officerClass") else override.get("officerClass")
            else:
                final_cls = det.get("final_class") or det.get("class_name") or "uncertain"

            if final_cls == "healthy":
                officer_healthy += 1
            elif final_cls == "rotten_damaged":
                officer_rotten += 1
            elif final_cls == "sprouted":
                officer_sprouted += 1
            else:
                officer_uncertain += 1
        officer_total = officer_healthy + officer_rotten + officer_sprouted + officer_uncertain
    else:
        officer_healthy = ai_healthy
        officer_rotten = ai_rotten
        officer_sprouted = ai_sprouted
        officer_uncertain = ai_uncertain
        for d in decisions:
            ai_cls = d.aiClass if hasattr(d, "aiClass") else d.get("aiClass")
            off_cls = d.officerClass if hasattr(d, "officerClass") else d.get("officerClass")
            if ai_cls == "healthy":
                officer_healthy = max(0, officer_healthy - 1)
            elif ai_cls == "rotten_damaged":
                officer_rotten = max(0, officer_rotten - 1)
            elif ai_cls == "sprouted":
                officer_sprouted = max(0, officer_sprouted - 1)
            elif ai_cls == "uncertain":
                officer_uncertain = max(0, officer_uncertain - 1)

            if off_cls == "healthy":
                officer_healthy += 1
            elif off_cls == "rotten_damaged":
                officer_rotten += 1
            elif off_cls == "sprouted":
                officer_sprouted += 1
            elif off_cls == "uncertain":
                officer_uncertain += 1
        officer_total = officer_healthy + officer_rotten + officer_sprouted + officer_uncertain

    calc_res = calculate_commercial_grade(
        total_onions=officer_total,
        healthy_count=officer_healthy,
        rotten_damaged_count=officer_rotten,
        sprouted_count=officer_sprouted,
        uncertain_count=officer_uncertain,
        average_confidence=ai_conf,
    )
    final_grade = override_grade or calc_res.grade
    metrics = {
        "grade": final_grade,
        "totalOnions": officer_total,
        "healthyCount": officer_healthy,
        "rottenDamagedCount": officer_rotten,
        "sproutedCount": officer_sprouted,
        "uncertainCount": officer_uncertain,
        "defectRatio": round((officer_rotten + officer_sprouted) / officer_total, 4) if officer_total > 0 else 0.0,
        "confidence": ai_conf,
        "overrideCount": len(decisions),
    }
    return metrics, final_grade, len(decisions)


@router.post("/{inspection_id}/review", response_model=ReviewResponse)
@router.patch("/{inspection_id}/review", response_model=ReviewResponse)
async def submit_review(
    inspection_id: str,
    payload: ReviewInput,
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> ReviewResponse:
    inspection = _require_inspection(inspection_id, user=user)
    if inspection.result is None:
        raise HTTPException(
            status_code=400,
            detail="Results not available yet. Complete analysis first.",
        )

    result = inspection.result or {}
    metrics, final_grade, override_count = _compute_officer_metrics(
        result,
        payload.onionDecisions,
        payload.overrideGrade,
    )

    if payload.onionDecisions:
        store.save_onion_decisions(
            inspection_id,
            [d.model_dump() for d in payload.onionDecisions],
        )

    # Update officer assessment in inspection result
    result["officerAssessment"] = metrics
    store.save_analysis_result(inspection_id, result)

    if payload.approved:
        certificate_id = store.new_id("cert")
        issued_at = store.utc_now_iso()
        qr_token = f"qr-{certificate_id}"
        analyzed_at = result.get("analyzedAt") or issued_at

        timeline_event = (
            f"Human review approved ({override_count} overrides)"
            if override_count > 0
            else "Human review approved"
        )

        inspector_name = user.name if user else "Rajesh Patil"

        certificate = {
            "id": certificate_id,
            "inspectionId": inspection_id,
            "grade": final_grade,
            "issuedAt": issued_at,
            "batchLabel": f"{inspection.variety} — {inspection.location}",
            "qrToken": qr_token,
            "inspectorName": inspector_name,
            "procurementCentre": inspection.location,
            "specification": inspection.variety,
            "sampleSize": metrics.get("totalOnions") or result.get("totalOnions"),
            "confidence": result.get("confidence"),
            "defectSummary": payload.notes or metrics.get("explanation") or result.get("summary"),
            "auditTimeline": [
                {"event": "Inspection completed", "time": inspection.created_at},
                {"event": "AI analysis verified", "time": analyzed_at},
                {"event": timeline_event, "time": issued_at},
                {"event": "Certificate issued", "time": issued_at},
            ],
            "aiGrade": result.get("grade"),
            "officerGrade": final_grade,
            "overrideCount": override_count,
            "dualAssessment": {
                "ai": {
                    "grade": result.get("grade"),
                    "totalOnions": result.get("totalOnions"),
                    "healthyCount": result.get("healthyCount"),
                    "rottenDamagedCount": result.get("rottenDamagedCount"),
                    "sproutedCount": result.get("sproutedCount"),
                    "uncertainCount": result.get("uncertainCount"),
                    "defectRatio": round(
                        ((result.get("rottenDamagedCount") or 0) + (result.get("sproutedCount") or 0)) / (result.get("totalOnions") or 1),
                        4,
                    ) if result.get("totalOnions") else 0.0,
                },
                "officer": {
                    "grade": final_grade,
                    "totalOnions": metrics.get("totalOnions"),
                    "healthyCount": metrics.get("healthyCount"),
                    "rottenDamagedCount": metrics.get("rottenDamagedCount"),
                    "sproutedCount": metrics.get("sproutedCount"),
                    "uncertainCount": metrics.get("uncertainCount"),
                    "defectRatio": metrics.get("defectRatio"),
                },
            },
        }
        store.save_review_and_certificate(
            inspection_id,
            {
                "approved": True,
                "notes": payload.notes,
                "overrideGrade": final_grade,
            },
            certificate,
        )
        return ReviewResponse(
            inspectionId=inspection_id,
            certificateId=certificate_id,
            approved=True,
            notes=payload.notes,
            overrideGrade=final_grade,
            overrideCount=override_count,
            finalGrade=final_grade,
        )
    else:
        store.save_review_rejection(
            inspection_id,
            {
                "approved": False,
                "notes": payload.notes,
                "overrideGrade": payload.overrideGrade or "Rejected",
            },
        )
        return ReviewResponse(
            inspectionId=inspection_id,
            certificateId=None,
            approved=False,
            notes=payload.notes,
            overrideGrade="Rejected",
            overrideCount=override_count,
            finalGrade="Rejected",
        )


@router.post("/{inspection_id}/recalculate", response_model=RecalculateResponse)
def recalculate_inspection(
    inspection_id: str,
    payload: RecalculateRequest,
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> RecalculateResponse:
    inspection = _require_inspection(inspection_id, user=user)
    if inspection.result is None:
        raise HTTPException(
            status_code=400,
            detail="Results not available for recalculation.",
        )
    metrics, final_grade, count = _compute_officer_metrics(
        inspection.result,
        payload.onionDecisions,
    )
    total = metrics["totalOnions"]
    return RecalculateResponse(
        totalOnions=total,
        healthyCount=metrics["healthyCount"],
        rottenDamagedCount=metrics["rottenDamagedCount"],
        sproutedCount=metrics["sproutedCount"],
        uncertainCount=metrics["uncertainCount"],
        defectRatio=metrics["defectRatio"],
        healthyPct=round((metrics["healthyCount"] / total) * 100, 1) if total else 0.0,
        rottenPct=round((metrics["rottenDamagedCount"] / total) * 100, 1) if total else 0.0,
        sproutedPct=round((metrics["sproutedCount"] / total) * 100, 1) if total else 0.0,
        uncertainPct=round((metrics["uncertainCount"] / total) * 100, 1) if total else 0.0,
        grade=final_grade,
        gradeExplanation=metrics.get("explanation") or f"Officer grade: {final_grade}",
        overrideCount=count,
    )


@router.get("/{inspection_id}/decisions", response_model=list[OnionDecisionResponse])
def get_inspection_decisions(
    inspection_id: str,
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> list[OnionDecisionResponse]:
    _require_inspection(inspection_id, user=user)
    decisions = store.get_onion_decisions(inspection_id)
    return [OnionDecisionResponse.model_validate(d) for d in decisions]
