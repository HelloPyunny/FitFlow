from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
from app.db import get_db
from app.db.models import EventLog, UserMetric, UserProfile, Workout, WorkoutStep, FatiguePrediction
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.schemas.workout import WorkoutResponse
from app.core.enums import TargetWorkout
from app.core.exercises import EXERCISES_BY_BODY_PART

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def calculate_acwr(user_id: int, target_date: datetime, db: Session) -> float:
    """Calculate Acute:Chronic Workload Ratio (ACWR)
    
    ACWR = Acute workload (last 7 days) / Chronic workload (last 28 days)
    - ACWR < 0.8: Under-training
    - 0.8 <= ACWR <= 1.3: Optimal
    - ACWR > 1.5: High injury risk (overtraining)
    """
    # Calculate date ranges
    target_date_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    acute_end = target_date_start - timedelta(days=1)  # Yesterday
    acute_start = acute_end - timedelta(days=6)  # Last 7 days
    chronic_start = acute_end - timedelta(days=27)  # Last 28 days
    
    # Calculate acute workload (last 7 days)
    acute_logs = db.query(EventLog).filter(
        EventLog.user_id == user_id,
        EventLog.logged_at >= acute_start,
        EventLog.logged_at <= acute_end
    ).all()
    
    acute_volume = sum(log.reps * log.weight for log in acute_logs)
    
    # Calculate chronic workload (last 28 days)
    chronic_logs = db.query(EventLog).filter(
        EventLog.user_id == user_id,
        EventLog.logged_at >= chronic_start,
        EventLog.logged_at <= acute_end
    ).all()
    
    chronic_volume = sum(log.reps * log.weight for log in chronic_logs)
    
    # Calculate ACWR
    if chronic_volume == 0:
        return 0.0  # No training history
    
    acwr = acute_volume / chronic_volume if chronic_volume > 0 else 0.0
    return acwr


def calculate_recent_fatigue(user_id: int, target_date: datetime, db: Session) -> float:
    """Calculate average RPE from recent workouts (last 7 days) as fatigue indicator"""
    target_date_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = target_date_start - timedelta(days=7)
    end_date = target_date_start - timedelta(days=1)
    
    recent_logs = db.query(EventLog).filter(
        EventLog.user_id == user_id,
        EventLog.logged_at >= start_date,
        EventLog.logged_at <= end_date,
        EventLog.rpe.isnot(None)
    ).all()
    
    if not recent_logs:
        return 5.0  # Default moderate fatigue
    
    avg_rpe = sum(log.rpe for log in recent_logs if log.rpe) / len(recent_logs)
    return avg_rpe


def predict_success_rate(
    energy_level: Optional[int],
    sleep_hours: Optional[float],
    recent_fatigue: float,
    acwr: float
) -> float:
    """Predict workout success rate (0.0 to 1.0) based on condition and history"""
    base_rate = 0.7  # Base 70% success rate
    
    # Energy level impact (1-10 scale)
    if energy_level:
        energy_factor = (energy_level - 5) * 0.05  # +5% per point above 5
        base_rate += energy_factor
    
    # Sleep impact
    if sleep_hours:
        if sleep_hours >= 7 and sleep_hours <= 9:
            base_rate += 0.1  # Optimal sleep
        elif sleep_hours < 6:
            base_rate -= 0.15  # Poor sleep
        elif sleep_hours > 10:
            base_rate -= 0.05  # Oversleeping
    
    # Fatigue impact (higher RPE = more fatigue = lower success)
    fatigue_factor = (recent_fatigue - 6.0) * -0.05  # -5% per RPE point above 6
    base_rate += fatigue_factor
    
    # ACWR impact (overtraining = lower success)
    if acwr > 1.5:
        base_rate -= 0.2  # High overtraining risk
    elif acwr > 1.3:
        base_rate -= 0.1  # Moderate overtraining risk
    elif acwr < 0.8:
        base_rate -= 0.05  # Under-training
    
    # Clamp between 0.0 and 1.0
    return max(0.0, min(1.0, base_rate))


