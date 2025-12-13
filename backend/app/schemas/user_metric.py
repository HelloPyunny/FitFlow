from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from app.core.enums import TargetWorkout

class UserMetricCreate(BaseModel):
    user_id: int
    date: datetime
    sleep_hours: Optional[float] = None
    energy_level: Optional[int] = Field(None, ge=1, le=10)
    available_time: Optional[int] = None
    target_workout: Optional[List[TargetWorkout]] = None  # Can select multiple: ["back", "chest", ...]
    notes: Optional[str] = None

class UserMetricResponse(BaseModel):
    id: int
    user_id: int
    date: datetime
    sleep_hours: Optional[float]
    energy_level: Optional[int]
    available_time: Optional[int]
    target_workout: Optional[List[TargetWorkout]]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
