from sqlalchemy import Column, Integer, Float, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.db.database import Base

class UserMetric(Base):
    """User daily condition (sleep, energy, etc.)"""
    __tablename__ = "user_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    sleep_hours = Column(Float, nullable=True)
    energy_level = Column(Integer, nullable=True)
    available_time = Column(Integer, nullable=True)
    target_workout = Column(JSON, nullable=True) 
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
