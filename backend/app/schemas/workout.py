from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class WorkoutStepCreate(BaseModel):
    exercise_name: str
    target_sets: int
    target_reps: Optional[int] = None
    target_weight: Optional[float] = None
    order: int

class WorkoutCreate(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[WorkoutStepCreate]

class WorkoutResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    steps: List[dict]
    
    class Config:
        from_attributes = True
