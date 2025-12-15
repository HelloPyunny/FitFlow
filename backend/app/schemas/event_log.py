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
    energy_level: Optional[int] = Field(None, ge=1, le=10)  # Energy level (1-10)
    completed: bool = True
    logged_at: Optional[datetime] = None  # If not provided, will use current time

class EventLogUpdate(BaseModel):
    exercise_name: Optional[str] = None
    set_number: Optional[int] = None
    reps: Optional[int] = None
    weight: Optional[float] = None
    rpe: Optional[float] = Field(None, ge=1, le=10)
    energy_level: Optional[int] = Field(None, ge=1, le=10)
    completed: Optional[bool] = None
    logged_at: Optional[datetime] = None

class EventLogResponse(BaseModel):
    id: int
    user_id: int
    workout_id: Optional[int]
    exercise_name: str
    set_number: int
    reps: int
    weight: float
    rpe: Optional[float]
    energy_level: Optional[int]
    completed: bool
    logged_at: datetime
    
    class Config:
        from_attributes = True
