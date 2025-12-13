from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.db.models import UserProfile
from app.schemas.user_profile import UserProfileCreate, UserProfileUpdate, UserProfileResponse
from datetime import datetime

router = APIRouter(prefix="/user-profiles", tags=["user-profiles"])

@router.post("", response_model=UserProfileResponse, status_code=201)
def create_user_profile(profile: UserProfileCreate, db: Session = Depends(get_db)):
    """Create a new user profile"""
    # Check if profile already exists
    existing = db.query(UserProfile).filter(UserProfile.user_id == profile.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User profile already exists. Use PUT to update.")
    
    db_profile = UserProfile(
        **profile.model_dump(),
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("/{user_id}", response_model=UserProfileResponse)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    """Get user profile by user_id"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return profile

@router.put("/{user_id}", response_model=UserProfileResponse)
def update_user_profile(user_id: int, profile_update: UserProfileUpdate, db: Session = Depends(get_db)):
    """Update user profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    # Update only provided fields
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    profile.updated_at = datetime.now().isoformat()
    db.commit()
    db.refresh(profile)
    return profile
