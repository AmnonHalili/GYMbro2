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

// Generate workout plan
export const generateWorkoutPlan = async (
  request: WorkoutPlanRequest
): Promise<WorkoutPlanResponse> => {
  try {
    // בדיקה שיש אכן טוקן לפני הבקשה
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('[aiService] No auth token available for workout plan request');
      throw new Error('Authentication required. Please login again.');
    }
    
    // בדיקת תקינות מבנה הטוקן
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('[aiService] Invalid token format detected');
      // מנקים את הטוקן הלא תקין ומחזירים שגיאה
      localStorage.removeItem('accessToken');
      throw new Error('Invalid authentication token. Please login again.');
    }
    
    // העברת הבקשה כפי שהיא - כבר במבנה הנכון
    console.log('[aiService] Sending workout plan request:', JSON.stringify(request));
    
    // בקשה לשרת עם אימות - נתיב מעודכן כדי להתאים לשרת
    const response = await api.post('/api/ai/generate-workout-plan', request);
    console.log('[aiService] Workout plan response:', response.status, response.statusText);
    
    return response.data;
  } catch (error: unknown) {
    console.error('[aiService] Error in generateWorkoutPlan:', error);
    
    // בדיקה האם יש תגובת שרת שנכשלה
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response) {
        console.error('[aiService] Server returned error:', {
          status: axiosError.response.status,
          data: axiosError.response.data,
          headers: axiosError.response.headers
        });
        
        // שגיאות אימות - להציע למשתמש להתחבר מחדש
        if (axiosError.response.status === 401 || axiosError.response.status === 403) {
          return Promise.reject({
            ...error,
            message: 'Your session has expired. Please login again to generate a workout plan.'
          });
        }
      } else if (axiosError.request) {
        // בקשה נשלחה אך לא התקבלה תשובה
        console.error('[aiService] No response received:', axiosError.request);
      }
    } else {
      // שגיאה אחרת במהלך הגדרת הבקשה
      console.error('[aiService] Request setup error:', error instanceof Error ? error.message : String(error));
    }
    
    throw error;
  }
};

// Generate nutrition advice
export const generateNutritionAdvice = async (
  request: NutritionAdviceRequest
): Promise<NutritionAdviceResponse> => {
  try {
    // וידוא שהנתונים תקינים לפני שליחה לשרת
    const validatedRequest: ServerNutritionAdviceRequest = {
      age: request.age,
      weight: request.weight,
      height: request.height,
      activityLevel: request.activityLevel,
      dietaryPreferences: request.dietaryPreferences || '',
      healthGoals: request.healthGoals,
      existingConditions: request.existingConditions || '',
      provider: request.provider
    };
    
    console.log('[aiService] Sending nutrition advice request:', JSON.stringify(validatedRequest));
    const response = await api.post('/api/ai/nutrition-advice', validatedRequest);
    console.log('[aiService] Nutrition advice response:', JSON.stringify(response.data));
    
    return response.data;
  } catch (error: unknown) {
    console.error('[aiService] Error in generateNutritionAdvice:', error);
    
    // בדיקה האם יש תגובת שרת שנכשלה
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response) {
        console.error('[aiService] Server returned error:', {
          status: axiosError.response.status,
          data: axiosError.response.data,
          headers: axiosError.response.headers
        });
      } else if (axiosError.request) {
        // בקשה נשלחה אך לא התקבלה תשובה
        console.error('[aiService] No response received:', axiosError.request);
      }
    } else {
      // שגיאה אחרת במהלך הגדרת הבקשה
      console.error('[aiService] Request setup error:', error instanceof Error ? error.message : String(error));
    }
    
    throw error;
  }
};

// Calculate nutritional values
export const calculateNutrition = async (food: string): Promise<CalculateNutritionResponse> => {
  try {
    console.log('[aiService] Calculating nutrition for:', food);
    
    const response = await api.post<CalculateNutritionResponse>('/api/ai/calculate-nutrition', { food });
    
    console.log('[aiService] Received nutrition calculation:', response.data);
    return response.data;
  } catch (error: unknown) {
    console.error('[aiService] Error in calculateNutrition:', error);
    
    // בדיקה האם יש תגובת שרת שנכשלה
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response) {
        console.error('[aiService] Server returned error:', {
          status: axiosError.response.status,
          data: axiosError.response.data,
          headers: axiosError.response.headers
        });
      } else if (axiosError.request) {
        // בקשה נשלחה אך לא התקבלה תשובה
        console.error('[aiService] No response received:', axiosError.request);
      }
    } else {
      // שגיאה אחרת במהלך הגדרת הבקשה
      console.error('[aiService] Request setup error:', error instanceof Error ? error.message : String(error));
    }
    
    throw error;
  }
};

// שירות לבקשות הקשורות ל-AI
export const aiService = {
  /**
   * ייצור תוכנית אימונים מותאמת אישית
   */
  async generateWorkoutPlan(request: WorkoutPlanRequest): Promise<string> {
    try {
      console.log('[aiService] Generating workout plan with params:', request);
      
      // בקשה כבר במבנה הנכון שמוגדר ב-WorkoutPlanRequest 
      // כבר מכיל: fitnessLevel, goals, daysPerWeek, equipment
      console.log('[aiService] Sending workout plan request:', JSON.stringify(request));
      
      const response = await api.post<WorkoutPlanResponse>('/api/ai/generate-workout-plan', request);
      
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
      
      const response = await api.post<CalculateNutritionResponse>('/api/ai/calculate-nutrition', { food });
      
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
      
      const response = await api.post<NutritionAdviceResponse>('/api/ai/nutrition-advice', request);
      
      console.log('[aiService] Received nutrition advice:', response.data);
      return response.data.nutritionAdvice;
    } catch (error: any) {
      console.error('[aiService] Error generating nutrition advice:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'אירעה שגיאה בעת יצירת המלצות התזונה');
    }
  },

  /**
   * קבלת טיפים לאימון וכושר
   */
  async getFitnessTips(category?: string): Promise<string[]> {
    try {
      console.log('[aiService] Getting fitness tips for category:', category);
      
      const response = await api.get('/api/ai/fitness-tips', { params: { category } });
      
      console.log('[aiService] Received fitness tips:', response.data);
      return response.data.tips;
    } catch (error: any) {
      console.error('[aiService] Error getting fitness tips:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'אירעה שגיאה בעת קבלת טיפים לאימון');
    }
  }
}; 