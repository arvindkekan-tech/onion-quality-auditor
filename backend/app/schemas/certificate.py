from pydantic import BaseModel, ConfigDict


class AuditEvent(BaseModel):
    event: str
    time: str


class QualityComposition(BaseModel):
    model_config = ConfigDict(exclude_none=True)

    totalOnions: int | None = None
    gradeAPercent: float | None = None
    ursPercent: float | None = None
    undersizedCount: int | None = None
    rottenDamagedCount: int | None = None
    sproutedCount: int | None = None


class Certificate(BaseModel):
    model_config = ConfigDict(exclude_none=True)

    id: str
    inspectionId: str
    grade: str
    issuedAt: str
    batchLabel: str
    qrToken: str
    inspectorName: str | None = None
    batchId: str | None = None
    procurementCentre: str | None = None
    specification: str | None = None
    sampleSize: int | None = None
    confidence: float | None = None
    defectSummary: str | None = None
    auditTimeline: list[AuditEvent] | None = None
    aiGrade: str | None = None
    officerGrade: str | None = None
    overrideCount: int = 0
    dualAssessment: dict[str, object] | None = None
    whyThisGrade: dict[str, object] | None = None
    standardsMatrix: list[dict[str, object]] | None = None
    qualityComposition: QualityComposition | None = None


class VerificationResult(BaseModel):
    model_config = ConfigDict(exclude_none=True)

    valid: bool
    message: str
    certificate: Certificate | None = None
    auditTimeline: list[AuditEvent] | None = None
    whyThisGrade: dict[str, object] | None = None
    standardsMatrix: list[dict[str, object]] | None = None
    qualityComposition: QualityComposition | None = None
    farmerTransparency: dict[str, object] | None = None
