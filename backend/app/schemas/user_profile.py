from pydantic import BaseModel, Field
from typing import Optional
from app.db.models.user_profile import Sex, ExperienceLevel, PrimaryGoal, UnitSystem

class UserProfileCreate(BaseModel):
    user_id: int
    height: float = Field(..., ge=100, le=250, description="Height in cm (100-250)")
    weight: float = Field(..., ge=30, le=250, description="Weight in kg (30-250)")
    sex: Sex
    age: int = Field(..., ge=10, le=100, description="Age in years (10-100)")
    unit_system: UnitSystem = UnitSystem.METRIC
    experience_level: ExperienceLevel
    primary_goal: PrimaryGoal
    weekly_frequency: int = Field(..., ge=1, le=7, description="Weekly workout frequency (1-7)")

class UserProfileUpdate(BaseModel):
    height: Optional[float] = Field(None, ge=100, le=250)
    weight: Optional[float] = Field(None, ge=30, le=250)
    sex: Optional[Sex] = None
    age: Optional[int] = Field(None, ge=10, le=100)
    unit_system: Optional[UnitSystem] = None
    experience_level: Optional[ExperienceLevel] = None
    primary_goal: Optional[PrimaryGoal] = None
    weekly_frequency: Optional[int] = Field(None, ge=1, le=7)

class UserProfileResponse(BaseModel):
    id: int
    user_id: int
    height: float
    weight: float
    sex: Sex
    age: int
    unit_system: UnitSystem
    experience_level: ExperienceLevel
    primary_goal: PrimaryGoal
    weekly_frequency: int
    created_at: Optional[str]
    updated_at: Optional[str]
    
    class Config:
        from_attributes = True
