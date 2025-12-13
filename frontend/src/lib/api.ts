import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enums
export const TargetWorkout = {
  BACK: 'back',
  CHEST: 'chest',
  LEGS: 'legs',
  SHOULDERS: 'shoulders',
  BICEPS: 'biceps',
  TRICEPS: 'triceps',
}

// API endpoint types
export interface UserMetric {
  id: number;
  user_id: number;
  date: string;
  sleep_hours?: number;
  energy_level?: number;
  available_time?: number;
  target_workout?: typeof TargetWorkout[];
  notes?: string;
  created_at: string;
}

export interface EventLog {
  id: number;
  user_id: number;
  workout_id?: number;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight: number;
  rpe?: number;
  completed: boolean;
  logged_at: string;
}

export interface ExercisesResponse {
  body_part?: string;
  exercises: string[];
  allow_custom: boolean;
}

export interface ExercisesByBodyPartResponse {
  exercises_by_body_part: Record<string, string[]>;
  allow_custom: boolean;
}

// API functions
export const healthCheck = () => api.get('/health');

export const getExercises = (bodyPart?: string) => {
  const params = bodyPart ? { body_part: bodyPart } : {};
  return api.get<ExercisesResponse | ExercisesByBodyPartResponse>('/exercises', { params });
};

export const createUserMetric = (data: Partial<UserMetric>) =>
  api.post('/user-metrics', data);

export const createEventLog = (data: Partial<EventLog>) =>
  api.post('/event-logs', data);

export const getRecommendation = (data: {
  user_id: number;
  date: string; 
  sleep_hours?: number;
  energy_level?: number;
  available_time?: number;
  target_workout?: typeof TargetWorkout[];
}) => api.post('/recommendations', data);
