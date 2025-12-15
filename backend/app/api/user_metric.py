from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from app.db import get_db
from app.db.models import UserMetric
from app.schemas.user_metric import UserMetricCreate, UserMetricResponse, UserMetricUpdate

router = APIRouter(prefix="/user-metrics", tags=["user-metrics"])

@router.post("", response_model=UserMetricResponse, status_code=201)
def create_user_metric(metric: UserMetricCreate, db: Session = Depends(get_db)):
    """Create a new user metric entry for a specific date"""
    # Ensure date is timezone-aware datetime
    if isinstance(metric.date, str):
        metric_date = datetime.fromisoformat(metric.date.replace('Z', '+00:00'))
    else:
        metric_date = metric.date
    
    # Check if entry already exists for this user and date (same day)
    # Compare only the date part, ignoring time
    existing = db.query(UserMetric).filter(
        UserMetric.user_id == metric.user_id,
        func.date(UserMetric.date) == metric_date.date()
    ).first()
    
    if existing:
        # Update existing metric instead of creating new one
        update_data = metric.model_dump(exclude_unset=True, exclude={'user_id', 'date'})
        for field, value in update_data.items():
            if value is not None:
                setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new metric with the provided date
    db_metric = UserMetric(
        user_id=metric.user_id,
        date=metric_date,
        sleep_hours=metric.sleep_hours,
        energy_level=metric.energy_level,
        available_time=metric.available_time,
        target_workout=metric.target_workout
    )
    db.add(db_metric)
    db.commit() # save to database
    db.refresh(db_metric)
    return db_metric

@router.get("/{user_id}", response_model=list[UserMetricResponse])
def get_user_metrics(user_id: int, db: Session = Depends(get_db)):
    """Get all user metrics for a specific user"""
    metrics = db.query(UserMetric).filter(UserMetric.user_id == user_id).order_by(UserMetric.date.desc()).all()
    return metrics

@router.get("/{user_id}/{date}", response_model=UserMetricResponse)
def get_user_metric_by_date(user_id: int, date: date, db: Session = Depends(get_db)):
    """Get user metric for a specific user and date"""
    metric = db.query(UserMetric).filter(
        UserMetric.user_id == user_id,
        func.date(UserMetric.date) == date
    ).first()
    
    if not metric:
        raise HTTPException(status_code=404, detail="User metric not found for this date")
    
    return metric

@router.put("/{user_id}/{date}", response_model=UserMetricResponse)
def update_user_metric(user_id: int, date: date, metric_update: UserMetricUpdate, db: Session = Depends(get_db)):
    """Update user metric for a specific user and date"""
    metric = db.query(UserMetric).filter(
        UserMetric.user_id == user_id,
        func.date(UserMetric.date) == date
    ).first()
    
    if not metric:
        raise HTTPException(status_code=404, detail="User metric not found for this date")
    
    # Update only provided fields
    update_data = metric_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(metric, field, value)
    
    db.commit()
    db.refresh(metric)
    return metric
