import { useState, useEffect } from 'react';
import { getExercises, createEventLog, TargetWorkout } from '../lib/api';

interface Set {
  id: string;
  reps: number;
  weight: number;
  rpe?: number;
}

interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  sets: Set[];
}

function WorkoutLog() {
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('');
  const [exercises, setExercises] = useState<string[]>([]);
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [customExercise, setCustomExercise] = useState<string>('');
  const [useCustom, setUseCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openRpePopover, setOpenRpePopover] = useState<string | null>(null);

  const bodyPartOptions = [
    { value: TargetWorkout.BACK, label: 'Back' },
    { value: TargetWorkout.CHEST, label: 'Chest' },
    { value: TargetWorkout.LEGS, label: 'Legs' },
    { value: TargetWorkout.SHOULDERS, label: 'Shoulders' },
    { value: TargetWorkout.BICEPS, label: 'Biceps' },
    { value: TargetWorkout.TRICEPS, label: 'Triceps' },
  ];

  useEffect(() => {
    if (selectedBodyPart) {
      loadExercises(selectedBodyPart);
    } else {
      setExercises([]);
    }
  }, [selectedBodyPart]);

  const loadExercises = async (bodyPart: string) => {
    setIsLoading(true);
    try {
      const response = await getExercises(bodyPart);
      if ('exercises' in response.data) {
        setExercises(response.data.exercises);
      } else {
        setExercises([]);
      }
    } catch (error) {
      console.error('Failed to load exercises:', error);
      alert('Failed to load exercises. Please try again.');
      setExercises([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExercise = () => {
    if (!selectedBodyPart) {
      alert('Please select a body part first');
      return;
    }

    const exerciseName = useCustom ? customExercise.trim() : selectedExercise;
    if (!exerciseName) {
      alert('Please select or enter an exercise name');
      return;
    }

    // Check if exercise already exists
    if (exerciseList.some(ex => ex.name === exerciseName && ex.bodyPart === selectedBodyPart)) {
      alert('This exercise is already added');
      return;
    }

    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseName,
      bodyPart: selectedBodyPart,
      sets: [{ id: Date.now().toString() + '-1', reps: 0, weight: 0 }],
    };

    setExerciseList([...exerciseList, newExercise]);
    setSelectedExercise('');
    setCustomExercise('');
    setUseCustom(false);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExerciseList(exerciseList.filter(ex => ex.id !== exerciseId));
  };

  const handleAddSet = (exerciseId: string) => {
    setExerciseList(exerciseList.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: [...ex.sets, { id: Date.now().toString(), reps: 0, weight: 0 }],
        };
      }
      return ex;
    }));
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    setExerciseList(exerciseList.map(ex => {
      if (ex.id === exerciseId) {
        const newSets = ex.sets.filter(s => s.id !== setId);
        if (newSets.length === 0) {
          // If no sets left, add one empty set
          return {
            ...ex,
            sets: [{ id: Date.now().toString(), reps: 0, weight: 0 }],
          };
        }
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };

  const handleSetChange = (exerciseId: string, setId: string, field: keyof Set, value: number | undefined) => {
    setExerciseList(exerciseList.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              return { ...s, [field]: value };
            }
            return s;
          }),
        };
      }
      return ex;
    }));
  };

  const handleRpeSelect = (exerciseId: string, setId: string, rpeValue: number) => {
    handleSetChange(exerciseId, setId, 'rpe', rpeValue);
    setOpenRpePopover(null);
  };

  const getRpeButtonId = (exerciseId: string, setId: string) => {
    return `${exerciseId}-${setId}-rpe`;
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openRpePopover && !target.closest(`[data-rpe-popover="${openRpePopover}"]`)) {
        setOpenRpePopover(null);
      }
    };

    if (openRpePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openRpePopover]);

  const handleSubmit = async () => {
    if (exerciseList.length === 0) {
      alert('Please add at least one exercise');
      return;
    }

    // Validate all sets
    for (const exercise of exerciseList) {
      for (const set of exercise.sets) {
        if (set.reps === 0 || set.weight === 0) {
          alert(`Please fill in all sets for ${exercise.name}`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const userId = 1; // TODO: Get from auth context
      
      // Create event log for each set of each exercise
      const promises: Promise<any>[] = [];
      
      exerciseList.forEach((exercise) => {
        exercise.sets.forEach((set, index) => {
          promises.push(
            createEventLog({
              user_id: userId,
              exercise_name: exercise.name,
              set_number: index + 1,
              reps: set.reps,
              weight: set.weight,
              rpe: set.rpe,
              completed: true,
            })
          );
        });
      });

      await Promise.all(promises);
      alert('Workout logged successfully!');
      
      // Reset form
      setSelectedBodyPart('');
      setExerciseList([]);
      setSelectedExercise('');
      setCustomExercise('');
      setUseCustom(false);
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate summary
  const getSummary = () => {
    const bodyPartCounts: Record<string, number> = {};
    let totalSets = 0;
    
    exerciseList.forEach(ex => {
      bodyPartCounts[ex.bodyPart] = (bodyPartCounts[ex.bodyPart] || 0) + 1;
      totalSets += ex.sets.length;
    });

    return { bodyPartCounts, totalExercises: exerciseList.length, totalSets };
  };

  const summary = getSummary();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Workout Log</h2>
      
      {/* Summary Card */}
      {exerciseList.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-indigo-900">
                Today's Workout Summary
              </h3>
              <p className="text-xs sm:text-sm text-indigo-700 mt-1">
                {exerciseList.length} {exerciseList.length === 1 ? 'exercise' : 'exercises'} • {summary.totalSets} {summary.totalSets === 1 ? 'set' : 'sets'}
              </p>
            </div>
            <div className="text-left sm:text-right">
              {Object.entries(summary.bodyPartCounts).map(([bodyPart, count]) => (
                <p key={bodyPart} className="text-xs sm:text-sm text-indigo-600">
                  {bodyPartOptions.find(opt => opt.value === bodyPart)?.label || bodyPart}: {count} {count === 1 ? 'exercise' : 'exercises'}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
        {/* Add Exercise Section */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Add Exercise</h3>
          
          <div className="space-y-4">
            {/* Body Part Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Body Part *
              </label>
              <select
                value={selectedBodyPart}
                onChange={(e) => {
                  setSelectedBodyPart(e.target.value);
                  setSelectedExercise('');
                  setCustomExercise('');
                  setUseCustom(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select body part</option>
                {bodyPartOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Exercise Selection */}
            {selectedBodyPart && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exercise *
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!useCustom}
                        onChange={() => setUseCustom(false)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">Select from list</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={useCustom}
                        onChange={() => setUseCustom(true)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">Enter custom</span>
                    </label>
                  </div>

                  {!useCustom ? (
                    <select
                      value={selectedExercise}
                      onChange={(e) => setSelectedExercise(e.target.value)}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="">Select exercise</option>
                      {exercises.map((exercise) => (
                        <option key={exercise} value={exercise}>
                          {exercise}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customExercise}
                      onChange={(e) => setCustomExercise(e.target.value)}
                      placeholder="Enter exercise name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Add Exercise Button */}
            {selectedBodyPart && (useCustom ? customExercise.trim() : selectedExercise) && (
              <button
                onClick={handleAddExercise}
                className="w-full bg-indigo-600 text-white py-2 sm:py-2.5 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm sm:text-base font-medium"
              >
                + Add Exercise
              </button>
            )}
          </div>
        </div>

        {/* Exercise Cards */}
        {exerciseList.map((exercise) => (
          <div key={exercise.id} className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{exercise.name}</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {bodyPartOptions.find(opt => opt.value === exercise.bodyPart)?.label || exercise.bodyPart}
                </p>
              </div>
              <button
                onClick={() => handleRemoveExercise(exercise.id)}
                className="text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium self-start sm:self-auto"
              >
                Remove
              </button>
            </div>

            {/* Sets */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Sets</label>
                <button
                  onClick={() => handleAddSet(exercise.id)}
                  className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  + Add Set
                </button>
              </div>

              {/* Set Headers - Desktop */}
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 mb-2 px-2">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Reps</div>
                <div className="col-span-4">Weight (kg)</div>
                <div className="col-span-2">RPE</div>
                <div className="col-span-1"></div>
              </div>

              {/* Set Inputs */}
              {exercise.sets.map((set, index) => (
                <div key={set.id}>
                  {/* Desktop View */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 items-center p-2 sm:p-3 bg-gray-50 rounded-md">
                    <div className="col-span-1 text-sm font-medium text-gray-700 text-center">
                      {index + 1}
                    </div>
                    <input
                      type="number"
                      placeholder="Reps"
                      value={set.reps || ''}
                      onChange={(e) =>
                        handleSetChange(exercise.id, set.id, 'reps', parseInt(e.target.value) || 0)
                      }
                      className="col-span-4 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Weight (kg)"
                      value={set.weight || ''}
                      onChange={(e) =>
                        handleSetChange(exercise.id, set.id, 'weight', parseFloat(e.target.value) || 0)
                      }
                      step="0.5"
                      className="col-span-4 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div className="col-span-2 relative" data-rpe-popover={getRpeButtonId(exercise.id, set.id)}>
                      <button
                        type="button"
                        onClick={() => {
                          const popoverId = getRpeButtonId(exercise.id, set.id);
                          setOpenRpePopover(openRpePopover === popoverId ? null : popoverId);
                        }}
                        className={`w-full px-2 py-2 text-xs sm:text-sm font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          set.rpe
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {set.rpe ? set.rpe : 'RPE'}
                      </button>
                      
                      {openRpePopover === getRpeButtonId(exercise.id, set.id) && (
                        <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg right-0">
                          <div className="p-2">
                            <div className="text-xs font-medium text-gray-500 mb-2 px-2">Select RPE (6-10)</div>
                            <div className="grid grid-cols-5 gap-1">
                              {[6, 7, 8, 9, 10].map((rpeValue) => (
                                <button
                                  key={rpeValue}
                                  type="button"
                                  onClick={() => handleRpeSelect(exercise.id, set.id, rpeValue)}
                                  className={`px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                                    set.rpe === rpeValue
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {rpeValue}
                                </button>
                              ))}
                            </div>
                            {set.rpe && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleSetChange(exercise.id, set.id, 'rpe', undefined);
                                  setOpenRpePopover(null);
                                }}
                                className="mt-2 w-full px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {exercise.sets.length > 1 && (
                      <button
                        onClick={() => handleRemoveSet(exercise.id, set.id)}
                        className="col-span-1 text-red-600 hover:text-red-700 text-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Mobile View */}
                  <div className="sm:hidden bg-gray-50 rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Set {index + 1}</span>
                      {exercise.sets.length > 1 && (
                        <button
                          onClick={() => handleRemoveSet(exercise.id, set.id)}
                          className="text-red-600 hover:text-red-700 text-lg"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Reps</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={set.reps || ''}
                          onChange={(e) =>
                            handleSetChange(exercise.id, set.id, 'reps', parseInt(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          placeholder="0.0"
                          value={set.weight || ''}
                          onChange={(e) =>
                            handleSetChange(exercise.id, set.id, 'weight', parseFloat(e.target.value) || 0)
                          }
                          step="0.5"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">RPE (6-10)</label>
                      <div className="relative" data-rpe-popover={getRpeButtonId(exercise.id, set.id)}>
                        <button
                          type="button"
                          onClick={() => {
                            const popoverId = getRpeButtonId(exercise.id, set.id);
                            setOpenRpePopover(openRpePopover === popoverId ? null : popoverId);
                          }}
                          className={`w-full px-3 py-2 text-sm font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            set.rpe
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {set.rpe ? `RPE: ${set.rpe}` : 'Select RPE'}
                        </button>
                        
                        {openRpePopover === getRpeButtonId(exercise.id, set.id) && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                            <div className="p-2">
                              <div className="text-xs font-medium text-gray-500 mb-2 px-2">Select RPE (6-10)</div>
                              <div className="grid grid-cols-5 gap-1">
                                {[6, 7, 8, 9, 10].map((rpeValue) => (
                                  <button
                                    key={rpeValue}
                                    type="button"
                                    onClick={() => handleRpeSelect(exercise.id, set.id, rpeValue)}
                                    className={`px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                                      set.rpe === rpeValue
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {rpeValue}
                                  </button>
                                ))}
                              </div>
                              {set.rpe && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSetChange(exercise.id, set.id, 'rpe', undefined);
                                    setOpenRpePopover(null);
                                  }}
                                  className="mt-2 w-full px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Submit Button */}
        {exerciseList.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-2 sm:py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg font-semibold"
          >
            {isSubmitting ? 'Saving Workout...' : 'Save Workout'}
          </button>
        )}
      </div>
    </div>
  );
}

export default WorkoutLog;
