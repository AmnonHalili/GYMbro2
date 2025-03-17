import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Define types for API responses
interface GeminiResponsePart {
  text: string;
}

interface GeminiResponseContent {
  parts: GeminiResponsePart[];
}

interface GeminiResponseCandidate {
  content: GeminiResponseContent;
}

interface GeminiResponse {
  candidates: GeminiResponseCandidate[];
}

interface OpenAIMessage {
  content: string;
}

interface OpenAIChoice {
  message: OpenAIMessage;
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
}

// API keys and endpoints
const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_ENDPOINT = process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

// Generate workout plan using AI
export const generateWorkoutPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fitnessLevel, goals, daysPerWeek, equipment } = req.body;
    
    // Call AI API for workout plan generation
    const aiResponse = await callAI({
      prompt: `Create a ${daysPerWeek}-day workout plan for a ${fitnessLevel} level individual 
              with ${equipment} equipment, targeting: ${goals}. Format response as a JSON array with 
              days of the week, focus areas, and specific exercises with sets and reps.`
    });
    
    // Format the response
    const workoutPlan = parseAIResponse(aiResponse);
    
    res.status(200).json({ workoutPlan });
  } catch (error) {
    console.error('Error generating workout plan:', error);
    res.status(500).json({ message: 'Error generating workout plan' });
  }
};

// Calculate nutrition information using AI
export const calculateNutrition = async (req: Request, res: Response): Promise<void> => {
  try {
    const { food } = req.body;
    
    // Call AI API for nutrition calculation
    const aiResponse = await callAI({
      prompt: `Provide detailed nutritional information for "${food}" in JSON format. 
              Include calories, protein, carbs, fat, fiber, vitamins, and minerals.
              Format the response as a structured JSON object.`
    });
    
    // Format the response
    const nutritionInfo = parseAIResponse(aiResponse);
    
    res.status(200).json({ nutritionInfo });
  } catch (error) {
    console.error('Error calculating nutrition:', error);
    res.status(500).json({ message: 'Error calculating nutrition information' });
  }
};

// Get fitness tips using AI
export const getFitnessTips = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string || 'general';
    
    // Call AI API for fitness tips
    const aiResponse = await callAI({
      prompt: `Provide 5 evidence-based fitness tips for the "${category}" category.
              Format the response as a JSON array of tips with title and description for each.`
    });
    
    // Format the response
    const fitnessTips = parseAIResponse(aiResponse);
    
    res.status(200).json({ fitnessTips });
  } catch (error) {
    console.error('Error getting fitness tips:', error);
    res.status(500).json({ message: 'Error fetching fitness tips' });
  }
};

// Helper function to call AI API
async function callAI({ prompt }: { prompt: string }): Promise<string> {
  try {
    // Use mock response in test environment
    if (process.env.NODE_ENV === 'test') {
      return getMockResponse(prompt);
    }
    
    // Make API call to AI provider
    const response = await axios.post(
      AI_API_ENDPOINT,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a fitness and nutrition expert assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`
        }
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI API call error:', error);
    throw new Error('Failed to get response from AI service');
  }
}

// Parse AI response to JSON
function parseAIResponse(response: string): any {
  try {
    // Extract JSON from the response (handle markdown code blocks if present)
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                      response.match(/```\n([\s\S]*?)\n```/) ||
                      [null, response];
    
    const jsonString = jsonMatch[1] || response;
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return { error: 'Failed to parse AI response' };
  }
}

// Generate mock responses for testing
function getMockResponse(prompt: string): string {
  if (prompt.includes('workout plan')) {
    return JSON.stringify({
      workoutPlan: [
        {
          day: 'Monday',
          focus: 'Chest and Triceps',
          exercises: [
            { name: 'Bench Press', sets: 4, reps: '8-10' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12' },
            { name: 'Tricep Pushdowns', sets: 3, reps: '12-15' }
          ]
        },
        {
          day: 'Wednesday',
          focus: 'Back and Biceps',
          exercises: [
            { name: 'Pull-ups', sets: 4, reps: 'Max' },
            { name: 'Barbell Rows', sets: 3, reps: '8-10' },
            { name: 'Bicep Curls', sets: 3, reps: '12-15' }
          ]
        },
        {
          day: 'Friday',
          focus: 'Legs and Shoulders',
          exercises: [
            { name: 'Squats', sets: 4, reps: '8-10' },
            { name: 'Leg Press', sets: 3, reps: '10-12' },
            { name: 'Shoulder Press', sets: 3, reps: '10-12' }
          ]
        }
      ]
    });
  } else if (prompt.includes('nutrition')) {
    return JSON.stringify({
      name: prompt.match(/\"(.*?)\"/)![1],
      calories: 250,
      protein: 20,
      carbs: 30,
      fat: 10,
      fiber: 5,
      vitamins: ['A', 'C', 'D'],
      minerals: ['Calcium', 'Iron', 'Potassium']
    });
  } else if (prompt.includes('fitness tips')) {
    return JSON.stringify({
      tips: [
        {
          title: 'Stay Consistent',
          description: 'Consistency is key for seeing results. Aim for regular workouts even if they are shorter.'
        },
        {
          title: 'Progressive Overload',
          description: 'Gradually increase weight, frequency, or reps to continue making gains.'
        },
        {
          title: 'Prioritize Recovery',
          description: 'Muscles grow during rest. Ensure adequate sleep and rest days between intense workouts.'
        },
        {
          title: 'Proper Nutrition',
          description: 'Fuel your body with balanced nutrition focusing on protein, complex carbs, and healthy fats.'
        },
        {
          title: 'Stay Hydrated',
          description: 'Drink plenty of water before, during, and after workouts for optimal performance.'
        }
      ]
    });
  }
  
  return '{"error": "No mock response available for this query"}';
} 