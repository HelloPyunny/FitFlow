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
    target_workout: Optional[List[str]] = None  # List of target body parts

class RecommendationResponse(BaseModel):
    recommended_workout: Optional[WorkoutResponse] = None
    predicted_success_rate: Optional[float] = None
    predicted_fatigue: Optional[float] = None
    warnings: List[str] = []
