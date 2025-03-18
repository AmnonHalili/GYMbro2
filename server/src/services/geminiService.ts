import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Generate workout plan
export const generateWorkoutPlan = async (
  level: string,
  goal: string,
  daysPerWeek: number,
  preferences: string
): Promise<string> => {
  try {
    const prompt = `Create a personalized workout plan with the following details:
      - Fitness level: ${level}
      - Goal: ${goal}
      - Days per week: ${daysPerWeek}
      - Preferences/limitations: ${preferences}
      
      Please provide a detailed plan with specific exercises, sets, reps, and rest periods for each day.
      Include warm-up and cool-down recommendations.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error('Error generating workout plan:', error);
    throw new Error('Failed to generate workout plan');
  }
};

// Generate nutrition advice
export const generateNutritionAdvice = async (
  goal: string,
  dietaryRestrictions: string,
  currentWeight: number,
  targetWeight: number
): Promise<string> => {
  try {
    const prompt = `הכן תוכנית תזונה מותאמת אישית בעברית עבור אדם עם הפרטים הבאים:
      - מטרה: ${goal}
      - הגבלות תזונתיות: ${dietaryRestrictions || 'אין'}
      - משקל נוכחי: ${currentWeight} ק"ג
      - משקל יעד: ${targetWeight} ק"ג
      
      אנא כלול את הפרטים הבאים:
      - יעד קלורי יומי
      - חלוקת מאקרו-נוטריאנטים (חלבונים, פחמימות, שומנים)
      - המלצות לתזמון ארוחות
      - תפריט לדוגמא ליום
      - מזונות שמומלץ להתמקד בהם וכאלה שכדאי להימנע מהם
      
      הקפד לכתוב את כל התשובה בעברית מלאה.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error('Error generating nutrition advice:', error);
    throw new Error('Failed to generate nutrition advice');
  }
};

// Calculate nutritional values
export const calculateNutritionalValues = async (
  foodItems: string[]
): Promise<string> => {
  try {
    const foodItemsList = foodItems.join(', ');
    const prompt = `Calculate the approximate nutritional values for the following food items: ${foodItemsList}.
      
      Please provide:
      - Total calories
      - Protein (g)
      - Carbohydrates (g)
      - Fat (g)
      - Fiber (g)
      - Estimated vitamins and minerals
      
      Present the information in a clear, structured format.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error('Error calculating nutritional values:', error);
    throw new Error('Failed to calculate nutritional values');
  }
}; 