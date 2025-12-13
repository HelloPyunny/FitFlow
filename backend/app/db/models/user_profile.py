from sqlalchemy import Column, Integer, Float, String, Enum as SQLEnum
from app.db.database import Base
import enum

class Sex(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"

class ExperienceLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class PrimaryGoal(str, enum.Enum):
    BULK = "bulk"
    CUT = "cut"
    LEAN_MASS = "lean_mass"
    WEIGHT_LOSS = "weight_loss"

class UnitSystem(str, enum.Enum):
    METRIC = "metric"  # cm, kg
    IMPERIAL = "imperial"  # inches, lb

class UserProfile(Base):
    """User profile for AI routine recommendations"""
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    
    # Basic Profile
    height = Column(Float, nullable=False)  # in cm (converted if imperial)
    weight = Column(Float, nullable=False)  # in kg (converted if imperial)
    sex = Column(SQLEnum(Sex), nullable=False)
    age = Column(Integer, nullable=False)
    unit_system = Column(SQLEnum(UnitSystem), default=UnitSystem.METRIC, nullable=False)
    
    # Training Background
    experience_level = Column(SQLEnum(ExperienceLevel), nullable=False)
    primary_goal = Column(SQLEnum(PrimaryGoal), nullable=False)
    weekly_frequency = Column(Integer, nullable=False)  # 1-7
    
    # Timestamps
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)