def predict_fatigue(
    energy_level: Optional[int],
    sleep_hours: Optional[float],
    recent_fatigue: float,
    acwr: float,
    target_workout_volume: float  # Estimated volume for recommended workout
) -> float:
    """Predict fatigue level (1.0 to 10.0) after recommended workout"""
    base_fatigue = recent_fatigue  # Start from recent fatigue level
    
    # Energy level impact
    if energy_level:
        energy_impact = (5 - energy_level) * 0.3  # Lower energy = higher fatigue
        base_fatigue += energy_impact
    
    # Sleep impact
    if sleep_hours:
        if sleep_hours < 6:
            base_fatigue += 1.0  # Poor sleep increases fatigue
        elif sleep_hours >= 7 and sleep_hours <= 9:
            base_fatigue -= 0.5  # Good sleep reduces fatigue
    
    # ACWR impact (overtraining = higher fatigue)
    if acwr > 1.5:
        base_fatigue += 1.5  # High overtraining
    elif acwr > 1.3:
        base_fatigue += 0.8  # Moderate overtraining
    
    # Workout volume impact (estimated)
    # Higher volume = higher fatigue (simplified)
    volume_impact = target_workout_volume / 1000.0  # Normalize
    base_fatigue += volume_impact * 0.5
    
    # Clamp between 1.0 and 10.0
    return max(1.0, min(10.0, base_fatigue))


def generate_warnings(
    acwr: float,
    recent_fatigue: float,
    energy_level: Optional[int],
    sleep_hours: Optional[float],
    predicted_fatigue: float
) -> List[str]:
    """Generate warnings based on condition and predictions"""
    warnings = []
    
    # ACWR warnings
    if acwr > 1.5:
        warnings.append("⚠️ High overtraining risk detected (ACWR > 1.5). Consider reducing volume or taking a rest day.")
    elif acwr > 1.3:
        warnings.append("⚠️ Moderate overtraining risk (ACWR > 1.3). Monitor your recovery.")
    elif acwr < 0.8 and acwr > 0:
        warnings.append("ℹ️ Low training volume detected. Consider increasing intensity gradually.")
    
    # Fatigue warnings
    if recent_fatigue > 8.0:
        warnings.append("⚠️ High recent fatigue detected. Consider a lighter workout or rest day.")
    
    # Energy level warnings
    if energy_level and energy_level < 4:
        warnings.append("⚠️ Low energy level. Consider reducing workout intensity.")
    
    # Sleep warnings
    if sleep_hours and sleep_hours < 6:
        warnings.append("⚠️ Insufficient sleep detected. Recovery may be compromised.")
    
    # Predicted fatigue warnings
    if predicted_fatigue > 8.5:
        warnings.append("⚠️ Predicted high fatigue after workout. Consider reducing volume.")
    
    return warnings


def select_workout_for_targets(
    target_workouts: Optional[List[str]],
    db: Session
) -> Optional[Workout]:
    """Select or create a workout routine based on target body parts"""
    if not target_workouts or len(target_workouts) == 0:
        return None
    
    # Try to find existing workout matching targets
    # For now, we'll create a dynamic workout based on target_workouts
    # In the future, this could match against pre-defined workouts
    
    # For MVP, return None (will generate recommendation without Workout object)
    # Or create a simple workout on-the-fly
    return None


def get_exercise_history(
    user_id: int,
    exercise_name: str,
    db: Session,
    days_back: int = 30
) -> List[EventLog]:
    """Get user's historical data for a specific exercise"""
    from datetime import timedelta
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)
    
    logs = db.query(EventLog).filter(
        EventLog.user_id == user_id,
        EventLog.exercise_name == exercise_name,
        EventLog.logged_at >= start_date,
        EventLog.logged_at <= end_date
    ).order_by(EventLog.logged_at.desc()).all()
    
    return logs


