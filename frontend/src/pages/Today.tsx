import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { createUserMetric, TargetWorkout } from '../lib/api';

function Today() {
  const { user } = useUser();
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [availableTime, setAvailableTime] = useState<number>(60);
  const [selectedWorkouts, setSelectedWorkouts] = useState<typeof TargetWorkout[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      
      const data = {
        user_id: userId,
        date: new Date().toISOString(),
        sleep_hours: sleepHours,
        energy_level: energyLevel,
        available_time: availableTime,
        target_workout: selectedWorkouts.length > 0 ? selectedWorkouts : undefined,
      };
      await createUserMetric(data);
      alert('Today\'s condition saved successfully!');
      // TODO: Call recommendation API after saving
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Input Today's Condition</h2>
      
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
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
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white py-2 sm:py-2.5 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium"
        >
          {isSubmitting ? 'Saving...' : 'Save & Get Recommendation'}
        </button>
      </div>
    </div>
  );
}

export default Today;
