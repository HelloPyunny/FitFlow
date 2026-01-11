import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { getUserEventLogs, getUserEventLogsByDate, updateEventLog, deleteEventLog, getUserMetricByDate, updateUserMetric, createUserMetric, getRecommendation, type EventLog, type EventLogUpdate, type UserMetric, TargetWorkout } from '../lib/api';

function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [showWorkoutLogs, setShowWorkoutLogs] = useState(false);
  const [workoutLogs, setWorkoutLogs] = useState<EventLog[]>([]);
  const [selectedDateLogs, setSelectedDateLogs] = useState<EventLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDate, setIsLoadingDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Record<number, Partial<EventLog>>>({});
  const [editEnergyLevel, setEditEnergyLevel] = useState<number | null>(null);
  const [editWorkoutDate, setEditWorkoutDate] = useState<string | null>(null);
  const [userMetrics, setUserMetrics] = useState<Record<string, UserMetric>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Today's Condition states
  const [todayMetric, setTodayMetric] = useState<UserMetric | null>(null);
  const [isLoadingToday, setIsLoadingToday] = useState(false);
  const [isEditingToday, setIsEditingToday] = useState(false);
  const [editTodayData, setEditTodayData] = useState({
    sleep_hours: 7,
    energy_level: 5,
    available_time: 60,
    target_workout: [] as string[],
  });
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);

  const loadWorkoutLogs = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      // Convert Clerk user ID to consistent integer
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) {
        const char = user.id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const userId = Math.abs(hash);

      const response = await getUserEventLogs(userId);
      setWorkoutLogs(response.data);
    } catch (err: any) {
      console.error('Failed to load workout logs:', err);
      setError('Failed to load workout logs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWorkoutLogs = () => {
    if (!showWorkoutLogs && workoutLogs.length === 0) {
      loadWorkoutLogs();
    }
    setShowWorkoutLogs(!showWorkoutLogs);
    if (showWorkoutLogs) {
      setSelectedDate(null);
      setSelectedDateLogs([]);
    }
  };

  const loadDateLogs = async (date: string) => {
    if (!user) return;

    setIsLoadingDate(true);
    setError(null);
    try {
      // Convert Clerk user ID to consistent integer
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) {
        const char = user.id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const userId = Math.abs(hash);

      // Load both event logs and user metric for this date
      const [logsResponse, metricResponse] = await Promise.allSettled([
        getUserEventLogsByDate(userId, date),
        getUserMetricByDate(userId, date)
      ]);

      if (logsResponse.status === 'fulfilled') {
        setSelectedDateLogs(logsResponse.value.data);
      } else {
        console.error('Failed to load logs:', logsResponse.reason);
        setSelectedDateLogs([]);
      }

      if (metricResponse.status === 'fulfilled') {
        setUserMetrics(prev => ({ ...prev, [date]: metricResponse.value.data }));
        setEditEnergyLevel(metricResponse.value.data.energy_level || null);
      } else {
        // Metric might not exist, that's okay
        setEditEnergyLevel(null);
      }

      setSelectedDate(date);
    } catch (err: any) {
      console.error('Failed to load date logs:', err);
      setError('Failed to load workout logs for this date.');
    } finally {
      setIsLoadingDate(false);
    }
  };

  // Get dates that have workout logs
  const getDatesWithLogs = (): Set<string> => {
    const dates = new Set<string>();
    workoutLogs.forEach(log => {
      // Extract date from ISO string directly to avoid timezone issues
      // logged_at format: "2025-12-10T00:00:00Z" or "2025-12-10T00:00:00+00:00"
      const date = log.logged_at.split('T')[0];
      dates.add(date);
    });
    return dates;
  };

  const datesWithLogs = getDatesWithLogs();

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (dateStr: string) => {
    // Always try to load logs for the selected date, even if we don't have logs cached
    loadDateLogs(dateStr);
  };

  const handleEditClick = (date: string, logs: EventLog[]) => {
    setEditingDate(date);
    setEditWorkoutDate(date); // Initialize with current date
    // Initialize edit form data with current log values
    const initialData: Record<number, Partial<EventLog>> = {};
    logs.forEach(log => {
      initialData[log.id] = {
        exercise_name: log.exercise_name,
        set_number: log.set_number,
        reps: log.reps,
        weight: log.weight,
        rpe: log.rpe,
      };
    });
    setEditFormData(initialData);
    
    // Set energy level from user metric
    const metric = userMetrics[date];
    setEditEnergyLevel(metric?.energy_level || null);
  };

  const handleCancelEdit = () => {
    setEditingDate(null);
    setEditFormData({});
    setEditEnergyLevel(null);
    setEditWorkoutDate(null);
  };

  const handleDeleteLog = async (logId: number, date: string) => {
    if (!confirm('Are you sure you want to delete this set?')) {
      return;
    }

    try {
      await deleteEventLog(logId);
      // Reload logs for the date
      await loadDateLogs(date);
      // Also reload all workout logs to update calendar
      if (user) {
        let hash = 0;
        for (let i = 0; i < user.id.length; i++) {
          const char = user.id.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        const userId = Math.abs(hash);
        const response = await getUserEventLogs(userId);
        setWorkoutLogs(response.data);
      }
    } catch (err: any) {
      console.error('Failed to delete log:', err);
      alert('Failed to delete workout log. Please try again.');
    }
  };

  const handleSaveEdit = async (date: string, logs: EventLog[]) => {
    if (!user || !editWorkoutDate) return;

    setIsSaving(true);
    try {
      // Convert Clerk user ID to consistent integer
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) {
        const char = user.id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const userId = Math.abs(hash);

      // Convert new date to ISO format
      const newDateObj = new Date(editWorkoutDate + 'T00:00:00.000Z');
      const newLoggedAt = newDateObj.toISOString();

      // Update all event logs with new date if changed
      const updatePromises = logs.map(log => {
        const logData = editFormData[log.id];
        if (logData) {
          const updateData: EventLogUpdate = {
            exercise_name: logData.exercise_name,
            set_number: logData.set_number,
            reps: logData.reps,
            weight: logData.weight,
            rpe: logData.rpe,
            logged_at: newLoggedAt, // Update date for all logs
          };
          return updateEventLog(log.id, updateData);
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);

      // Update energy level if changed (use new date if date was changed)
      const targetDate = editWorkoutDate !== date ? editWorkoutDate : date;
      if (editEnergyLevel !== null) {
        try {
          await updateUserMetric(userId, targetDate, { energy_level: editEnergyLevel });
        } catch (err: any) {
          // If metric doesn't exist, create it
          const targetDateObj = new Date(targetDate + 'T00:00:00.000Z');
          await createUserMetric({
            user_id: userId,
            date: targetDateObj.toISOString(),
            energy_level: editEnergyLevel,
          });
        }
      }

      // If date was changed, we need to reload workout logs to refresh the calendar
      if (editWorkoutDate !== date) {
        await loadWorkoutLogs();
      }
      
      // Reload logs for the target date (new date if changed, or original date)
      await loadDateLogs(targetDate);
      
      setEditingDate(null);
      setEditFormData({});
      setEditEnergyLevel(null);
      setEditWorkoutDate(null);
    } catch (err: any) {
      console.error('Failed to update logs:', err);
      alert('Failed to update workout logs. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  // Group logs by date
  const groupLogsByDate = (logs: EventLog[]) => {
    const grouped: Record<string, EventLog[]> = {};
    
    logs.forEach(log => {
      // Extract date from ISO string directly to avoid timezone issues
      const date = log.logged_at.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(log);
    });

    // Sort dates in descending order
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  };

  // Group logs by exercise within a date
  const groupLogsByExercise = (logs: EventLog[]) => {
    const grouped: Record<string, EventLog[]> = {};
    
    logs.forEach(log => {
      if (!grouped[log.exercise_name]) {
        grouped[log.exercise_name] = [];
      }
      grouped[log.exercise_name].push(log);
    });

    // Sort sets by set_number
    Object.keys(grouped).forEach(exercise => {
      grouped[exercise].sort((a, b) => a.set_number - b.set_number);
    });

    return grouped;
  };

  const groupedByDate = groupLogsByDate(selectedDateLogs.length > 0 ? selectedDateLogs : workoutLogs);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load today's condition
  const loadTodayCondition = async () => {
    if (!user) return;

    setIsLoadingToday(true);
    try {
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) {
        const char = user.id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const userId = Math.abs(hash);
      const today = getTodayDate();

      try {
        const response = await getUserMetricByDate(userId, today);
        setTodayMetric(response.data);
        setEditTodayData({
          sleep_hours: response.data.sleep_hours || 7,
          energy_level: response.data.energy_level || 5,
          available_time: response.data.available_time || 60,
          target_workout: (response.data.target_workout || []) as unknown as string[],
        });
      } catch (err: any) {
        // No metric for today, that's okay
        setTodayMetric(null);
      }
    } catch (err: any) {
      console.error('Failed to load today condition:', err);
    } finally {
      setIsLoadingToday(false);
    }
  };

  // Load today's condition on mount
  useEffect(() => {
    loadTodayCondition();
  }, [user]);

  // Handle edit today condition
  const handleEditToday = () => {
    if (todayMetric) {
      setEditTodayData({
        sleep_hours: todayMetric.sleep_hours || 7,
        energy_level: todayMetric.energy_level || 5,
        available_time: todayMetric.available_time || 60,
        target_workout: (todayMetric.target_workout || []) as unknown as string[],
      });
    }
    setIsEditingToday(true);
  };

  const handleCancelEditToday = () => {
    setIsEditingToday(false);
  };

  const handleSaveToday = async () => {
    if (!user) return;

    try {
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) {
        const char = user.id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const userId = Math.abs(hash);
      const today = getTodayDate();
      const dateObj = new Date(today + 'T00:00:00.000Z');

      await createUserMetric({
        user_id: userId,
        date: dateObj.toISOString(),
        sleep_hours: editTodayData.sleep_hours,
        energy_level: editTodayData.energy_level,
        available_time: editTodayData.available_time,
        target_workout: editTodayData.target_workout.length > 0 ? (editTodayData.target_workout as unknown as typeof TargetWorkout[]) : undefined,
      });

      await loadTodayCondition();
      setIsEditingToday(false);
      alert('Today\'s condition updated successfully!');
    } catch (err: any) {
      console.error('Failed to save today condition:', err);
      alert('Failed to save. Please try again.');
    }
  };

  // Handle workout toggle
  const handleWorkoutToggle = (workout: string) => {
    setEditTodayData(prev => ({
      ...prev,
      target_workout: prev.target_workout.includes(workout)
        ? prev.target_workout.filter(w => w !== workout)
        : [...prev.target_workout, workout],
    }));
  };

  // Load recommendation
  const handleGetRecommendation = async () => {
    if (!user || !todayMetric) return;

    setIsLoadingRecommendation(true);
    setShowRecommendation(true);
    try {
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) {
        const char = user.id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const userId = Math.abs(hash);
      const today = getTodayDate();
      const dateObj = new Date(today + 'T00:00:00.000Z');

      const response = await getRecommendation({
        user_id: userId,
        date: dateObj.toISOString(),
        sleep_hours: todayMetric.sleep_hours,
        energy_level: todayMetric.energy_level,
        available_time: todayMetric.available_time,
        target_workout: (todayMetric.target_workout || []) as typeof TargetWorkout[],
      });

      setRecommendation(response.data);
    } catch (err: any) {
      console.error('Failed to get recommendation:', err);
      setRecommendation({
        error: 'Recommendation feature is not yet implemented. Please check back later!',
      });
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  const workoutOptions = [
    { value: TargetWorkout.BACK, label: 'Back' },
    { value: TargetWorkout.CHEST, label: 'Chest' },
    { value: TargetWorkout.LEGS, label: 'Legs' },
    { value: TargetWorkout.SHOULDERS, label: 'Shoulders' },
    { value: TargetWorkout.BICEPS, label: 'Biceps' },
    { value: TargetWorkout.TRICEPS, label: 'Triceps' },
  ];

  // Calendar rendering
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 sm:p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h4 className="text-sm sm:text-base font-semibold text-gray-900">{monthName}</h4>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 sm:p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Next month"
            disabled={currentMonth >= new Date()}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1 sm:py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((day, index) => {
            if (day === null) {
              return <div key={index} className="aspect-square" />;
            }

            const dateStr = formatDateKey(year, month, day);
            const hasLogs = datesWithLogs.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isFuture = new Date(dateStr) > new Date();

            return (
              <button
                key={index}
                onClick={() => !isFuture && handleDateClick(dateStr)}
                disabled={isFuture}
                className={`
                  aspect-square text-xs sm:text-sm font-medium rounded-md transition-colors
                  ${isFuture ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                  ${isSelected 
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-500' 
                    : hasLogs && !isFuture
                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      : !isFuture
                        ? 'text-gray-700 hover:bg-gray-100'
                        : ''
                  }
                  ${isToday && !isSelected ? 'ring-2 ring-gray-400' : ''}
                `}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span>{day}</span>
                  {hasLogs && !isSelected && (
                    <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Dashboard</h2>
      
      <div className="space-y-4 sm:space-y-6">
        {/* Today's Condition Section */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Today's Condition</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-2">
              {todayMetric && !isEditingToday && (
                <button
                  onClick={handleGetRecommendation}
                  className="px-3 sm:px-4 py-2 bg-green-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Get Recommendation
                </button>
              )}
              {!isEditingToday ? (
                <button
                  onClick={handleEditToday}
                  className="px-3 sm:px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {todayMetric ? 'Edit' : 'Add Condition'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveToday}
                    className="px-3 sm:px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditToday}
                    className="px-3 sm:px-4 py-2 bg-gray-300 text-gray-700 text-xs sm:text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {isLoadingToday ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          ) : isEditingToday ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Sleep Hours
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={editTodayData.sleep_hours}
                  onChange={(e) => setEditTodayData({ ...editTodayData, sleep_hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Energy Level (1-10)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={editTodayData.energy_level}
                    onChange={(e) => setEditTodayData({ ...editTodayData, energy_level: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-base font-semibold text-indigo-600 min-w-[2rem] text-center">
                    {editTodayData.energy_level}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Available Time (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editTodayData.available_time}
                  onChange={(e) => setEditTodayData({ ...editTodayData, available_time: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Target Workout (select multiple)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {workoutOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={editTodayData.target_workout.includes(option.value)}
                        onChange={() => handleWorkoutToggle(option.value)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-xs sm:text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : todayMetric ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-indigo-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-gray-600 mb-1">Sleep Hours</p>
                <p className="text-lg sm:text-xl font-semibold text-indigo-900">
                  {todayMetric.sleep_hours ? `${todayMetric.sleep_hours}h` : '-'}
                </p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-gray-600 mb-1">Energy Level</p>
                <p className="text-lg sm:text-xl font-semibold text-indigo-900">
                  {todayMetric.energy_level ? `${todayMetric.energy_level}/10` : '-'}
                </p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-gray-600 mb-1">Available Time</p>
                <p className="text-lg sm:text-xl font-semibold text-indigo-900">
                  {todayMetric.available_time ? `${todayMetric.available_time} min` : '-'}
                </p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-gray-600 mb-1">Target Workout</p>
                <p className="text-sm font-semibold text-indigo-900">
                  {todayMetric.target_workout && Array.isArray(todayMetric.target_workout) && todayMetric.target_workout.length > 0
                    ? ((todayMetric.target_workout as unknown as string[]).map((w: string) => workoutOptions.find(o => o.value === w)?.label || w).join(', '))
                    : '-'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">No condition data for today.</p>
              <p className="text-xs text-gray-400">Click "Add Condition" to input today's condition.</p>
            </div>
          )}
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
                    <p className="text-sm text-gray-500">Loading recommendation...</p>
                  </div>
                ) : recommendation?.error ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-red-500">{recommendation.error}</p>
                  </div>
                ) : recommendation ? (
                  <div className="space-y-4">
                    {recommendation.predicted_success_rate !== null && recommendation.predicted_success_rate !== undefined && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-xs text-green-700 mb-1">Predicted Success Rate</p>
                        <p className="text-2xl font-bold text-green-900">
                          {(recommendation.predicted_success_rate * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                    {recommendation.predicted_fatigue !== null && recommendation.predicted_fatigue !== undefined && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-xs text-yellow-700 mb-1">Predicted Fatigue</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          {recommendation.predicted_fatigue.toFixed(1)}/10
                        </p>
                      </div>
                    )}
                    {recommendation.recommended_workout && (
                      <div className="space-y-4">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                          <p className="text-xs text-indigo-700 mb-2 font-medium">Recommended Workout</p>
                          <p className="text-sm font-semibold text-indigo-900">{recommendation.recommended_workout.name || 'Workout Plan'}</p>
                          {recommendation.recommended_workout.description && (
                            <p className="text-xs text-indigo-700 mt-2">{recommendation.recommended_workout.description}</p>
                          )}
                        </div>
                        
                        {/* Exercises with weight recommendations - Only show info, no RPE input */}
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-gray-800">Exercises</p>
                          {recommendation.recommended_workout.steps && recommendation.recommended_workout.steps.map((step: any, idx: number) => (
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
                          onClick={() => {
                            if (!recommendation?.recommended_workout) return;
                            
                            // Save recommendation to localStorage for WorkoutLog page
                            const recommendationData = {
                              workout: recommendation.recommended_workout,
                              predicted_success_rate: recommendation.predicted_success_rate,
                              predicted_fatigue: recommendation.predicted_fatigue,
                              warnings: recommendation.warnings,
                              date: getTodayDate(),
                              energy_level: todayMetric?.energy_level,
                            };
                            
                            localStorage.setItem('importedWorkout', JSON.stringify(recommendationData));
                            
                            // Navigate to WorkoutLog page
                            navigate('/workout-log');
                          }}
                          className="w-full bg-green-600 text-white py-2.5 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm sm:text-base font-medium mt-4"
                        >
                          Import to Workout Log
                        </button>
                      </div>
                    )}
                    {recommendation.warnings && recommendation.warnings.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-xs text-red-700 mb-2 font-medium">Warnings</p>
                        <ul className="list-disc list-inside space-y-1">
                          {recommendation.warnings.map((warning: string, index: number) => (
                            <li key={index} className="text-xs text-red-700">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!recommendation.recommended_workout && !recommendation.predicted_success_rate && !recommendation.predicted_fatigue && (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">No recommendation available at this time.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No recommendation data available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workout Logs Section */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Workout History</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                View all your workout records
              </p>
            </div>
            <button
              onClick={handleToggleWorkoutLogs}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white text-sm sm:text-base font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              {showWorkoutLogs ? 'Hide Logs' : 'View Workout Logs'}
            </button>
          </div>

          {showWorkoutLogs && (
            <div className="mt-4 space-y-4 sm:space-y-6">
              {isLoading ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-sm sm:text-base text-gray-500">Loading workout logs...</p>
                </div>
              ) : error ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-sm sm:text-base text-red-500">{error}</p>
                  <button
                    onClick={loadWorkoutLogs}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Retry
                  </button>
                </div>
              ) : workoutLogs.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-sm sm:text-base text-gray-500">No workout logs found.</p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-2">
                    Start logging your workouts in the Workout Log page.
                  </p>
                </div>
              ) : (
                <>
                  {/* Calendar */}
                  <div className="max-w-md mx-auto">
                    {renderCalendar()}
                    <div className="mt-3 text-center">
                      <p className="text-xs text-gray-500">
                        <span className="inline-block w-3 h-3 bg-indigo-100 rounded-full mr-1 align-middle"></span>
                        Days with workouts
                      </p>
                    </div>
                  </div>

                  {/* Selected Date Logs */}
                  {selectedDate && (
                    <div className="mt-4">
                      {isLoadingDate ? (
                        <div className="text-center py-6">
                          <p className="text-sm text-gray-500">Loading...</p>
                        </div>
                      ) : selectedDateLogs.length === 0 ? (
                        <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                          <div className="text-center py-6">
                            <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2">
                              {(() => {
                                // Parse date string directly to avoid timezone issues
                                const [year, month, day] = selectedDate.split('-').map(Number);
                                const dateObj = new Date(year, month - 1, day);
                                const formattedDateLong = dateObj.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                });
                                const formattedDateShort = dateObj.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                });
                                return (
                                  <>
                                    <span className="hidden sm:inline">{formattedDateLong}</span>
                                    <span className="sm:hidden">{formattedDateShort}</span>
                                  </>
                                );
                              })()}
                            </h4>
                            <p className="text-sm sm:text-base text-gray-500 mt-2">
                              No workout logs found for this date.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 sm:space-y-6">
                          {groupedByDate.map(([date, logs]) => {
                    const exerciseGroups = groupLogsByExercise(logs);
                    // Parse date string directly to avoid timezone issues
                    const [year, month, day] = date.split('-').map(Number);
                    const dateObj = new Date(year, month - 1, day);
                    const formattedDateLong = dateObj.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    const formattedDateShort = dateObj.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    const isEditing = editingDate === date;
                    const metric = userMetrics[date];
                    const currentEnergyLevel = isEditing ? editEnergyLevel : (metric?.energy_level || null);

                    return (
                      <div key={date} className="border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div>
                            <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
                              <span className="hidden sm:inline">{formattedDateLong}</span>
                              <span className="sm:hidden">{formattedDateShort}</span>
                            </h4>
                            {currentEnergyLevel && (
                              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                Energy Level: <span className="font-medium text-indigo-600">{currentEnergyLevel}/10</span>
                              </p>
                            )}
                          </div>
                          {!isEditing ? (
                            <button
                              onClick={() => handleEditClick(date, logs)}
                              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Edit
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEdit(date, logs)}
                                disabled={isSaving}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                {isSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-300 text-gray-700 text-xs sm:text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Workout Date Edit (only in edit mode) */}
                        {isEditing && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                              Workout Date
                            </label>
                            <input
                              type="date"
                              value={editWorkoutDate || ''}
                              onChange={(e) => setEditWorkoutDate(e.target.value)}
                              max={(() => {
                                const today = new Date();
                                const year = today.getFullYear();
                                const month = String(today.getMonth() + 1).padStart(2, '0');
                                const day = String(today.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                              })()}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Change the date for all workout logs on this day
                            </p>
                          </div>
                        )}

                        {/* Energy Level Edit (only in edit mode) */}
                        {isEditing && (
                          <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                              Energy Level (1-10)
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={editEnergyLevel || 5}
                                onChange={(e) => setEditEnergyLevel(Number(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                              />
                              <span className="text-base sm:text-lg font-semibold text-indigo-600 min-w-[2rem] text-center">
                                {editEnergyLevel || '-'}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-3 sm:space-y-4">
                          {Object.entries(exerciseGroups).map(([exerciseName, exerciseLogs]) => (
                            <div key={exerciseName} className="bg-gray-50 rounded-lg p-2 sm:p-3 lg:p-4">
                              <h5 className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 mb-2 sm:mb-3">
                                {exerciseName}
                              </h5>
                              
                              {/* Mobile: Card layout */}
                              <div className="sm:hidden space-y-2">
                                {exerciseLogs.map((log) => (
                                  <div key={log.id} className="bg-white rounded-md p-2 border border-gray-200">
                                    {isEditing ? (
                                      <div>
                                        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                                          <div>
                                            <label className="text-gray-600 block mb-1">Reps</label>
                                            <input
                                              type="number"
                                              value={editFormData[log.id]?.reps || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, [log.id]: { ...editFormData[log.id], reps: Number(e.target.value) } })}
                                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-gray-600 block mb-1">Weight (kg)</label>
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={editFormData[log.id]?.weight || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, [log.id]: { ...editFormData[log.id], weight: Number(e.target.value) } })}
                                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-gray-600 block mb-1">RPE</label>
                                            <input
                                              type="number"
                                              min="1"
                                              max="10"
                                              step="0.5"
                                              value={editFormData[log.id]?.rpe || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, [log.id]: { ...editFormData[log.id], rpe: Number(e.target.value) || undefined } })}
                                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                            />
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteLog(log.id, date)}
                                          className="w-full mt-2 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        >
                                          Delete Set
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex-1">
                                          <span className="font-medium text-gray-700">Set {log.set_number}</span>
                                          <div className="flex items-center gap-3 text-gray-600 mt-1">
                                            <span>{log.reps} reps</span>
                                            <span>{log.weight} kg</span>
                                            {log.rpe && <span className="text-indigo-600">RPE {log.rpe}</span>}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Desktop: Table layout */}
                              <div className="hidden sm:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-3 lg:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">Set</th>
                                      <th className="px-3 lg:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">Reps</th>
                                      <th className="px-3 lg:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">Weight (kg)</th>
                                      <th className="px-3 lg:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">RPE</th>
                                      {isEditing && (
                                        <th className="px-3 lg:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">Action</th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {exerciseLogs.map((log) => (
                                      <tr key={log.id}>
                                        <td className="px-3 lg:px-4 py-2 text-xs sm:text-sm text-gray-900">{log.set_number}</td>
                                        <td className="px-3 lg:px-4 py-2">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              value={editFormData[log.id]?.reps || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, [log.id]: { ...editFormData[log.id], reps: Number(e.target.value) } })}
                                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                            />
                                          ) : (
                                            <span className="text-xs sm:text-sm text-gray-900">{log.reps}</span>
                                          )}
                                        </td>
                                        <td className="px-3 lg:px-4 py-2">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={editFormData[log.id]?.weight || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, [log.id]: { ...editFormData[log.id], weight: Number(e.target.value) } })}
                                              className="w-20 px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                            />
                                          ) : (
                                            <span className="text-xs sm:text-sm text-gray-900">{log.weight}</span>
                                          )}
                                        </td>
                                        <td className="px-3 lg:px-4 py-2">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              min="1"
                                              max="10"
                                              step="0.5"
                                              value={editFormData[log.id]?.rpe || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, [log.id]: { ...editFormData[log.id], rpe: Number(e.target.value) || undefined } })}
                                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                            />
                                          ) : (
                                            <span className="text-xs sm:text-sm text-gray-900">
                                              {log.rpe ? log.rpe : '-'}
                                            </span>
                                          )}
                                        </td>
                                        {isEditing && (
                                          <td className="px-3 lg:px-4 py-2">
                                            <button
                                              onClick={() => handleDeleteLog(log.id, date)}
                                              className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                            >
                                              Delete
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show message when no date is selected */}
                  {!selectedDate && (
                    <div className="text-center py-6 sm:py-8">
                      <p className="text-sm sm:text-base text-gray-500">
                        Click on a date with workouts to view details
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Placeholder for future features */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-600">More dashboard features coming soon.</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Training volume charts, muscle balance analysis, trends, overtraining warnings, etc.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
