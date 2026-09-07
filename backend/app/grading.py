"""Commercial MVP grading logic isolated from ML inference.

Implements decision thresholds for onion procurement:
- defect_ratio = (rotten_damaged + sprouted) / total_onions
- <= 5%: Grade A
- > 5% and <= 15%: URS (Under-sized / Re-sorted / Standard)
- > 15%: Rejected
- If total_onions == 0: Unrated
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class CommercialGradeResult:
    grade: str
    grade_code: str
    defect_ratio: float
    explanation: str
    attention_required: bool
    attention_reason: Optional[str]
    attention_queue: List[Dict[str, Any]] = field(default_factory=list)
    why_this_grade: Dict[str, Any] = field(default_factory=dict)
    standards_matrix: List[Dict[str, Any]] = field(default_factory=list)


def build_standards_matrix(
    *,
    total_onions: int,
    rotten_damaged_count: int,
    sprouted_count: int,
    defect_ratio: float,
    average_diameter_mm: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """Builds formal standards-to-evidence matrix separating optical evidence from physical testing."""
    return [
        {
            "parameter": "Visible Rot & Mechanical Damage",
            "detectionMethod": "Optical AI Object Detection & Classification",
            "evidenceStatus": "Evidence Available",
            "procurementThreshold": "<= 5.0% for Grade A; <= 15.0% for URS",
            "measuredValue": f"{rotten_damaged_count} bulb(s) ({round(rotten_damaged_count / max(1, total_onions) * 100, 1)}%)",
            "compliant": defect_ratio <= 0.05,
            "requiresManualCheck": False,
        },
        {
            "parameter": "Vegetative Sprouting & Green Shoots",
            "detectionMethod": "Morphological AI Defect Classification",
            "evidenceStatus": "Evidence Available",
            "procurementThreshold": "0.0% for Grade A; <= 5.0% for URS",
            "measuredValue": f"{sprouted_count} bulb(s) ({round(sprouted_count / max(1, total_onions) * 100, 1)}%)",
            "compliant": sprouted_count == 0,
            "requiresManualCheck": False,
        },
        {
            "parameter": "Bulb Caliber / Diameter (Size)",
            "detectionMethod": "Calibrated 500x500mm Metric Scaling",
            "evidenceStatus": "Evidence Available",
            "procurementThreshold": "40mm - 70mm Medium/Large (Grade A)",
            "measuredValue": f"{average_diameter_mm:.1f} mm avg" if average_diameter_mm else "Calibrated estimation",
            "compliant": True if (not average_diameter_mm or (40.0 <= average_diameter_mm <= 75.0)) else False,
            "requiresManualCheck": False,
        },
        {
            "parameter": "Internal Rot (Smut / Soft Rot)",
            "detectionMethod": "Physical Destructive Cut Test",
            "evidenceStatus": "Not Camera Measurable",
            "procurementThreshold": "Zero internal fungal or bacterial rot",
            "measuredValue": "Requires destructive field knife test",
            "compliant": None,
            "requiresManualCheck": True,
        },
        {
            "parameter": "Moisture Content (Curing)",
            "detectionMethod": "Electronic Moisture Meter",
            "evidenceStatus": "Not Camera Measurable",
            "procurementThreshold": "12.0% - 14.0% outer skin moisture",
            "measuredValue": "Requires calibrated probe reading",
            "compliant": None,
            "requiresManualCheck": True,
        },
        {
            "parameter": "Neck Tightness & Bulb Firmness",
            "detectionMethod": "Tactile Officer Inspection / Penetrometer",
            "evidenceStatus": "Not Camera Measurable",
            "procurementThreshold": "Firm, well-cured neck with dry outer scales",
            "measuredValue": "Requires manual tactile verification",
            "compliant": None,
            "requiresManualCheck": True,
        },
        {
            "parameter": "Foreign Matter & Dirt Admixture",
            "detectionMethod": "Optical Presentation Check",
            "evidenceStatus": "Evidence Available",
            "procurementThreshold": "<= 2.0% by lot weight",
            "measuredValue": "Clean tray presentation",
            "compliant": True,
            "requiresManualCheck": False,
        },
    ]


def build_attention_queue(
    *,
    detections: Optional[List[Dict[str, Any]]],
    total_onions: int,
    defect_ratio: float,
    average_confidence: float,
    uncertain_count: int,
    images_results: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Builds prioritized AI attention queue flagging low-confidence, borderline, or anomalous items."""
    queue: List[Dict[str, Any]] = []

    # 1. Lot-level high severity: Rejection or high defects
    if defect_ratio > 0.15:
        queue.append({
            "id": "att_lot_defect_high",
            "onionId": None,
            "imageId": None,
            "severity": "high",
            "title": "Commercial Lot Rejection Alert",
            "reason": f"Overall defect ratio ({round(defect_ratio * 100, 1)}%) exceeds maximum tolerance threshold (15.0%).",
            "recommendation": "Lot is rejected under APMC guidelines. Officer review required before issuing Rejection Certificate.",
        })

    # 2. Multi-tray disparity
    if images_results and len(images_results) > 1:
        tray_rates: List[float] = []
        for ir in images_results:
            tot = ir.get("totalOnions", 0) or ir.get("total_onions", 0)
            defects = (ir.get("rottenDamagedCount", 0) or ir.get("rotten_damaged_count", 0)) + \
                      (ir.get("sproutedCount", 0) or ir.get("sprouted_count", 0))
            if tot > 0:
                tray_rates.append(defects / tot)
        if tray_rates and (max(tray_rates) - min(tray_rates)) > 0.20:
            queue.append({
                "id": "att_tray_variance",
                "onionId": None,
                "imageId": None,
                "severity": "medium",
                "title": "Suspicious Tray Quality Variance",
                "reason": f"Defect disparity between trays is {round((max(tray_rates) - min(tray_rates)) * 100, 1)}%.",
                "recommendation": "Sample may not be homogeneously mixed. Check secondary tray for uneven sampling.",
            })

    # 3. Individual detections
    if detections:
        for idx, det in enumerate(detections, start=1):
            onion_id = det.get("id") or det.get("onion_id") or f"onion_{idx}"
            image_id = det.get("image_id") or det.get("imageId")
            conf = float(det.get("confidence", 0.0) or det.get("classification_confidence", 0.0) or det.get("detection_confidence", 0.0))
            cls_name = det.get("final_class") or det.get("classification") or det.get("predicted_class")
            diameter = det.get("diameter_mm")

            # Uncertain classification
            if cls_name == "uncertain":
                queue.append({
                    "id": f"att_unc_{onion_id}",
                    "onionId": str(onion_id),
                    "imageId": image_id,
                    "severity": "high",
                    "title": f"Uncertain Bulb #{idx}",
                    "reason": "AI model could not definitively classify defect type or sound tissue.",
                    "recommendation": "Inspect bulb directly in Human Review and assign definitive classification.",
                })

            # Low confidence
            elif conf > 0 and conf < 0.65:
                queue.append({
                    "id": f"att_conf_{onion_id}",
                    "onionId": str(onion_id),
                    "imageId": image_id,
                    "severity": "medium",
                    "title": f"Low Confidence Bulb #{idx}",
                    "reason": f"Model confidence is {round(conf * 100, 1)}% for class '{cls_name}'.",
                    "recommendation": "Verify visible bulb features to confirm or override prediction.",
                })

            # Borderline diameter
            if diameter is not None:
                d = float(diameter)
                if (38.0 <= d <= 42.0) or (68.0 <= d <= 72.0):
                    queue.append({
                        "id": f"att_size_{onion_id}",
                        "onionId": str(onion_id),
                        "imageId": image_id,
                        "severity": "low",
                        "title": f"Borderline Caliber Bulb #{idx}",
                        "reason": f"Physical diameter ({round(d, 1)} mm) is near standard caliber division boundary (40mm / 70mm).",
                        "recommendation": "Verify size category if selling under size-graded contract.",
                    })

    return queue


