from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class FatiguePrediction(Base):
    """Fatigue prediction result (for ML model result storage)"""
    __tablename__ = "fatigue_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    predicted_fatigue = Column(Float, nullable=False)
    predicted_success_rate = Column(Float, nullable=True)
    acwr = Column(Float, nullable=True)  # Acute:Chronic Workload Ratio (1-10 scale)
    warning_level = Column(String, nullable=True)  # 'low', 'medium', 'high'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
