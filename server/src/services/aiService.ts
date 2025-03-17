import * as geminiService from './geminiService';
import * as openaiService from './openaiService';

// AI Provider type
export type AIProvider = 'gemini' | 'openai';

// Default AI provider
const defaultProvider: AIProvider = process.env.GEMINI_API_KEY ? 'gemini' : 'openai';

// Generate workout plan
export const generateWorkoutPlan = async (
  level: string,
  goal: string,
  daysPerWeek: number,
  preferences: string,
  provider: AIProvider = defaultProvider
): Promise<string> => {
  try {
    if (provider === 'gemini') {
      return await geminiService.generateWorkoutPlan(level, goal, daysPerWeek, preferences);
    } else {
      return await openaiService.generateWorkoutPlan(level, goal, daysPerWeek, preferences);
    }
  } catch (error) {
    console.error(`Error with ${provider} workout plan generation:`, error);
    
    // Try fallback provider if primary fails
    const fallbackProvider = provider === 'gemini' ? 'openai' : 'gemini';
    try {
      console.log(`Trying fallback provider: ${fallbackProvider}`);
      if (fallbackProvider === 'gemini') {
        return await geminiService.generateWorkoutPlan(level, goal, daysPerWeek, preferences);
      } else {
        return await openaiService.generateWorkoutPlan(level, goal, daysPerWeek, preferences);
      }
    } catch (fallbackError) {
      console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
      throw new Error('Failed to generate workout plan with both providers');
    }
  }
};

// Generate nutrition advice
export const generateNutritionAdvice = async (
  goal: string,
  dietaryRestrictions: string,
  currentWeight: number,
  targetWeight: number,
  provider: AIProvider = defaultProvider
): Promise<string> => {
  try {
    if (provider === 'gemini') {
      return await geminiService.generateNutritionAdvice(goal, dietaryRestrictions, currentWeight, targetWeight);
    } else {
      return await openaiService.generateNutritionAdvice(goal, dietaryRestrictions, currentWeight, targetWeight);
    }
  } catch (error) {
    console.error(`Error with ${provider} nutrition advice generation:`, error);
    
    // Try fallback provider if primary fails
    const fallbackProvider = provider === 'gemini' ? 'openai' : 'gemini';
    try {
      console.log(`Trying fallback provider: ${fallbackProvider}`);
      if (fallbackProvider === 'gemini') {
        return await geminiService.generateNutritionAdvice(goal, dietaryRestrictions, currentWeight, targetWeight);
      } else {
        return await openaiService.generateNutritionAdvice(goal, dietaryRestrictions, currentWeight, targetWeight);
      }
    } catch (fallbackError) {
      console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
      throw new Error('Failed to generate nutrition advice with both providers');
    }
  }
};

// Calculate nutritional values
export const calculateNutritionalValues = async (
  foodItems: string[],
  provider: AIProvider = defaultProvider
): Promise<string> => {
  try {
    if (provider === 'gemini') {
      return await geminiService.calculateNutritionalValues(foodItems);
    } else {
      return await openaiService.calculateNutritionalValues(foodItems);
    }
  } catch (error) {
    console.error(`Error with ${provider} nutritional values calculation:`, error);
    
    // Try fallback provider if primary fails
    const fallbackProvider = provider === 'gemini' ? 'openai' : 'gemini';
    try {
      console.log(`Trying fallback provider: ${fallbackProvider}`);
      if (fallbackProvider === 'gemini') {
        return await geminiService.calculateNutritionalValues(foodItems);
      } else {
        return await openaiService.calculateNutritionalValues(foodItems);
      }
    } catch (fallbackError) {
      console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
      throw new Error('Failed to calculate nutritional values with both providers');
    }
  }
}; 