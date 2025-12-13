from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.workout import WorkoutResponse

class RecommendationRequest(BaseModel):
    user_id: int
    date: datetime
    sleep_hours: Optional[float] = None
    energy_level: Optional[int] = None
    available_time: Optional[int] = None

class RecommendationResponse(BaseModel):
    recommended_workout: Optional[WorkoutResponse]
    predicted_success_rate: Optional[float]
    predicted_fatigue: Optional[float]
    warnings: List[str] = []
