"""
Enums for the application
"""

from enum import Enum

class TargetWorkout(str, Enum):
    """Target workout body part for user to select from"""
    BACK = "back"
    CHEST = "chest"
    LEGS = "legs"
    SHOULDERS = "shoulders"
    BICEPS = "biceps"
    TRICEPS = "triceps"

