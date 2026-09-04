from pydantic import BaseModel, Field


class InspectionCreate(BaseModel):
    variety: str = Field(min_length=1)
    weightKg: float = Field(gt=0)
    location: str = Field(min_length=1)


class InspectionResponse(BaseModel):
    id: str
    variety: str
    weightKg: float
    location: str
    createdAt: str
    status: str


class InspectionImageResponse(BaseModel):
    id: str
    url: str | None = None
    uploadedAt: str
