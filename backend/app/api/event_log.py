from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db import get_db
from app.db.models import EventLog
from app.schemas.event_log import EventLogCreate, EventLogUpdate, EventLogResponse

router = APIRouter(prefix="/event-logs", tags=["event-logs"])

@router.post("", response_model=EventLogResponse, status_code=201)
def create_event_log(event_log: EventLogCreate, db: Session = Depends(get_db)):
    """Create a new event log entry (set-level workout record)"""
    # Handle logged_at - if provided, use it; otherwise use current time
    logged_at = event_log.logged_at if event_log.logged_at else datetime.now()
    
    # If logged_at is a datetime object, use it directly
    # If it's a string (from JSON), parse it
    if isinstance(logged_at, str):
        try:
            logged_at = datetime.fromisoformat(logged_at.replace('Z', '+00:00'))
        except ValueError:
            # Fallback to current time if parsing fails
            logged_at = datetime.now()
    
    db_event_log = EventLog(
        user_id=event_log.user_id,
        workout_id=event_log.workout_id,
        exercise_name=event_log.exercise_name,
        set_number=event_log.set_number,
        reps=event_log.reps,
        weight=event_log.weight,
        rpe=event_log.rpe,
        energy_level=event_log.energy_level,
        completed=event_log.completed,
        logged_at=logged_at
    )
    db.add(db_event_log)
    db.commit()
    db.refresh(db_event_log)
    return db_event_log

@router.get("/{user_id}", response_model=list[EventLogResponse])
def get_user_event_logs(user_id: int, db: Session = Depends(get_db)):
    """Get all event logs for a specific user"""
    event_logs = db.query(EventLog).filter(EventLog.user_id == user_id).order_by(EventLog.logged_at.desc()).all()
    return event_logs

@router.get("/{user_id}/{date}", response_model=list[EventLogResponse])
def get_user_event_logs_by_date(user_id: int, date: str, db: Session = Depends(get_db)):
    """Get event logs for a specific user and date (YYYY-MM-DD format)"""
    try:
        date_obj = datetime.fromisoformat(date + 'T00:00:00')
        next_day = datetime.fromisoformat(date + 'T23:59:59')
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    event_logs = db.query(EventLog).filter(
        EventLog.user_id == user_id,
        EventLog.logged_at >= date_obj,
        EventLog.logged_at <= next_day
    ).order_by(EventLog.logged_at.asc()).all()
    
    return event_logs

@router.put("/{event_log_id}", response_model=EventLogResponse)
def update_event_log(event_log_id: int, event_log_update: EventLogUpdate, db: Session = Depends(get_db)):
    """Update an existing event log entry"""
    db_event_log = db.query(EventLog).filter(EventLog.id == event_log_id).first()
    if not db_event_log:
        raise HTTPException(status_code=404, detail="Event log not found")
    
    # Update only provided fields
    update_data = event_log_update.model_dump(exclude_unset=True)
    
    # Handle logged_at if provided
    if 'logged_at' in update_data and update_data['logged_at']:
        logged_at = update_data['logged_at']
        if isinstance(logged_at, str):
            try:
                logged_at = datetime.fromisoformat(logged_at.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid logged_at format")
        update_data['logged_at'] = logged_at
    
    for field, value in update_data.items():
        setattr(db_event_log, field, value)
    
    db.commit()
    db.refresh(db_event_log)
    return db_event_log

@router.delete("/{event_log_id}", status_code=204)
def delete_event_log(event_log_id: int, db: Session = Depends(get_db)):
    """Delete an event log entry"""
    db_event_log = db.query(EventLog).filter(EventLog.id == event_log_id).first()
    if not db_event_log:
        raise HTTPException(status_code=404, detail="Event log not found")
    
    db.delete(db_event_log)
    db.commit()
    return None
