from typing import Any, Literal
from pydantic import BaseModel, Field

DeviceType = Literal[
    'smartphone',
    'laptop',
    'desktop',
    'desktop_computer',
    'tablet',
    'television',
    'monitor',
    'refrigerator',
    'washing_machine',
    'air_conditioner',
    'printer',
    'keyboard',
    'mouse',
    'router',
    'speaker',
    'other',
]


class AnalyzeResponse(BaseModel):
    device_type: DeviceType | None
    confidence: float = Field(ge=0, le=1)
    status: Literal[
        'supported', 'unknown', 'unsupported', 'low_confidence', 'invalid_image'
    ]
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
    session_id: str | None = None
    device_category: str | None = None


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
    recommendation_reasons: list[str] = []
    environmental_impact: dict[str, Any] = {}
    breakdown_details: dict[str, Any] = {}
    session_id: str | None = None
    device_category: str | None = None


class ChatMessage(BaseModel):
    role: Literal['user', 'assistant', 'system']
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    assessment_context: dict[str, Any] | None = None
    page_context: str | None = None


class ChatResponse(BaseModel):
    reply: str
    suggested_questions: list[str] = []
