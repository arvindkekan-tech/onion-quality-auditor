from pydantic import BaseModel, Field


class QualityCheckItem(BaseModel):
    key: str
    label: str
    score: float
    passed: bool
    explanation: str


class ImageQualityResult(BaseModel):
    imageId: str
    passed: bool
    issues: list[str]
    score: float | None = None
    checks: list[QualityCheckItem] | None = None


class AnalysisStatusResponse(BaseModel):
    inspectionId: str
    status: str
    progress: float | None = Field(default=None, ge=0, le=100)
    message: str | None = None


class DefectItem(BaseModel):
    label: str
    count: int
    category: str | None = None


class ImageAnalysisSummary(BaseModel):
    imageId: str
    filename: str | None = None
    url: str | None = None
    annotatedImageUrl: str | None = None
    totalOnions: int = 0
    healthyCount: int = 0
    rottenDamagedCount: int = 0
    sproutedCount: int = 0
    uncertainCount: int = 0


class InspectionResult(BaseModel):
    inspectionId: str
    grade: str
    confidence: float
    defects: list[DefectItem]
    summary: str
    analyzedAt: str
    totalOnions: int | None = None
    modelName: str | None = None
    classification: str | None = None
    healthyCount: int | None = None
    rottenDamagedCount: int | None = None
    sproutedCount: int | None = None
    uncertainCount: int | None = None
    annotatedImageUrl: str | None = None
    annotatedImagePath: str | None = None
    sizeEstimation: dict[str, object] | None = None
    detections: list[dict[str, object]] | None = None
    gradeExplanation: str | None = None
    attentionRequired: bool = False
    attentionReason: str | None = None
    imagesResults: list[ImageAnalysisSummary] | None = None
    aiAssessment: dict[str, object] | None = None
    officerAssessment: dict[str, object] | None = None
    attentionQueue: list[dict[str, object]] | None = None
    whyThisGrade: dict[str, object] | None = None
    standardsMatrix: list[dict[str, object]] | None = None


class OnionDecisionInput(BaseModel):
    onionId: str
    imageId: str | None = None
    aiClass: str
    officerClass: str
    finalClass: str | None = None
    aiSize: str | None = None
    officerSize: str | None = None
    finalSize: str | None = None
    reason: str | None = None
    officerName: str | None = None


class OnionDecisionResponse(BaseModel):
    id: str
    inspectionId: str
    onionId: str
    imageId: str | None = None
    aiClass: str
    officerClass: str
    finalClass: str
    aiSize: str | None = None
    officerSize: str | None = None
    finalSize: str | None = None
    reason: str | None = None
    officerName: str | None = None
    createdAt: str


class ReviewInput(BaseModel):
    approved: bool
    notes: str | None = None
    overrideGrade: str | None = None
    onionDecisions: list[OnionDecisionInput] | None = None


class ReviewResponse(BaseModel):
    inspectionId: str
    certificateId: str | None = None
    approved: bool
    notes: str | None = None
    overrideGrade: str | None = None
    overrideCount: int = 0
    finalGrade: str | None = None


class RecalculateRequest(BaseModel):
    onionDecisions: list[OnionDecisionInput]


class RecalculateResponse(BaseModel):
    totalOnions: int
    healthyCount: int
    rottenDamagedCount: int
    sproutedCount: int
    uncertainCount: int
    defectRatio: float
    healthyPct: float
    rottenPct: float
    sproutedPct: float
    uncertainPct: float
    grade: str
    gradeExplanation: str
    overrideCount: int
    whyThisGrade: dict[str, object] | None = None
    standardsMatrix: list[dict[str, object]] | None = None


class ReviewRequestInput(BaseModel):
    farmerName: str
    phoneNumber: str | None = None
    reasonCategory: str
    comments: str | None = None


class ReviewRequestResponse(BaseModel):
    id: str
    inspectionId: str
    farmerName: str
    reasonCategory: str
    status: str
    createdAt: str
    message: str | None = None


class AdaptiveInsight(BaseModel):
    hasAdaptiveInsight: bool
    similarCasesCount: int = 0
    correctedCount: int = 0
    fromClass: str | None = None
    toClass: str | None = None
    insightText: str | None = None
    recommendation: str | None = None
    commonReasons: list[str] | None = None
