from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db import get_db
from app.db.models import Workout, WorkoutStep
from app.schemas.workout import WorkoutCreate, WorkoutResponse, WorkoutStepCreate

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.post("", response_model=WorkoutResponse, status_code=201)
def create_workout(workout: WorkoutCreate, db: Session = Depends(get_db)):
    """Create a new workout routine with steps"""
    # Create workout
    db_workout = Workout(
        name=workout.name,
        description=workout.description
    )
    db.add(db_workout)
    db.flush()  # Flush to get workout.id without committing
    
    # Create workout steps
    for step_data in workout.steps:
        db_step = WorkoutStep(
            workout_id=db_workout.id,
            exercise_name=step_data.exercise_name,
            target_sets=step_data.target_sets,
            target_reps=step_data.target_reps,
            target_weight=step_data.target_weight,
            order=step_data.order
        )
        db.add(db_step)
    
    db.commit()
    db.refresh(db_workout)
    
    # Load steps for response
    db.refresh(db_workout)
    return db_workout


@router.get("", response_model=List[WorkoutResponse])
def get_workouts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all workout routines"""
    workouts = db.query(Workout).offset(skip).limit(limit).all()
    return workouts


@router.get("/{workout_id}", response_model=WorkoutResponse)
def get_workout(workout_id: int, db: Session = Depends(get_db)):
    """Get a specific workout routine by ID"""
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout


@router.put("/{workout_id}", response_model=WorkoutResponse)
def update_workout(workout_id: int, workout_update: WorkoutCreate, db: Session = Depends(get_db)):
    """Update a workout routine and its steps"""
    db_workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not db_workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    # Update workout basic info
    db_workout.name = workout_update.name
    db_workout.description = workout_update.description
    
    # Delete existing steps
    db.query(WorkoutStep).filter(WorkoutStep.workout_id == workout_id).delete()
    
    # Create new steps
    for step_data in workout_update.steps:
        db_step = WorkoutStep(
            workout_id=workout_id,
            exercise_name=step_data.exercise_name,
            target_sets=step_data.target_sets,
            target_reps=step_data.target_reps,
            target_weight=step_data.target_weight,
            order=step_data.order
        )
        db.add(db_step)
    
    db.commit()
    db.refresh(db_workout)
    return db_workout


@router.delete("/{workout_id}", status_code=204)
def delete_workout(workout_id: int, db: Session = Depends(get_db)):
    """Delete a workout routine (cascade deletes steps)"""
    db_workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not db_workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    db.delete(db_workout)
    db.commit()
    return None
