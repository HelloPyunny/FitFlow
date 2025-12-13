import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function WelcomeOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has already started today
    const startedToday = sessionStorage.getItem('startedToday');
    
    if (!startedToday) {
      // Small delay for smooth appearance
      setTimeout(() => {
        setIsVisible(true);
      }, 100);
    }
  }, []);

  const handleStart = () => {
    setIsAnimating(true);
    
    // Save to sessionStorage
    sessionStorage.setItem('startedToday', 'true');
    
    // Wait for animation to complete before navigating and removing
    setTimeout(() => {
      navigate('/');
      setIsVisible(false);
      setIsAnimating(false);
    }, 300);
  };

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
          className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4"
        >
          SmartFit Flow
        </h1>
        
        <p className="text-lg sm:text-xl text-gray-600 mb-2">
          Welcome
        </p>
        
        <p
          id="welcome-description"
          className="text-base sm:text-lg text-gray-500 mb-8"
        >
          Ready for today's workout?
        </p>
        
        <button
          onClick={handleStart}
          onKeyDown={handleKeyDown}
          className="bg-indigo-600 text-white px-8 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base sm:text-lg font-medium transition-colors duration-200"
          aria-label="Start today's workout"
        >
          Start Today's Workout
        </button>
      </div>
    </div>
  );
}

export default WelcomeOverlay;
