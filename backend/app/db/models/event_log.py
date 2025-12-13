from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class EventLog(Base):
    """Set-level workout event log (core data)"""
    __tablename__ = "event_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)  # To be extended with authentication later
    workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=True)
    exercise_name = Column(String, nullable=False, index=True)
    set_number = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=False)
    weight = Column(Float, nullable=False)
    rpe = Column(Float, nullable=True)  # Rate of Perceived Exertion (1-10)
    completed = Column(Boolean, default=True)
    logged_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    workout = relationship("Workout")