def recommend_weight_and_sets(
    user_id: int,
    exercise_name: str,
    target_reps: int,
    energy_level: Optional[int],
    db: Session
) -> tuple[Optional[float], int]:
    """Recommend weight and number of sets based on user's history"""
    history = get_exercise_history(user_id, exercise_name, db)
    
    if not history:
        # No history - return None for weight (user will input)
        return None, 3  # Default 3 sets
    
    # Get most recent weight for similar rep range (±2 reps)
    recent_weights = []
    for log in history[:10]:  # Check last 10 sessions
        if abs(log.reps - target_reps) <= 2:
            recent_weights.append(log.weight)
    
    if recent_weights:
        # Use average of recent weights for similar rep range
        recommended_weight = sum(recent_weights) / len(recent_weights)
        
        # Adjust based on energy level
        if energy_level:
            if energy_level >= 8:
                # High energy - can go slightly heavier
                recommended_weight *= 1.05
            elif energy_level <= 4:
                # Low energy - reduce weight
                recommended_weight *= 0.95
        
        # Round to nearest 2.5kg (common gym plate increment)
        recommended_weight = round(recommended_weight / 2.5) * 2.5
    else:
        # No similar rep range found - use most recent weight regardless of reps
        most_recent = history[0]
        recommended_weight = most_recent.weight
        
        # Adjust for rep difference (1RM estimation: weight * (1 + reps/30))
        if target_reps != most_recent.reps:
            # Rough estimation: if doing more reps, reduce weight; fewer reps, increase weight
            rep_diff = target_reps - most_recent.reps
            weight_adjustment = rep_diff * 0.02  # 2% per rep difference
            recommended_weight *= (1 - weight_adjustment)
        
        # Adjust based on energy level
        if energy_level:
            if energy_level >= 8:
                recommended_weight *= 1.05
            elif energy_level <= 4:
                recommended_weight *= 0.95
        
        recommended_weight = round(recommended_weight / 2.5) * 2.5
    
    # Determine number of sets based on history
    # Count average sets per exercise in recent history
    recent_sessions = {}
    for log in history[:20]:  # Check last 20 logs
        session_date = log.logged_at.date()
        if session_date not in recent_sessions:
            recent_sessions[session_date] = set()
        recent_sessions[session_date].add(log.set_number)
    
    if recent_sessions:
        avg_sets = sum(len(sets) for sets in recent_sessions.values()) / len(recent_sessions)
        recommended_sets = max(2, min(5, int(round(avg_sets))))
    else:
        recommended_sets = 3  # Default
    
    # Adjust sets based on energy level
    if energy_level:
        if energy_level >= 7:
            recommended_sets = min(5, recommended_sets + 1)
        elif energy_level <= 4:
            recommended_sets = max(2, recommended_sets - 1)
    
    return recommended_weight, recommended_sets


def create_dynamic_workout(
    user_id: int,
    target_workouts: List[str],
    available_time: Optional[int],
    energy_level: Optional[int],
    db: Session
) -> Workout:
    """Create a dynamic workout routine based on target body parts and conditions"""
    from app.schemas.workout import WorkoutStepCreate
    
    # Determine workout intensity based on energy and available time
    if energy_level and energy_level >= 7:
        base_reps_per_set = 10
    elif energy_level and energy_level >= 5:
        base_reps_per_set = 10
    else:
        base_reps_per_set = 8
    
    # Select exercises for each target body part
    steps = []
    order = 1
    
    for target_str in target_workouts:
        try:
            target = TargetWorkout(target_str)
            exercises = EXERCISES_BY_BODY_PART.get(target, [])
            
            # Select 2-3 exercises per body part
            num_exercises = min(3, len(exercises))
            if num_exercises > 0:
                selected_exercises = exercises[:num_exercises]
                
                for exercise_name in selected_exercises:
                    # Get recommended weight and sets from history
                    recommended_weight, recommended_sets = recommend_weight_and_sets(
                        user_id,
                        exercise_name,
                        base_reps_per_set,
                        energy_level,
                        db
                    )
                    
                    # Adjust sets based on available time
                    if available_time and available_time < 45:
                        recommended_sets = max(2, recommended_sets - 1)
                    
                    step = WorkoutStepCreate(
                        exercise_name=exercise_name,
                        target_sets=recommended_sets,
                        target_reps=base_reps_per_set,
                        target_weight=recommended_weight,  # Now includes recommended weight
                        order=order
                    )
                    steps.append(step)
                    order += 1
        except ValueError:
            # Invalid target workout, skip
            continue
    
    # Create workout
    workout_name = f"{', '.join(target_workouts).title()} Workout"
    workout_description = f"Recommended workout targeting: {', '.join(target_workouts)}"
    
    workout_create = {
        "name": workout_name,
        "description": workout_description,
        "steps": steps
    }
    
    # Create workout in database
    db_workout = Workout(
        name=workout_name,
        description=workout_description
    )
    db.add(db_workout)
    db.flush()
    
    # Create steps
    for step_data in steps:
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
    
    return db_workout


