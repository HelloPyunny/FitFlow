from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Workout(Base):
    """Workout routine definition"""
    __tablename__ = "workouts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    steps = relationship("WorkoutStep", back_populates="workout", cascade="all, delete-orphan")

class WorkoutStep(Base):
    """Workout step within routine (e.g. 3 sets of bench press)"""
    __tablename__ = "workout_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=False)
    exercise_name = Column(String, nullable=False)
    target_sets = Column(Integer, nullable=False)
    target_reps = Column(Integer, nullable=True)
    target_weight = Column(Float, nullable=True)
    order = Column(Integer, nullable=False)
    
    workout = relationship("Workout", back_populates="steps")