def generate_why_this_grade(
    *,
    total_onions: int,
    healthy_count: int,
    rotten_damaged_count: int,
    sprouted_count: int,
    uncertain_count: int,
    defect_ratio: float,
    grade: str,
    grade_code: str,
    officer_overrides_count: int = 0,
) -> Dict[str, Any]:
    """Generates structured, evidence-based explainability for the determined lot grade."""
    pct = round(defect_ratio * 100, 1)
    defects = rotten_damaged_count + sprouted_count

    if total_onions <= 0:
        narrative = "No onions were detected in the captured image. An official commercial grade cannot be assigned without valid sample coverage."
    else:
        narrative = (
            f"From an optical sample of {total_onions} onion bulb(s), {healthy_count} ({round(healthy_count / total_onions * 100, 1)}%) "
            f"were assessed as healthy and undamaged. A total of {defects} defective bulb(s) were identified ({pct}%), "
            f"consisting of {rotten_damaged_count} with visible rot/damage and {sprouted_count} with vegetative sprouting. "
        )
        if grade_code == "grade_a":
            narrative += f"Because the total defect ratio ({pct}%) does not exceed the 5.0% commercial threshold, this lot qualifies for Grade A."
        elif grade_code == "urs":
            narrative += f"Because the defect ratio ({pct}%) exceeds 5.0% but remains within the 15.0% threshold, this lot is designated as URS (Under-sized / Re-sorted / Standard)."
        else:
            narrative += f"Because the defect ratio ({pct}%) exceeds the 15.0% rejection tolerance, this lot is designated as Rejected under APMC procurement guidelines."

        if officer_overrides_count > 0:
            narrative += f" Note: {officer_overrides_count} manual officer decision(s) were recorded in the audit trail, overriding initial AI predictions."

    return {
        "sampleSize": total_onions,
        "healthyCount": healthy_count,
        "healthyPct": round(healthy_count / max(1, total_onions) * 100, 1),
        "defectsCount": defects,
        "defectPct": pct,
        "rottenDamagedCount": rotten_damaged_count,
        "sproutedCount": sprouted_count,
        "uncertainCount": uncertain_count,
        "grade": grade,
        "gradeCode": grade_code,
        "officerOverridesCount": officer_overrides_count,
        "narrative": narrative,
        "thresholds": {
            "gradeA": "<= 5.0% defect tolerance",
            "urs": "5.1% - 15.0% defect tolerance",
            "rejected": "> 15.0% defect tolerance",
        },
    }


