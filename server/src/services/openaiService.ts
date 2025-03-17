import OpenAI from 'openai';

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a professional fitness trainer with expertise in creating personalized workout plans.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
    });

    return response.choices[0].message.content || 'No workout plan generated';
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
    const prompt = `Create a personalized nutrition plan with the following details:
      - Goal: ${goal}
      - Dietary restrictions: ${dietaryRestrictions}
      - Current weight: ${currentWeight} kg
      - Target weight: ${targetWeight} kg
      
      Please provide detailed nutritional advice including:
      - Daily calorie target
      - Macronutrient breakdown
      - Meal timing recommendations
      - Sample meal plan for a day
      - Foods to focus on and avoid`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a professional nutritionist with expertise in creating personalized nutrition plans.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
    });

    return response.choices[0].message.content || 'No nutrition advice generated';
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

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a professional nutritionist with expertise in calculating nutritional values of food items.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
    });

    return response.choices[0].message.content || 'No nutritional values calculated';
  } catch (error) {
    console.error('Error calculating nutritional values:', error);
    throw new Error('Failed to calculate nutritional values');
  }
}; 