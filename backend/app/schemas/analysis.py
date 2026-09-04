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


class ReviewInput(BaseModel):
    approved: bool
    notes: str | None = None
    overrideGrade: str | None = None


class ReviewResponse(BaseModel):
    inspectionId: str
    certificateId: str
    approved: bool
    notes: str | None = None
