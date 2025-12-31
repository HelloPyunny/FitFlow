"""
Seed script for generating realistic workout data for ML model testing.

This script creates synthetic workout data following realistic patterns:
- Progressive overload over time
- Realistic exercise selection and weight progression
- Scenario-based variations (normal, overtraining, deload)
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
import json
import random
from typing import Dict

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import EventLog, UserMetric
from app.core.enums import TargetWorkout
from app.core.exercises import EXERCISES_BY_BODY_PART

# User ID to seed data for
# Option 1: Use Clerk user ID (will be automatically hashed to integer)
CLERK_USER_ID = "user_36mPo3a0bDaDqmAPSmmo0Uiglgz"  # Put your Clerk user ID here

# Option 2: Directly specify user_id (integer) - Set to None to use CLERK_USER_ID instead
DIRECT_USER_ID = None  # Set to an integer to skip hashing

# Delete existing data before seeding
# Set to True to delete all existing EventLog and UserMetric data for this user before seeding
DELETE_EXISTING_DATA = True  # Set to False to keep existing data (will create duplicates)

# Date range
START_DATE = datetime(2025, 1, 1)
END_DATE = datetime(2025, 12, 31)


def clerk_id_to_int(clerk_id: str) -> int:
    """Convert Clerk user ID to consistent integer (same as frontend logic)
    Matches the exact JavaScript logic: hash = ((hash << 5) - hash) + char; hash = hash & hash; Math.abs(hash)
    
    JavaScript's bitwise operations work on 32-bit signed integers, so we need to simulate that behavior.
    """
    h = 0
    for ch in clerk_id:
        # compute in uint32 space, then interpret as int32
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF  # (h<<5)-h == h*31
    # convert uint32 -> int32
    if h & 0x80000000:
        h -= 0x100000000
    
    # JavaScript Math.abs() equivalent
    result = abs(h)
    
    # Result should be within PostgreSQL INTEGER range
    return result


def load_scenario(scenario_name: str) -> Dict:
    """Load scenario JSON file"""
    scenario_path = Path(__file__).parent / "scenarios" / f"{scenario_name}.json"
    with open(scenario_path, 'r') as f:
        return json.load(f)


# Workout routine pattern: Chest+Triceps → Back+Biceps → Shoulders → Legs → Rest
ROUTINE_PATTERN = [
    (TargetWorkout.CHEST, TargetWorkout.TRICEPS),  # Day 1
    (TargetWorkout.BACK, TargetWorkout.BICEPS),     # Day 2
    (TargetWorkout.SHOULDERS, None),                # Day 3
    (TargetWorkout.LEGS, None),                     # Day 4
    None  # Rest day
]

# Exercise selection per body part
EXERCISE_COUNTS = {
    TargetWorkout.CHEST: 4,
    TargetWorkout.BACK: 4,
    TargetWorkout.SHOULDERS: 4,
    TargetWorkout.LEGS: 4,
    TargetWorkout.TRICEPS: 2,
    TargetWorkout.BICEPS: 2,
}

# Base weight reference (Bench Press 70-100kg range)
BASE_WEIGHTS = {
    "Bench Press": 85.0,  # Base reference
    "Incline Bench Press": 70.0,
    "Dumbbell Press": 35.0,  # Per dumbbell
    "Incline Dumbbell Press": 30.0,
    "Dips": 0.0,  # Bodyweight
    "Push-up": 0.0,
    "Cable Fly": 25.0,
    "Dumbbell Fly": 20.0,
    "Pec Deck Fly": 30.0,
    "Chest Press Machine": 60.0,
    "Lat Pulldown": 60.0,
    "Barbell Row": 80.0,
    "Dumbbell Row": 35.0,
    "Cable Row": 50.0,
    "Pull-up": 0.0,
    "T-Bar Row": 70.0,
    "One-Arm Dumbbell Row": 30.0,
    "Seated Cable Row": 45.0,
    "Overhead Press": 50.0,
    "Dumbbell Shoulder Press": 25.0,
    "Side Lateral Raise": 12.0,
    "Front Raise": 10.0,
    "Rear Delt Fly": 12.0,
    "Face Pull": 20.0,
    "Upright Row": 30.0,
    "Squat": 100.0,
    "Leg Press": 150.0,
    "Leg Extension": 50.0,
    "Leg Curl": 40.0,
    "Lunge": 20.0,  # Per dumbbell
    "Calf Raise": 80.0,
    "Barbell Curl": 25.0,
    "Dumbbell Curl": 15.0,
    "Hammer Curl": 15.0,
    "Cable Curl": 20.0,
    "Triceps Extension": 20.0,
    "Overhead Triceps Extension": 20.0,
    "Close Grip Bench Press": 60.0,
}


def get_exercise_weight(exercise_name: str, base_bench: float) -> float:
    """Calculate realistic weight for an exercise based on bench press progression"""
    if exercise_name not in BASE_WEIGHTS:
        # Default fallback for unknown exercises
        return base_bench * 0.5
    
    base_weight = BASE_WEIGHTS[exercise_name]
    if base_weight == 0.0:
        return 0.0  # Bodyweight exercise
    
    # Scale based on bench press progression
    bench_ratio = base_bench / BASE_WEIGHTS["Bench Press"]
    return round(base_weight * bench_ratio, 1)


def generate_workout_data(
    db: Session,
    user_id: int,
    date: datetime,
    routine_day: int,
    week_number: int,
    scenario: Dict,
    base_bench: float
) -> None:
    """Generate workout data for a specific date"""
    
    routine = ROUTINE_PATTERN[routine_day]
    
    # Rest day - skip workout
    if routine is None:
        # Still create UserMetric for rest day
        user_metric = UserMetric(
            user_id=user_id,
            date=date,
            target_workout=None,
            sleep_hours=random.choice([6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0]),
            energy_level=random.randint(6, 8),
            available_time=None
        )
        db.add(user_metric)
        return
    
    # Check for scenario events
    # Note: When using SCENARIO_SCHEDULE, scenario events may not match week_number
    # because events are defined in scenario files with their own week numbers.
    # If you want events to apply, either:
    # 1) Match scenario file event weeks with SCENARIO_SCHEDULE weeks, or
    # 2) Apply events based on scenario type rather than week number
    event_multipliers = {"volume": 1.0, "intensity": 1.0, "rpe_boost": 0.0}
    
    # Apply events if week matches (may not match when using SCENARIO_SCHEDULE)
    for event in scenario.get("events", []):
        if event["week"] == week_number:
            if event["type"] == "overtraining_spike":
                event_multipliers["volume"] = event["volume_multiplier"]
                event_multipliers["intensity"] = event["intensity_multiplier"]
                event_multipliers["rpe_boost"] = event["rpe_boost"]
            elif event["type"] == "deload":
                event_multipliers["volume"] = event["volume_multiplier"]
                event_multipliers["intensity"] = event["intensity_multiplier"]
                event_multipliers["rpe_boost"] = event["rpe_boost"]
    
    # If no event matched, apply scenario defaults based on scenario type
    # This ensures overtraining/deload scenarios still have their characteristic effects
    if event_multipliers == {"volume": 1.0, "intensity": 1.0, "rpe_boost": 0.0}:
        # Apply scenario-specific defaults if no event matched
        if scenario.get("name") == "overtraining_spike":
            # Overtraining scenario: higher volume/intensity by default
            event_multipliers["volume"] = 1.2
            event_multipliers["intensity"] = 1.1
            event_multipliers["rpe_boost"] = 1.0
        elif scenario.get("name") == "deload":
            # Deload scenario: lower volume/intensity by default
            event_multipliers["volume"] = 0.7
            event_multipliers["intensity"] = 0.85
            event_multipliers["rpe_boost"] = -1.0
    
    # Determine sets and exercises based on scenario
    # Base: 4 sets per exercise (as requested)
    sets_per_exercise = int(4 * event_multipliers["volume"])
    sets_per_exercise = max(2, min(sets_per_exercise, 5))  # Allow 2-5 sets (max 5 as requested)
    
    # Select exercises for each body part
    exercises = []
    for body_part in routine:
        if body_part is None:
            continue
        
        available_exercises = EXERCISES_BY_BODY_PART.get(body_part, [])
        count = EXERCISE_COUNTS.get(body_part, 4)
        selected = random.sample(available_exercises, min(count, len(available_exercises)))
        exercises.extend(selected)
    
    # Create UserMetric for workout day
    target_workouts = [part.value for part in routine if part is not None]
    user_metric = UserMetric(
        user_id=user_id,
        date=date,
        target_workout=target_workouts,
        sleep_hours=random.choice([6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0]),
        energy_level=random.randint(5, 9),
        available_time=random.randint(60, 120)
    )
    db.add(user_metric)
    
    # Generate EventLog entries for each exercise
    # Each exercise should have set_number starting from 1
    for exercise_name in exercises:
        exercise_weight = get_exercise_weight(exercise_name, base_bench * event_multipliers["intensity"])
        
        # Base RPE from scenario
        base_rpe = scenario["rpe_range"]["min"] + event_multipliers["rpe_boost"]
        base_rpe = max(5.0, min(9.5, base_rpe))
        
        # Each exercise starts with set_number = 1
        for set_idx in range(sets_per_exercise):
            set_number = set_idx + 1  # Set number starts from 1 for each exercise
            
            # Progressive weight increase within session (warm-up to working sets)
            if set_idx == 0:
                # First set: lighter warm-up
                weight = exercise_weight * 0.7
                reps = random.randint(12, 15)
                rpe = base_rpe - 1.0
            elif set_idx == 1:
                # Second set: moderate
                weight = exercise_weight * 0.85
                reps = random.randint(10, 11)
                rpe = base_rpe - 0.5
            else:
                # Working sets (target ~10 reps as requested)
                weight = exercise_weight * (1.0 + (set_idx - 2) * 0.02)  # Slight progression
                reps = random.randint(9, 11)  # Around 10 reps
                rpe = base_rpe + random.uniform(-0.5, 0.5)
            
            # Ensure RPE is within valid range
            rpe = max(5.0, min(10.0, rpe))
            
            # Round weight appropriately
            if weight >= 1.0:
                weight = round(weight, 1)
            else:
                weight = round(weight, 2)
            
            event_log = EventLog(
                user_id=user_id,
                workout_id=None,
                exercise_name=exercise_name,
                set_number=set_number,
                reps=reps,
                weight=weight,
                rpe=round(rpe, 1),
                energy_level=user_metric.energy_level,
                completed=True,
                logged_at=date.replace(hour=random.randint(17, 20), minute=random.randint(0, 59))
            )
            db.add(event_log)


def main():
    """Main seed function"""
    # Use direct user_id if specified, otherwise hash Clerk ID
    if DIRECT_USER_ID is not None:
        user_id = DIRECT_USER_ID
        print(f"Using direct user_id: {user_id}")
    else:
        print(f"Starting seed data generation for Clerk user: {CLERK_USER_ID}")
        # Convert Clerk ID to integer (automatic hashing)
        user_id = clerk_id_to_int(CLERK_USER_ID)
        print(f"Converted user_id: {user_id}")
    
    # Load scenario (using normal.json as base)
    scenarios = {
    "normal": load_scenario("normal"),
    "overtraining": load_scenario("overtraining_spike"),
    "deload": load_scenario("deload"),
    }
    print("Loaded scenarios:", ", ".join([s["name"] for s in scenarios.values()]))

    SCENARIO_SCHEDULE = {
    **{w: "normal" for w in range(1, 9)},
    9: "overtraining",
    10: "overtraining",
    11: "deload",
    **{w: "normal" for w in range(12, 20)},
    20: "overtraining",
    21: "deload",
    }
    
    # Initialize database session
    db: Session = SessionLocal()
    
    try:
        # Delete existing data if requested
        if DELETE_EXISTING_DATA:
            print(f"Deleting existing data for user_id: {user_id}...")

            # 1) EventLog 먼저 안전 삭제 (ORM delete로 cascade/relationship 처리)
            logs = db.query(EventLog).filter(EventLog.user_id == user_id).all()
            for obj in logs:
                db.delete(obj)
            deleted_logs = len(logs)

            # 2) UserMetric 삭제
            metrics = db.query(UserMetric).filter(UserMetric.user_id == user_id).all()
            for obj in metrics:
                db.delete(obj)
            deleted_metrics = len(metrics)

            db.commit()
            print(f"   - Deleted {deleted_logs} event logs")
            print(f"   - Deleted {deleted_metrics} user metrics")
        else:
            print("DELETE_EXISTING_DATA is False - existing data will be kept (may create duplicates)")

        # Calculate date range
        current_date = START_DATE
        routine_day = 0
        week_number = 1
        base_bench = 70.0  # Starting bench press weight
        
        # Track days since start for week calculation
        days_since_start = 0
        
        print(f"Generating data from {START_DATE.date()} to {END_DATE.date()}")
        
        while current_date <= END_DATE:
            # Calculate week number (every 7 days)
            week_number = (days_since_start // 7) + 1
            
            # pick scenario by week
            scenario_key = SCENARIO_SCHEDULE.get(week_number, "normal")
            scenario = scenarios[scenario_key]
            
            # Progressive overload: increase base bench press over time
            # Start at 70kg, gradually increase to ~100kg over 11 months
            progress_ratio = days_since_start / ((END_DATE - START_DATE).days)
            base_bench = 70.0 + (30.0 * progress_ratio)  # 70kg → 100kg
            
            # Generate workout data for this date
            generate_workout_data(
                db=db,
                user_id=user_id,
                date=current_date,
                routine_day=routine_day,
                week_number=week_number,
                scenario=scenario,
                base_bench=base_bench
            )
            
            # Move to next day
            current_date += timedelta(days=1)
            days_since_start += 1
            
            # Advance routine day (cycle through pattern)
            routine_day = (routine_day + 1) % len(ROUTINE_PATTERN)
            
            # Commit every 30 days for performance
            if days_since_start % 30 == 0:
                db.commit()
                print(f"Progress: {days_since_start} days processed (Week {week_number})")
        
        # Final commit
        db.commit()
        print(f"\nSeed data generation completed!")
        print(f"   - Date range: {START_DATE.date()} to {END_DATE.date()}")
        print(f"   - Total days: {(END_DATE - START_DATE).days + 1}")
        print(f"   - User ID: {user_id}")
        
    except Exception as e:
        db.rollback()
        print(f"Error during seed generation: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
