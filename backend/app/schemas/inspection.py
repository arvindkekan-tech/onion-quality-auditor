from pydantic import BaseModel


class InspectionCreate(BaseModel):
    onion_variety: str
    batch_weight_kg: float
    location: str


class InspectionResponse(BaseModel):
    inspection_id: str
    status: str
    onion_variety: str
    batch_weight_kg: float
    location: str
