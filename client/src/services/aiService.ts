import api from './api';
import { 
  WorkoutPlanRequest, 
  NutritionAdviceRequest, 
  NutritionalValuesRequest 
} from '../types';

// Generate workout plan
export const generateWorkoutPlan = async (
  request: WorkoutPlanRequest
): Promise<{ workoutPlan: string }> => {
  const response = await api.post('/ai/workout-plan', request);
  return response.data;
};

// Generate nutrition advice
export const generateNutritionAdvice = async (
  request: NutritionAdviceRequest
): Promise<{ nutritionAdvice: string }> => {
  const response = await api.post('/ai/nutrition-advice', request);
  return response.data;
};

// Calculate nutritional values
export const calculateNutritionalValues = async (
  request: NutritionalValuesRequest
): Promise<{ nutritionalValues: string }> => {
  const response = await api.post('/ai/nutritional-values', request);
  return response.data;
}; 