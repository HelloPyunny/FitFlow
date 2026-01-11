import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { createUserMetric, getRecommendation, TargetWorkout } from '../lib/api';

function Today() {
  const { user } = useUser();
  const navigate = useNavigate();
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [availableTime, setAvailableTime] = useState<number>(60);
  const [selectedWorkouts, setSelectedWorkouts] = useState<typeof TargetWorkout[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  
  // Reset date to today when component mounts or user changes
  useEffect(() => {
    setSelectedDate(getTodayDate());
  }, [user]);

  const workoutOptions = [
    { value: TargetWorkout.BACK, label: 'Back' },
    { value: TargetWorkout.CHEST, label: 'Chest' },
    { value: TargetWorkout.LEGS, label: 'Legs' },
    { value: TargetWorkout.SHOULDERS, label: 'Shoulders' },
    { value: TargetWorkout.BICEPS, label: 'Biceps' },
    { value: TargetWorkout.TRICEPS, label: 'Triceps' },
  ];

  const handleWorkoutToggle = (workout: typeof TargetWorkout) => {
    setSelectedWorkouts((prev) =>
      prev.includes(workout as unknown as typeof TargetWorkout)
        ? prev.filter((w) => w !== workout)
        : [...prev, workout]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Convert Clerk user ID to consistent integer
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) {
        const char = user.id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const userId = Math.abs(hash);
      
      // Convert date string to ISO format with time set to midnight UTC
      const dateObj = new Date(selectedDate + 'T00:00:00.000Z');
      
      const data = {
        user_id: userId,
        date: dateObj.toISOString(),
        sleep_hours: sleepHours,
        energy_level: energyLevel,
        available_time: availableTime,
        target_workout: selectedWorkouts.length > 0 ? selectedWorkouts : undefined,
      };
      await createUserMetric(data);
      
      // Get recommendation after saving
      setIsLoadingRecommendation(true);
      setShowRecommendation(true);
      try {
        const response = await getRecommendation({
          user_id: userId,
          date: dateObj.toISOString(),
          sleep_hours: sleepHours,
          energy_level: energyLevel,
          available_time: availableTime,
          target_workout: selectedWorkouts.length > 0 ? selectedWorkouts : undefined,
        });
        setRecommendation(response.data);
      } catch (err: any) {
        console.error('Failed to get recommendation:', err);
        setRecommendation({
          error: 'Failed to get recommendation. Please try again.',
        });
      } finally {
        setIsLoadingRecommendation(false);
        setIsSubmitting(false);
      }
      
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleImportToWorkoutLog = () => {
    if (!recommendation?.recommended_workout) return;
    
    // Save recommendation to localStorage for WorkoutLog page
    const recommendationData = {
      workout: recommendation.recommended_workout,
      predicted_success_rate: recommendation.predicted_success_rate,
      predicted_fatigue: recommendation.predicted_fatigue,
      warnings: recommendation.warnings,
      date: selectedDate,
      energy_level: energyLevel,
    };
    
    localStorage.setItem('importedWorkout', JSON.stringify(recommendationData));
    
    // Navigate to WorkoutLog page
    navigate('/workout-log');
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Input Today's Condition</h2>
      
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Date *
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={getTodayDate()}
            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
            Target workout (select multiple)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            {workoutOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center space-x-2 cursor-pointer p-1 sm:p-0"
              >
                <input
                  type="checkbox"
                  checked={selectedWorkouts.includes(option.value as unknown as typeof TargetWorkout)}
                  onChange={() => handleWorkoutToggle(option.value as unknown as typeof TargetWorkout)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 flex-shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          {selectedWorkouts.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-500 mt-2 break-words">
              Selected: {selectedWorkouts.map(w => workoutOptions.find(o => o.value === w as unknown as string)?.label).join(', ')}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Sleep hours (hours)
          </label>
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(parseFloat(e.target.value))}
            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Energy level (1-10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={energyLevel}
            onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
            className="w-full h-2 sm:h-3"
          />
          <div className="text-center text-sm sm:text-base text-gray-600 mt-1 font-medium">{energyLevel}</div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Available time (minutes)
          </label>
          <input
            type="number"
            min="0"
            value={availableTime}
            onChange={(e) => setAvailableTime(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isLoadingRecommendation}
          className="w-full bg-indigo-600 text-white py-2 sm:py-2.5 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium"
        >
          {isSubmitting || isLoadingRecommendation ? 'Loading...' : 'Save & Get Recommendation'}
        </button>
      </div>

      {/* Recommendation Modal */}
      {showRecommendation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Workout Recommendation</h3>
              <button
                onClick={() => {
                  setShowRecommendation(false);
                  setRecommendation(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {isLoadingRecommendation ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-gray-600">Loading recommendation...</p>
                </div>
              ) : recommendation?.error ? (
                <div className="text-red-600">{recommendation.error}</div>
              ) : recommendation?.recommended_workout ? (
                <div className="space-y-4">
                  {/* Workout Info */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">{recommendation.recommended_workout.name}</h4>
                    {recommendation.recommended_workout.description && (
                      <p className="text-sm text-gray-600 mt-1">{recommendation.recommended_workout.description}</p>
                    )}
                  </div>

                  {/* Predictions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recommendation.predicted_success_rate !== null && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600">Predicted Success Rate</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {(recommendation.predicted_success_rate * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                    {recommendation.predicted_fatigue !== null && (
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600">Predicted Fatigue</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {recommendation.predicted_fatigue.toFixed(1)}/10
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Warnings */}
                  {recommendation.warnings && recommendation.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Warnings</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                        {recommendation.warnings.map((warning: string, idx: number) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Workout Steps - Only show exercise info, no RPE input */}
                  <div className="space-y-4">
                    <h5 className="text-md font-semibold text-gray-800">Exercises</h5>
                    {recommendation.recommended_workout.steps.map((step: any, idx: number) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <h6 className="font-semibold text-gray-800">{step.exercise_name}</h6>
                          <span className="text-sm font-medium text-gray-700">
                            {step.target_sets} sets × {step.target_reps} reps
                            {step.target_weight && ` @ ${step.target_weight}kg`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Import to Workout Log Button */}
                  <button
                    onClick={handleImportToWorkoutLog}
                    className="w-full bg-green-600 text-white py-2.5 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm sm:text-base font-medium mt-4"
                  >
                    Import to Workout Log
                  </button>
                </div>
              ) : (
                <div className="text-gray-600">No recommendation available. Please select target workouts.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Today;
