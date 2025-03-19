import api from './api';
import axios, { AxiosError } from 'axios';
import { 
  WorkoutPlanRequest, 
  NutritionAdviceRequest, 
  NutritionalValuesRequest,
  ErrorResponse
} from '../types';

// הגדרת טיפוסים פנימיים לשירות
interface ServerWorkoutPlanRequest {
  fitnessLevel: string;
  goals: string[];
  daysPerWeek: number;
  equipment: string;
  provider?: 'gemini' | 'openai';
}

interface ServerNutritionAdviceRequest {
  age: number;
  weight: number;
  height: number;
  activityLevel: string;
  dietaryPreferences: string;
  healthGoals: string;
  existingConditions?: string;
  provider?: 'gemini' | 'openai';
}

interface WorkoutPlanResponse {
  workoutPlan: string;
  generatedBy?: string;
}

interface NutritionAdviceResponse {
  nutritionAdvice: string;
  generatedBy?: string;
}

interface CalculateNutritionResponse {
  nutritionalValues: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
    [key: string]: any;
  };
  generatedBy?: string;
}

// שירות לבקשות הקשורות ל-AI
export const aiService = {
  /**
   * ייצור תוכנית אימונים מותאמת אישית
   */
  async generateWorkoutPlan(request: WorkoutPlanRequest): Promise<string> {
    try {
      console.log('[aiService] Generating workout plan with params:', request);
      
      // וידוא שמטרות הן במבנה תקין
      const validatedRequest = {
        ...request,
        goals: Array.isArray(request.goals) ? request.goals : [request.goals].filter(Boolean)
      };
      
      console.log('[aiService] Sending workout plan request:', JSON.stringify(validatedRequest));
      
      // הסרת /api מתחילת הנתיב כי baseURL כבר כולל אותו
      const response = await api.post<WorkoutPlanResponse>('/ai/workout-plan', validatedRequest);
      
      console.log('[aiService] Received workout plan response:', response.data);
      return response.data.workoutPlan;
    } catch (error: any) {
      console.error('[aiService] Error generating workout plan:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'אירעה שגיאה בעת יצירת תוכנית האימונים');
    }
  },

  /**
   * חישוב ערכים תזונתיים למזון מסוים
   */
  async calculateNutrition(food: string): Promise<CalculateNutritionResponse> {
    try {
      console.log('[aiService] Calculating nutrition for:', food);
      
      // הסרת /api מתחילת הנתיב כי baseURL כבר כולל אותו
      const response = await api.post<CalculateNutritionResponse>('/ai/calculate-nutrition', { food });
      
      console.log('[aiService] Received nutrition calculation:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[aiService] Error calculating nutrition:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'אירעה שגיאה בעת חישוב הערכים התזונתיים');
    }
  },

  /**
   * ייצור ייעוץ תזונה מותאם אישית
   */
  async generateNutritionAdvice(request: NutritionAdviceRequest): Promise<string> {
    try {
      console.log('[aiService] Generating nutrition advice with params:', request);
      
      // הבקשה כבר במבנה הנכון שהשרת מצפה לו (NutritionAdviceRequest)
      console.log('[aiService] Sending nutrition advice request:', JSON.stringify(request));
      
      // הסרת /api מתחילת הנתיב כי baseURL כבר כולל אותו
      const response = await api.post<NutritionAdviceResponse>('/ai/nutrition-advice', request);
      
      console.log('[aiService] Received nutrition advice:', response.data);
      return response.data.nutritionAdvice;
    } catch (error: any) {
      console.error('[aiService] Error generating nutrition advice:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'אירעה שגיאה בעת יצירת המלצות התזונה');
    }
  },

  /**
   * קבלת טיפים לכושר ובריאות
   */
  async getFitnessTips(category?: string): Promise<{ tips: Array<{ category: string; tip: string }> }> {
    try {
      console.log('[aiService] Getting fitness tips, category:', category || 'all');
      
      // הסרת /api מתחילת הנתיב כי baseURL כבר כולל אותו
      const response = await api.get('/ai/fitness-tips', { params: { category } });
      
      console.log('[aiService] Received fitness tips:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[aiService] Error getting fitness tips:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'אירעה שגיאה בעת קבלת טיפים לכושר');
    }
  }
};

// ייצוא ישיר של האובייקט
export default aiService; 