@router.post("", response_model=RecommendationResponse)
def get_recommendation(
    request: RecommendationRequest,
    db: Session = Depends(get_db)
):
    """Get workout recommendation based on user condition and history"""
    
    # Parse target_workout from request if available
    # Note: RecommendationRequest doesn't have target_workout, but we can get it from UserMetric
    target_date = request.date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get user's metric for this date (to get target_workout)
    user_metric = db.query(UserMetric).filter(
        UserMetric.user_id == request.user_id,
        func.date(UserMetric.date) == target_date.date()
    ).first()
    
    # Get target_workouts from request or user_metric
    target_workouts = request.target_workout
    if not target_workouts and user_metric and user_metric.target_workout:
        if isinstance(user_metric.target_workout, list):
            target_workouts = user_metric.target_workout
        else:
            target_workouts = [user_metric.target_workout] if user_metric.target_workout else None
    
    # Use request data or user_metric data
    energy_level = request.energy_level or (user_metric.energy_level if user_metric else None)
    sleep_hours = request.sleep_hours or (user_metric.sleep_hours if user_metric else None)
    available_time = request.available_time or (user_metric.available_time if user_metric else None)
    
    # Calculate metrics
    acwr = calculate_acwr(request.user_id, target_date, db)
    recent_fatigue = calculate_recent_fatigue(request.user_id, target_date, db)
    
    # Generate or select workout
    recommended_workout = None
    if target_workouts and len(target_workouts) > 0:
        # Try to find existing workout first
        existing_workout = select_workout_for_targets(target_workouts, db)
        if existing_workout:
            recommended_workout = existing_workout
        else:
            # Create dynamic workout
            recommended_workout = create_dynamic_workout(
                request.user_id,
                target_workouts,
                available_time,
                energy_level,
                db
            )
    
    # Estimate workout volume for fatigue prediction
    estimated_volume = 0.0
    if recommended_workout and recommended_workout.steps:
        # Rough estimate: sets * reps * average_weight (assume 50kg average)
        for step in recommended_workout.steps:
            estimated_volume += step.target_sets * (step.target_reps or 10) * 50.0
    
    # Predict success rate and fatigue
    predicted_success_rate = predict_success_rate(
        energy_level,
        sleep_hours,
        recent_fatigue,
        acwr
    )
    
    predicted_fatigue = predict_fatigue(
        energy_level,
        sleep_hours,
        recent_fatigue,
        acwr,
        estimated_volume
    )
    
    # Generate warnings
    warnings = generate_warnings(
        acwr,
        recent_fatigue,
        energy_level,
        sleep_hours,
        predicted_fatigue
    )
    
    # Save prediction to FatiguePrediction table
    db_prediction = FatiguePrediction(
        user_id=request.user_id,
        date=target_date,
        predicted_fatigue=predicted_fatigue,
        predicted_success_rate=predicted_success_rate,
        acwr=acwr,
        warning_level="high" if len(warnings) > 2 else ("medium" if len(warnings) > 0 else "low")
    )
    db.add(db_prediction)
    db.commit()
    
    # Convert Workout to WorkoutResponse
    workout_response = None
    if recommended_workout:
        from app.schemas.workout import WorkoutStepResponse
        workout_response = WorkoutResponse(
            id=recommended_workout.id,
            name=recommended_workout.name,
            description=recommended_workout.description,
            created_at=recommended_workout.created_at,
            steps=[
                WorkoutStepResponse(
                    id=step.id,
                    workout_id=step.workout_id,
                    exercise_name=step.exercise_name,
                    target_sets=step.target_sets,
                    target_reps=step.target_reps,
                    target_weight=step.target_weight,
                    order=step.order
                )
                for step in recommended_workout.steps
            ]
        )
    
    return RecommendationResponse(
        recommended_workout=workout_response,
        predicted_success_rate=predicted_success_rate,
        predicted_fatigue=predicted_fatigue,
        warnings=warnings
    )
