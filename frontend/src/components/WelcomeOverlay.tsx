import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

function WelcomeOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    // Only show if user is signed in
    if (!isLoaded || !isSignedIn) {
      return;
    }

    // Check if user has already started today (user-specific)
    const userId = user?.id || '';
    const startedToday = sessionStorage.getItem(`startedToday_${userId}`);
    
    if (!startedToday) {
      // Small delay for smooth appearance
      setTimeout(() => {
        setIsVisible(true);
      }, 100);
    }
  }, [isLoaded, isSignedIn, user]);

  const handleStart = () => {
    setIsAnimating(true);
    
    // Save to sessionStorage (user-specific)
    const userId = user?.id || '';
    sessionStorage.setItem(`startedToday_${userId}`, 'true');
    
    // Wait for animation to complete before navigating and removing
    setTimeout(() => {
      navigate('/');
      setIsVisible(false);
      setIsAnimating(false);
    }, 1000);
  };

  // Don't show if user is not signed in
  if (!isLoaded || !isSignedIn || !user) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleStart();
    }
  };

  if (!isVisible && !isAnimating) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-300 ${
        isAnimating ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      aria-describedby="welcome-description"
    >
      <div
        className={`text-center px-6 sm:px-8 transition-transform duration-300 ${
          isAnimating ? 'transform -translate-y-2' : 'transform translate-y-0'
        }`}
      >
        <h1
          id="welcome-title"
          className="text-5xl sm:text-7xl font-bold text-gray-900 mb-0.5"
        >
          Fit Flow
        </h1>

        <p
          id="welcome-description"
          className="text-xs sm:text-sm text-gray-500 mb-6"
        >
          an AI-powered fitness assistant
        </p>
        
        <p className="text-lg sm:text-xl text-gray-600 mb-4">
          Welcome{user.firstName ? `, ${user.firstName}` : ''}
        </p>
        
        <button
          onClick={handleStart}
          onKeyDown={handleKeyDown}
          className="
          bg-indigo-600 text-white px-8 py-3 rounded-md shadow-md
          hover:bg-indigo-700
          hover:-translate-y-0.5 hover:scale-[1.02]
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
          text-base sm:text-lg font-medium
          "
        >
          Start Today's Workout
        </button>
      </div>
    </div>
  );
}

export default WelcomeOverlay;
