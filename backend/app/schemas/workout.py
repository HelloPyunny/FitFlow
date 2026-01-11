from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class WorkoutStepCreate(BaseModel):
    exercise_name: str
    target_sets: int
    target_reps: Optional[int] = None
    target_weight: Optional[float] = None
    order: int

class WorkoutStepUpdate(BaseModel):
    exercise_name: Optional[str] = None
    target_sets: Optional[int] = None
    target_reps: Optional[int] = None
    target_weight: Optional[float] = None
    order: Optional[int] = None

class WorkoutStepResponse(BaseModel):
    id: int
    workout_id: int
    exercise_name: str
    target_sets: int
    target_reps: Optional[int]
    target_weight: Optional[float]
    order: int
    
    class Config:
        from_attributes = True

class WorkoutCreate(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[WorkoutStepCreate]

class WorkoutUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[WorkoutStepCreate]] = None

class WorkoutResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    steps: List[WorkoutStepResponse] = []
    
    class Config:
        from_attributes = True
