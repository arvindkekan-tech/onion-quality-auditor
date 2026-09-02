from pydantic import BaseModel


class ImageUploadResponse(BaseModel):
    inspection_id: str
    filename: str
    content_type: str
    status: str


class DefectCounts(BaseModel):
    damaged: int
    rotted: int
    sprouted: int
    undersized: int


class AnalysisResponse(BaseModel):
    """Stable response shape for mock analysis now, and real ML later."""

    inspection_id: str
    status: str
    grade: str
    confidence: float
    defects: DefectCounts
    visual_quality_score: int
