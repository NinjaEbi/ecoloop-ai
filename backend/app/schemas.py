from typing import Any, Literal
from pydantic import BaseModel, Field

DeviceType = Literal['smartphone','laptop','tablet','television','monitor','keyboard','mouse','printer','other']

class AnalyzeResponse(BaseModel):
    device_type: DeviceType | None
    confidence: float = Field(ge=0, le=1)
    status: Literal['supported','unknown','unsupported','low_confidence','invalid_image']
    image_quality: dict[str, Any]
    findings: list[str]
    message: str

class AssessmentRequest(BaseModel):
    device_type: DeviceType
    recognition_status: str = 'manual'
    recognition_confidence: float = Field(default=0, ge=0, le=1)
    manual_assessment: bool = True
    image_path: str | None = None
    answers: dict[str, Any]
    findings: list[str] = []

class AssessmentResponse(BaseModel):
    id: int
    device_type: str
    condition: str
    condition_score: float
    assessment_confidence: float
    ecoscore: float
    ecoscore_band: str
    ecoscore_breakdown: dict[str, float]
    recommendation_scores: dict[str, float]
    recommended_action: str
    explanation: str
    stakeholder_category: str
    limitations: list[str]
