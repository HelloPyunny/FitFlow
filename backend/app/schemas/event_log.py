from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class EventLogCreate(BaseModel):
    user_id: int
    workout_id: Optional[int] = None
    exercise_name: str  # Can be selected from /exercises endpoint or custom input
    set_number: int
    reps: int
    weight: float
    rpe: Optional[float] = Field(None, ge=1, le=10)
    completed: bool = True

class EventLogResponse(BaseModel):
    id: int
    user_id: int
    workout_id: Optional[int]
    exercise_name: str
    set_number: int
    reps: int
    weight: float
    rpe: Optional[float]
    completed: bool
    logged_at: datetime
    
    class Config:
        from_attributes = True
