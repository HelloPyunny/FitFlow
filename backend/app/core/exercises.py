"""
Exercise database organized by body part
"""
from app.core.enums import TargetWorkout

# Exercise list organized by body part
EXERCISES_BY_BODY_PART = {
    TargetWorkout.BACK: [
        "Lat Pulldown",
        "Barbell Row",
        "Dumbbell Row",
        "Cable Row",
        "Pull-up",
        "T-Bar Row",
        "One-Arm Dumbbell Row",
        "Seated Cable Row",
    ],
    TargetWorkout.CHEST: [
        "Bench Press",
        "Incline Bench Press",
        "Dumbbell Press",
        "Incline Dumbbell Press",
        "Dips",
        "Push-up",
        "Cable Fly",
        "Dumbbell Fly",
        "Pec Deck Fly",
        "Chest Press Machine",
    ],
    TargetWorkout.LEGS: [
        "Squat",
        "Leg Press",
        "Leg Extension",
        "Leg Curl",
        "Lunge",
        "Calf Raise",
    ],
    TargetWorkout.SHOULDERS: [
        "Overhead Press",
        "Dumbbell Shoulder Press",
        "Side Lateral Raise",
        "Front Raise",
        "Rear Delt Fly",
        "Face Pull",
        "Upright Row",
    ],
    TargetWorkout.BICEPS: [
        "Barbell Curl",
        "Dumbbell Curl",
        "Hammer Curl",
        "Cable Curl",
    ],
    TargetWorkout.TRICEPS: [
        "Triceps Extension",
        "Overhead Triceps Extension",
        "Dips",
        "Close Grip Bench Press",
    ],
}

def get_exercises_by_body_part(body_part: TargetWorkout) -> list[str]:
    """Get list of exercises for a specific body part"""
    return EXERCISES_BY_BODY_PART.get(body_part, [])

def get_all_exercises() -> dict[str, list[str]]:
    """Get all exercises organized by body part"""
    return {part.value: exercises for part, exercises in EXERCISES_BY_BODY_PART.items()}