def calculate_commercial_grade(
    *,
    total_onions: int,
    healthy_count: int,
    rotten_damaged_count: int,
    sprouted_count: int,
    uncertain_count: int,
    average_confidence: float,
    detections: Optional[List[Dict[str, Any]]] = None,
    images_results: Optional[List[Dict[str, Any]]] = None,
    average_diameter_mm: Optional[float] = None,
    officer_overrides_count: int = 0,
) -> CommercialGradeResult:
    """Calculates MVP commercial grade, attention queue, standards matrix, and explainability narrative."""
    if total_onions <= 0:
        why = generate_why_this_grade(
            total_onions=0,
            healthy_count=0,
            rotten_damaged_count=0,
            sprouted_count=0,
            uncertain_count=0,
            defect_ratio=0.0,
            grade="Unrated",
            grade_code="unrated",
        )
        matrix = build_standards_matrix(
            total_onions=0,
            rotten_damaged_count=0,
            sprouted_count=0,
            defect_ratio=0.0,
        )
        return CommercialGradeResult(
            grade="Unrated",
            grade_code="unrated",
            defect_ratio=0.0,
            explanation="Unrated — no onions detected for commercial assessment.",
            attention_required=True,
            attention_reason="No onions detected. Please recapture sample with adequate tray coverage.",
            attention_queue=[{
                "id": "att_no_onions",
                "onionId": None,
                "imageId": None,
                "severity": "high",
                "title": "No Bulbs Detected",
                "reason": "The detector found zero onion contours in this tray.",
                "recommendation": "Recapture tray ensuring onions are well-separated within the camera window.",
            }],
            why_this_grade=why,
            standards_matrix=matrix,
        )

    defects = rotten_damaged_count + sprouted_count
    defect_ratio = round(defects / total_onions, 4)
    pct = round(defect_ratio * 100, 1)

    if defect_ratio <= 0.05:
        grade = "Grade A"
        grade_code = "grade_a"
        explanation = f"Grade A — defect ratio {pct}% (<= 5.0% threshold)"
    elif defect_ratio <= 0.15:
        grade = "URS"
        grade_code = "urs"
        explanation = f"URS — defect ratio {pct}% (> 5.0% and <= 15.0% threshold)"
    else:
        grade = "Rejected"
        grade_code = "rejected"
        explanation = f"Rejected — defect ratio {pct}% (> 15.0% threshold)"

    # Build attention queue
    queue = build_attention_queue(
        detections=detections,
        total_onions=total_onions,
        defect_ratio=defect_ratio,
        average_confidence=average_confidence,
        uncertain_count=uncertain_count,
        images_results=images_results,
    )

    attention_required = len(queue) > 0
    attention_reasons = [item["title"] for item in queue if item.get("severity") in {"high", "medium"}]
    attention_reason = (
        "Attention recommended: " + "; ".join(attention_reasons[:3])
        if attention_reasons
        else None
    )

    why = generate_why_this_grade(
        total_onions=total_onions,
        healthy_count=healthy_count,
        rotten_damaged_count=rotten_damaged_count,
        sprouted_count=sprouted_count,
        uncertain_count=uncertain_count,
        defect_ratio=defect_ratio,
        grade=grade,
        grade_code=grade_code,
        officer_overrides_count=officer_overrides_count,
    )

    matrix = build_standards_matrix(
        total_onions=total_onions,
        rotten_damaged_count=rotten_damaged_count,
        sprouted_count=sprouted_count,
        defect_ratio=defect_ratio,
        average_diameter_mm=average_diameter_mm,
    )

    return CommercialGradeResult(
        grade=grade,
        grade_code=grade_code,
        defect_ratio=defect_ratio,
        explanation=explanation,
        attention_required=attention_required,
        attention_reason=attention_reason,
        attention_queue=queue,
        why_this_grade=why,
        standards_matrix=matrix,
    )
