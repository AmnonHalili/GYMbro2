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
    saturatedFat?: string;
    fiber?: string;
    sugars?: string;
    sodium?: string;
    cholesterol?: string;
    vitamins?: string[] | string;
    minerals?: string[] | string;
    allergies?: string[] | string;
    [key: string]: any;
  };
  nutritionInfo?: any;
  generatedBy?: string;
}

/**
 * פונקציית עזר לחילוץ ערכים תזונתיים מטקסט
 */
const extractNutritionalValues = (text: string): any => {
  const result: any = {};
  
  // חילוץ קלוריות
  const caloriesMatch = text.match(/calories:?\s*(\d+)/i) || text.match(/קלוריות:?\s*(\d+)/i);
  if (caloriesMatch) {
    result.calories = parseInt(caloriesMatch[1], 10);
  }
  
  // חילוץ חלבון
  const proteinMatch = text.match(/protein:?\s*([\d.]+)\s*g/i) || text.match(/חלבון:?\s*([\d.]+)\s*g/i);
  if (proteinMatch) {
    result.protein = `${proteinMatch[1]}g`;
  }
  
  // חילוץ פחמימות
  const carbsMatch = text.match(/carbs:?\s*([\d.]+)\s*g/i) || 
                     text.match(/carbohydrates:?\s*([\d.]+)\s*g/i) || 
                     text.match(/פחמימות:?\s*([\d.]+)\s*g/i);
  if (carbsMatch) {
    result.carbs = `${carbsMatch[1]}g`;
  }
  
  // חילוץ שומן
  const fatMatch = text.match(/fat:?\s*([\d.]+)\s*g/i) || text.match(/שומן:?\s*([\d.]+)\s*g/i);
  if (fatMatch) {
    result.fat = `${fatMatch[1]}g`;
  }
  
  // חילוץ שומן רווי
  const saturatedFatMatch = text.match(/saturated fat:?\s*([\d.]+)\s*g/i) || text.match(/שומן רווי:?\s*([\d.]+)\s*g/i);
  if (saturatedFatMatch) {
    result.saturatedFat = `${saturatedFatMatch[1]}g`;
  }
  
  // חילוץ סיבים
  const fiberMatch = text.match(/fiber:?\s*([\d.]+)\s*g/i) || text.match(/סיבים:?\s*([\d.]+)\s*g/i);
  if (fiberMatch) {
    result.fiber = `${fiberMatch[1]}g`;
  }
  
  // חילוץ סוכרים
  const sugarsMatch = text.match(/sugars:?\s*([\d.]+)\s*g/i) || text.match(/סוכרים:?\s*([\d.]+)\s*g/i);
  if (sugarsMatch) {
    result.sugars = `${sugarsMatch[1]}g`;
  }
  
  // חילוץ כולסטרול
  const cholesterolMatch = text.match(/cholesterol:?\s*([\d.]+)\s*mg/i) || text.match(/כולסטרול:?\s*([\d.]+)\s*mg/i);
  if (cholesterolMatch) {
    result.cholesterol = `${cholesterolMatch[1]}mg`;
  }
  
  // חילוץ נתרן
  const sodiumMatch = text.match(/sodium:?\s*([\d.]+)\s*mg/i) || text.match(/נתרן:?\s*([\d.]+)\s*mg/i);
  if (sodiumMatch) {
    result.sodium = `${sodiumMatch[1]}mg`;
  }
  
  return result;
};

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
      
      // יצירת בקשה עם timeout ארוך יותר (60 שניות במקום 20)
      const response = await api.post<WorkoutPlanResponse>('/ai/workout-plan', validatedRequest, {
        timeout: 60000, // 60 seconds timeout instead of default 20
      });
      
      console.log('[aiService] Received workout plan response:', response.data);
      return response.data.workoutPlan;
    } catch (error: any) {
      // בדיקה אם השגיאה היא timeout
      if (error.message && error.message.includes('timeout')) {
        console.error('[aiService] Request timed out. The AI service is taking longer than expected.');
        throw new Error('יצירת תוכנית האימון לוקחת זמן רב. אנא נסה שוב מאוחר יותר או בחר פרמטרים אחרים.');
      }
      
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
      const response = await api.post<any>('/ai/calculate-nutrition', { food }, {
        timeout: 60000, // 60 seconds timeout instead of default 20
      });
      
      console.log('[aiService] Received nutrition calculation:', response.data);
      
      // המרת הפורמט מהשרת לפורמט שהקליינט מצפה לו
      let nutritionInfo = response.data.nutritionInfo || {};
      
      // אם התגובה היא מחרוזת ולא אובייקט, ננסה לחלץ ממנה ערכים תזונתיים
      if (typeof nutritionInfo === 'string') {
        console.log('[aiService] Trying to extract nutritional values from text response');
        const extractedValues = extractNutritionalValues(nutritionInfo);
        
        // אם הצלחנו לחלץ לפחות ערך אחד, נשתמש בו
        if (Object.keys(extractedValues).length > 0) {
          console.log('[aiService] Successfully extracted values:', extractedValues);
          nutritionInfo = { ...extractedValues, rawText: nutritionInfo };
        }
      }
      
      // יצירת אובייקט התוצאה עם כל הערכים התזונתיים
      const result: CalculateNutritionResponse = {
        nutritionalValues: {
          calories: nutritionInfo.calories || 0,
          protein: nutritionInfo.protein || '0g',
          carbs: nutritionInfo.carbs || nutritionInfo.carbohydrates || '0g',
          fat: nutritionInfo.fat || '0g',
          saturatedFat: nutritionInfo.saturatedFat || nutritionInfo['saturated fat'] || undefined,
          fiber: nutritionInfo.fiber || undefined,
          sugars: nutritionInfo.sugars || undefined,
          sodium: nutritionInfo.sodium || undefined,
          cholesterol: nutritionInfo.cholesterol || undefined,
          vitamins: nutritionInfo.vitamins || undefined,
          minerals: nutritionInfo.minerals || undefined,
          allergies: nutritionInfo.allergies || undefined,
          ...nutritionInfo // שמירת כל השדות האחרים שקיימים במקור
        },
        nutritionInfo,
        generatedBy: response.data.generatedBy
      };
      
      return result;
    } catch (error: any) {
      // בדיקה אם השגיאה היא timeout
      if (error.message && error.message.includes('timeout')) {
        console.error('[aiService] Request timed out. The AI service is taking longer than expected.');
        throw new Error('חישוב הערכים התזונתיים לוקח זמן רב. אנא נסה שוב מאוחר יותר.');
      }
      
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
      const response = await api.post<NutritionAdviceResponse>('/ai/nutrition-advice', request, {
        timeout: 60000, // 60 seconds timeout instead of default 20
      });
      
      console.log('[aiService] Received nutrition advice:', response.data);
      return response.data.nutritionAdvice;
    } catch (error: any) {
      // בדיקה אם השגיאה היא timeout
      if (error.message && error.message.includes('timeout')) {
        console.error('[aiService] Request timed out. The AI service is taking longer than expected.');
        throw new Error('יצירת המלצות התזונה לוקחת זמן רב. אנא נסה שוב מאוחר יותר.');
      }
      
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
      const response = await api.get('/ai/fitness-tips', { 
        params: { category },
        timeout: 60000 // 60 seconds timeout instead of default 20
      });
      
      console.log('[aiService] Received fitness tips:', response.data);
      return response.data;
    } catch (error: any) {
      // בדיקה אם השגיאה היא timeout
      if (error.message && error.message.includes('timeout')) {
        console.error('[aiService] Request timed out. The AI service is taking longer than expected.');
        throw new Error('טעינת הטיפים לוקחת זמן רב. אנא נסה שוב מאוחר יותר.');
      }
      
      console.error('[aiService] Error getting fitness tips:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'אירעה שגיאה בעת קבלת טיפים לכושר');
    }
  }
}; 

// ייצוא ישיר של האובייקט
export default aiService; 