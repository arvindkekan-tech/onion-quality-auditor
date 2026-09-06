"""Commercial MVP grading logic isolated from ML inference.

Implements decision thresholds for onion procurement:
- defect_ratio = (rotten_damaged + sprouted) / total_onions
- <= 5%: Grade A
- > 5% and <= 15%: URS (Under-sized / Re-sorted / Standard)
- > 15%: Rejected
- If total_onions == 0: Unrated
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CommercialGradeResult:
    grade: str
    grade_code: str
    defect_ratio: float
    explanation: str
    attention_required: bool
    attention_reason: str | None


def calculate_commercial_grade(
    *,
    total_onions: int,
    healthy_count: int,
    rotten_damaged_count: int,
    sprouted_count: int,
    uncertain_count: int,
    average_confidence: float,
) -> CommercialGradeResult:
    """Calculates MVP commercial grade according to defect ratio thresholds."""
    if total_onions <= 0:
        return CommercialGradeResult(
            grade="Unrated",
            grade_code="unrated",
            defect_ratio=0.0,
            explanation="Unrated — no onions detected for commercial assessment.",
            attention_required=True,
            attention_reason="No onions detected. Please recapture sample with adequate tray coverage.",
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

    # Attention flag: check if confidence is low (< 0.65) or uncertain ratio is elevated (> 15%)
    attention_required = False
    attention_reasons: list[str] = []
    if average_confidence < 0.65:
        attention_required = True
        attention_reasons.append(
            f"Low average model confidence ({round(average_confidence * 100, 1)}%)"
        )
    if total_onions > 0 and (uncertain_count / total_onions) > 0.15:
        attention_required = True
        attention_reasons.append(
            f"{uncertain_count} bulbs have uncertain classifications"
        )
    if grade_code == "rejected":
        attention_required = True
        attention_reasons.append("Commercial rejection threshold exceeded")

    attention_reason = (
        "Human attention recommended: " + "; ".join(attention_reasons)
        if attention_required
        else None
    )

    return CommercialGradeResult(
        grade=grade,
        grade_code=grade_code,
        defect_ratio=defect_ratio,
        explanation=explanation,
        attention_required=attention_required,
        attention_reason=attention_reason,
    )
