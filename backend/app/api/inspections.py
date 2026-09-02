import uuid

from fastapi import APIRouter, HTTPException

from app.schemas.inspection import InspectionCreate, InspectionResponse

router = APIRouter(prefix="/api/v1/inspections", tags=["Inspections"])

# Temporary store until a database is added later.
inspections: dict[str, InspectionResponse] = {}


@router.post("", response_model=InspectionResponse)
def create_inspection(payload: InspectionCreate) -> InspectionResponse:
    inspection = InspectionResponse(
        inspection_id=str(uuid.uuid4()),
        status="created",
        onion_variety=payload.onion_variety,
        batch_weight_kg=payload.batch_weight_kg,
        location=payload.location,
    )
    inspections[inspection.inspection_id] = inspection
    return inspection


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection(inspection_id: str) -> InspectionResponse:
    inspection = inspections.get(inspection_id)
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return inspection
