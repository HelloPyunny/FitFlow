from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base
from app.core.config import settings
from app.core.exercises import get_exercises_by_body_part, get_all_exercises
from app.core.enums import TargetWorkout
from app.api import user_profile, user_metric, event_log

# Create tables in the database
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(user_profile.router)
app.include_router(user_metric.router)
app.include_router(event_log.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Fit Flow API is running"}

@app.get("/exercises")
def get_exercises(body_part: TargetWorkout = Query(None, description="Filter by body part")):
    """
    Get list of exercises.
    """
    if body_part:
        return {
            "body_part": body_part.value,
            "exercises": get_exercises_by_body_part(body_part),
            "allow_custom": True  # Indicates that custom exercise names are allowed
        }
    else:
        return {
            "exercises_by_body_part": get_all_exercises(),
            "allow_custom": True  # Indicates that custom exercise names are allowed
        }