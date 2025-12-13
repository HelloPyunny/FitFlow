from enum import Enum

class TargetWorkout(str, Enum):
    """Target workout body part"""
    BACK = "back"
    CHEST = "chest"
    LEGS = "legs"
    SHOULDERS = "shoulders"
    BICEPS = "biceps"
    TRICEPS = "triceps"

