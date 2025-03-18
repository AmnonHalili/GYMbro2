import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// הוספת export ריק כדי להפוך את הקובץ למודול
export {};

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
const AI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const AI_API_ENDPOINT = AI_PROVIDER === 'gemini' 
  ? 'https://generativelanguage.googleapis.com/v1/models'
  : 'https://api.openai.com/v1/chat/completions';

// Console.log for debugging configuration
console.log('[aiController] API Configuration:', {
  provider: AI_PROVIDER,
  geminiApiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
  openaiApiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
  aiApiKeyLength: AI_API_KEY?.length || 0
});

// וידוא שהמפתח API תקין
const validateApiKey = (): boolean => {
  // בדיקה בסיסית שהמפתח קיים
  if (!AI_API_KEY) {
    console.error('[aiController] API key is missing completely');
    return false;
  }

  console.log(`[aiController] ${AI_PROVIDER} API key validation check - key exists`);

  // החזרת תקינות
  return true;
};

// Generate workout plan using AI
export const generateWorkoutPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    // בדיקה מורחבת שהמשתמש מאומת ושהטוקן תקין
    if (!req.user || !req.userId) {
      console.error('[aiController] User not authenticated for workout plan generation');
      res.status(401).json({ message: 'Authentication required for AI features' });
      return;
    }

    const { fitnessLevel, goals, daysPerWeek, equipment } = req.body;
    
    console.log('[aiController] Workout plan request received for user:', req.userId);
    console.log('[aiController] Request parameters:', { 
      fitnessLevel,
      goals,
      daysPerWeek,
      equipment
    });
    
    // בדיקת תקינות נתונים
    if (!fitnessLevel || !goals || !daysPerWeek || !equipment) {
      console.error('[aiController] Missing required fields for workout plan generation');
      res.status(400).json({ 
        message: 'Missing required fields', 
        errors: [
          !fitnessLevel && 'Fitness level is required',
          !goals && 'Goals are required',
          !daysPerWeek && 'Days per week is required',
          !equipment && 'Equipment information is required',
        ].filter(Boolean)
      });
      return;
    }
    
    // Format goals array into a string
    const goalsStr = Array.isArray(goals) ? goals.join(', ') : goals;
    
    // שיפור הפרומפט לקבלת תשובה יותר מדויקת ואיכותית
    const prompt = `
כמומחה כושר, צור תוכנית אימונים אישית בעברית לפי הפרטים הבאים:

רמת כושר: ${fitnessLevel === 'beginner' ? 'מתחיל' : fitnessLevel === 'intermediate' ? 'בינוני' : 'מתקדם'}
מטרות: ${goalsStr}
מספר ימי אימון בשבוע: ${daysPerWeek}
ציוד זמין: ${equipment === 'none' ? 'ללא ציוד (רק משקל גוף)' : 
             equipment === 'minimal' ? 'ציוד מינימלי (משקולות יד, גומיות)' : 
             equipment === 'home-gym' ? 'חדר כושר ביתי' : 'חדר כושר מאובזר'}

התוכנית צריכה לכלול:
1. כותרת תוכנית
2. תיאור קצר והסבר על התוכנית
3. פירוט מדויק של האימונים לכל יום כולל:
   - שם האימון ומיקוד (למשל "יום 1 - חזה וכתפיים")
   - רשימת תרגילים עם סטים, חזרות וזמני מנוחה
   - הוראות לתרגילים חשובים או מורכבים
4. המלצות תזונה המותאמות למטרות
5. טיפים לשיפור התוצאות והתקדמות
6. הנחיות לחימום ושחרור

פרמט את התשובה בסגנון מסמך Markdown עם כותרות, תבליטים ומספרים לקריאות מיטבית.

חשוב: התוכנית חייבת להתאים בדיוק לרמת המתאמן, ציוד זמין ולהיות בטוחה וריאליסטית למספר ימי האימון שצוין.
`;
    
    console.log('[aiController] Sending prompt to AI service, length:', prompt.length);
    
    // בדיקת סביבת טסט
    if (process.env.NODE_ENV === 'test') {
      console.log('[aiController] Test environment detected, returning mock response');
      const mockResponse = getMockResponse(`workout plan ${fitnessLevel} ${goals}`);
      res.status(200).json({ 
        workoutPlan: mockResponse,
        generatedBy: 'mock' 
      });
      return;
    }
    
    // קריאה ישירה ל-API בלי להשתמש בבדיקת validateApiKey שנכשלת לעתים
    try {
      let aiResponse;
      if (AI_PROVIDER === 'gemini') {
        console.log('[aiController] Attempting to call Gemini API directly...');
        aiResponse = await callGeminiAPI(prompt);
      } else {
        console.log('[aiController] Attempting to call OpenAI API directly...');
        aiResponse = await callOpenAIAPI(prompt);
      }
      
      // בדיקה שהתקבלה תשובה אמיתית ולא ריקה
      if (!aiResponse || aiResponse.trim().length < 50) {
        console.error('[aiController] AI returned empty or too short response, falling back to local plan');
        throw new Error('AI response insufficient');
      }
      
      console.log('[aiController] Success! AI generated response length:', aiResponse.length);
      console.log('[aiController] AI response first 100 chars:', aiResponse.substring(0, 100));
      
      // שליחת התוכנית למשתמש
      res.status(200).json({ 
        workoutPlan: aiResponse,
        generatedBy: 'ai'
      });
    } catch (aiError) {
      console.error('[aiController] Error calling AI service:', aiError);
      
      // במקרה של שגיאה בקריאה ל-AI, נשתמש בתוכנית מוכנה מראש
      console.log('[aiController] Using fallback workout plan due to AI service error');
      const fallbackPlan = getFallbackWorkoutPlan(fitnessLevel, goals);
      
      res.status(200).json({ 
        workoutPlan: fallbackPlan,
        generatedBy: 'fallback',
        note: "This is a pre-generated workout plan. Our AI service is currently unavailable."
      });
    }
  } catch (error: any) {
    console.error('[aiController] Error generating workout plan:', error);
    
    // טיפול בשגיאות ספציפיות
    if (error.response?.status === 429) {
      res.status(429).json({ message: 'Rate limit exceeded. Please try again later.' });
    } else if (error.response?.status === 400) {
      res.status(400).json({ message: 'Invalid request to AI service', error: error.response?.data });
    } else {
      // במקרה של שגיאה כללית, נחזיר תוכנית מוכנה מראש
      console.log('[aiController] Using fallback workout plan due to general error');
      try {
        const fitnessLevel = req.body?.fitnessLevel || 'beginner';
        const goals = req.body?.goals || 'general fitness';
        const fallbackPlan = getFallbackWorkoutPlan(fitnessLevel, goals);
        
        res.status(200).json({ 
          workoutPlan: fallbackPlan,
          generatedBy: 'fallback',
          note: "This is a pre-generated workout plan. We encountered an error processing your specific request."
        });
      } catch (fallbackError) {
        // אם גם השימוש בתוכנית המוכנה נכשל, נחזיר את השגיאה
        res.status(500).json({ 
          message: 'Error generating workout plan',
          error: process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error)
        });
      }
    }
  }
};

// Calculate nutrition information using AI
export const calculateNutrition = async (req: Request, res: Response): Promise<void> => {
  try {
    // בדיקה שהמשתמש מאומת
    if (!req.user || !req.userId) {
      console.error('[aiController] User not authenticated for nutrition calculation');
      res.status(401).json({ message: 'Authentication required for AI features' });
      return;
    }

    const { food } = req.body;
    
    console.log('[aiController] Nutrition calculation request received:', { 
      userId: req.userId,
      food 
    });
    
    // בדיקת תקינות נתונים
    if (!food) {
      res.status(400).json({ message: 'Food item is required' });
      return;
    }
    
    // Call AI API for nutrition calculation
    const aiResponse = await callAI({
      prompt: `Provide detailed nutritional information for "${food}" in JSON format. 
              Include calories, protein, carbs, fat, fiber, vitamins, and minerals.
              Format the response as a structured JSON object.`
    });
    
    // Format the response
    let nutritionInfo;
    try {
      nutritionInfo = parseAIResponse(aiResponse);
    } catch (parseError) {
      console.error('[aiController] Error parsing AI response:', parseError);
      nutritionInfo = aiResponse;
    }
    
    console.log('[aiController] Nutrition information calculated successfully for user:', req.userId);
    res.status(200).json({ nutritionInfo });
  } catch (error: any) {
    console.error('[aiController] Error calculating nutrition:', error);
    
    if (error.response?.status === 429) {
      res.status(429).json({ message: 'Rate limit exceeded. Please try again later.' });
    } else {
      res.status(500).json({ 
        message: 'Error calculating nutrition information',
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error)
      });
    }
  }
};

// Get fitness tips using AI
export const getFitnessTips = async (req: Request, res: Response): Promise<void> => {
  try {
    // בדיקה שהמשתמש מאומת
    if (!req.user || !req.userId) {
      console.error('[aiController] User not authenticated for fitness tips');
      res.status(401).json({ message: 'Authentication required for AI features' });
      return;
    }

    const category = req.query.category as string || 'general';
    
    console.log('[aiController] Fitness tips request received:', { 
      userId: req.userId,
      category 
    });
    
    // Call AI API for fitness tips
    const aiResponse = await callAI({
      prompt: `Provide 5 evidence-based fitness tips for the "${category}" category.
              Format the response as a JSON array of tips with title and description for each.`
    });
    
    // Format the response
    let fitnessTips;
    try {
      fitnessTips = parseAIResponse(aiResponse);
    } catch (parseError) {
      console.error('[aiController] Error parsing AI response:', parseError);
      fitnessTips = aiResponse;
    }
    
    console.log('[aiController] Fitness tips generated successfully for user:', req.userId);
    res.status(200).json({ fitnessTips });
  } catch (error: any) {
    console.error('[aiController] Error getting fitness tips:', error);
    res.status(500).json({ 
      message: 'Error fetching fitness tips',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error)
    });
  }
};

// Generate nutrition advice using AI
export const generateNutritionAdvice = async (req: Request, res: Response): Promise<void> => {
  try {
    // בדיקה שהמשתמש מאומת
    if (!req.user || !req.userId) {
      console.error('[aiController] User not authenticated for nutrition advice');
      res.status(401).json({ message: 'Authentication required for AI features' });
      return;
    }
    
    const { age, weight, height, activityLevel, dietaryPreferences, healthGoals, existingConditions } = req.body;
    
    console.log('[aiController] Nutrition advice request received:', { 
      userId: req.userId,
      age,
      weight,
      height,
      activityLevel,
      dietaryPreferences,
      healthGoals,
      existingConditions
    });
    
    // בדיקת תקינות נתונים
    if (!age || !weight || !height || !activityLevel || !dietaryPreferences || !healthGoals) {
      res.status(400).json({ 
        message: 'Missing required fields', 
        errors: [
          !age && 'Age is required',
          !weight && 'Weight is required',
          !height && 'Height is required',
          !activityLevel && 'Activity level is required',
          !dietaryPreferences && 'Dietary preferences are required',
          !healthGoals && 'Health goals are required',
        ].filter(Boolean)
      });
      return;
    }
    
    // Translate activity level to Hebrew
    const activityLevelHebrew = 
      activityLevel === 'sedentary' ? 'לא פעיל (יושבני)' :
      activityLevel === 'light' ? 'פעילות קלה (1-3 ימים בשבוע)' :
      activityLevel === 'moderate' ? 'פעילות בינונית (3-5 ימים בשבוע)' :
      activityLevel === 'high' ? 'פעילות גבוהה (6-7 ימים בשבוע)' :
      'פעילות מאוד גבוהה (אימונים מרובים ביום)';
    
    // Translate dietary preferences to Hebrew
    const dietaryPreferencesHebrew = 
      dietaryPreferences === 'balanced' ? 'תזונה מאוזנת' :
      dietaryPreferences === 'vegetarian' ? 'צמחוני' :
      dietaryPreferences === 'vegan' ? 'טבעוני' :
      'עתיר חלבון';
    
    // Translate health goals to Hebrew
    const healthGoalsHebrew = 
      healthGoals === 'lose' ? 'הפחתת משקל' :
      healthGoals === 'maintain' ? 'שמירה על משקל' :
      'עלייה במסת שריר';
    
    // Call AI API for nutrition advice generation
    const aiResponse = await callAI({
      prompt: `הכן תוכנית תזונה מותאמת אישית בעברית עבור אדם עם הפרופיל הבא:

* גיל: ${age} שנים
* משקל: ${weight} ק"ג
* גובה: ${height} ס"מ
* רמת פעילות: ${activityLevelHebrew}
* העדפות תזונה: ${dietaryPreferencesHebrew}
* מטרה בריאותית: ${healthGoalsHebrew}
${existingConditions ? `* מצבים בריאותיים: ${existingConditions}` : ''}

כלול את הפרטים הבאים:
1. סקירה ותקציר של תוכנית התזונה
2. יעד קלורי יומי מומלץ וחלוקת מאקרו-נוטריאנטים (חלבונים, פחמימות, שומנים)
3. רשימת מזונות מומלצים התואמים את העדפות התזונה
4. דוגמא לתפריט יומי מפורט עם 5-6 ארוחות
5. טיפים להצלחה והרגלים חשובים להטמעה
6. המלצות למעקב והתאמות לאורך זמן

הקפד לכתוב את כל התשובה בעברית מלאה ולהתאים את ההמלצות באופן מדויק לפרופיל המבוקש.
פרמט את התשובה בסגנון מסמך Markdown עם כותרות, תבליטים ומספרים לקריאות מיטבית.`
    });
    
    // Format the response
    let nutritionAdvice;
    try {
      nutritionAdvice = parseAIResponse(aiResponse);
    } catch (parseError) {
      console.error('[aiController] Error parsing AI response:', parseError);
      nutritionAdvice = aiResponse;
    }
    
    console.log('[aiController] Nutrition advice generated successfully for user:', req.userId);
    res.status(200).json({ nutritionAdvice });
  } catch (error: any) {
    console.error('[aiController] Error generating nutrition advice:', error);
    res.status(500).json({ 
      message: 'Error generating nutrition advice',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error)
    });
  }
};

// פונקציות חדשות לקריאה ישירה ל-API

// קריאה ל-Gemini API - שיפור משמעותי
async function callGeminiAPI(prompt: string): Promise<string> {
  console.log('[aiController] Calling Gemini API with prompt length:', prompt.length);
  
  try {
    // מפתח API
    const apiKey = process.env.GEMINI_API_KEY || '';
    const modelName = 'gemini-1.5-pro-latest';
    
    if (apiKey.length < 5) {
      console.error('[aiController] Gemini API key is too short or missing:', apiKey.length);
      throw new Error('Invalid Gemini API key');
    }
    
    // בניית כתובת ה-API המלאה
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    console.log('[aiController] Using Gemini API endpoint:', endpoint.substring(0, endpoint.indexOf('?key=')));
    
    console.log('[aiController] Preparing request to Gemini API with prompt (first 100 chars):', prompt.substring(0, 100));
    
    // הגדרת גוף הבקשה שמתאים ספציפית לדרישות של Gemini API
    const requestBody = {
      contents: [{ 
        parts: [{ text: prompt }] 
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        topP: 0.95,
        topK: 40
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
    
    console.log('[aiController] Gemini API request body prepared with safety settings');
    
    // שליחת הבקשה ל-API
    const response = await axios.post(
      endpoint,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000 // הגדלה ל-60 שניות
      }
    );
    
    // הדפסת סטטוס התשובה
    console.log('[aiController] Gemini API response status:', response.status);
    
    // בדיקת תקינות התשובה - המבנה החדש של התשובה
    if (response.data?.candidates?.length > 0 && 
        response.data.candidates[0]?.content?.parts?.length > 0) {
      const responseText = response.data.candidates[0].content.parts[0].text || '';
      
      // לוג קצר של התשובה (מוגבל להתחלה בלבד)
      console.log('[aiController] Gemini API response text (first 100 chars):', 
        responseText.substring(0, 100));
      console.log('[aiController] Gemini API response length:', responseText.length);
        
      return responseText;
    }
    
    // הדפסת מבנה התשובה המלא לצורכי דיבוג
    console.log('[aiController] Full Gemini API response structure:', JSON.stringify(response.data, null, 2));
    
    // טיפול במקרים של blocking
    if (response.data?.promptFeedback?.blockReason) {
      console.error('[aiController] Gemini API blocked the request:', response.data.promptFeedback);
      throw new Error(`Request blocked by Gemini: ${response.data.promptFeedback.blockReason}`);
    }
    
    // כאשר אין תשובה תקינה - זריקת שגיאה
    console.error('[aiController] Empty or invalid response structure from Gemini API:', JSON.stringify(response.data));
    throw new Error('Empty or invalid response from Gemini API');
  } catch (error: any) {
    // לוג השגיאה
    console.error('[aiController] Gemini API error:', error.message);
    if (error.response) {
      console.error('[aiController] Gemini API error status:', error.response.status);
      console.error('[aiController] Gemini API error data:', JSON.stringify(error.response.data || {}));
    }
    
    throw error;
  }
}

// קריאה ל-OpenAI API
async function callOpenAIAPI(prompt: string): Promise<string> {
  console.log('[aiController] Calling OpenAI API with prompt length:', prompt.length);
  
  try {
    // מפתח API
    const apiKey = AI_API_KEY || '';
    
    // שליחת הבקשה ל-OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
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
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000 // 30 שניות
      }
    );
    
    // הדפסת סטטוס התשובה
    console.log('[aiController] OpenAI API response status:', response.status);
    
    // בדיקת תקינות התשובה
    if (response.data?.choices?.length > 0) {
      const responseText = response.data.choices[0].message.content || '';
      
      // לוג קצר של התשובה
      console.log('[aiController] OpenAI API response text (first 100 chars):', 
        responseText.substring(0, 100));
        
      return responseText;
    }
    
    // כאשר אין תשובה תקינה - זריקת שגיאה
    console.error('[aiController] Empty or invalid response structure from OpenAI API:', response.data);
    throw new Error('Empty or invalid response from OpenAI API');
  } catch (error: any) {
    // לוג השגיאה
    console.error('[aiController] OpenAI API error:', error.message);
    if (error.response) {
      console.error('[aiController] OpenAI API error response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw error;
  }
}

// Helper function to call AI API with retry mechanism - שימוש בפונקציה הישנה כגיבוי
async function callAI({ prompt }: { prompt: string }, maxRetries: number = 2): Promise<string> {
  let attempts = 0;
  let lastError;
  
  while (attempts <= maxRetries) {
    try {
      // Use mock response in test environment
      if (process.env.NODE_ENV === 'test') {
        return getMockResponse(prompt);
      }
      
      console.log('[aiController] Calling AI API - attempt', attempts + 1);
      
      // בחירת ספק ה-AI לפי ההגדרות
      if (AI_PROVIDER === 'gemini') {
        return await callGeminiAPI(prompt);
      } else {
        return await callOpenAIAPI(prompt);
      }
    } catch (error) {
      lastError = error;
      console.error(`[aiController] AI API call error (attempt ${attempts + 1}):`, error);
      
      // בדיקה אם כדאי לנסות שוב
      attempts++;
      
      if (attempts <= maxRetries) {
        console.log(`[aiController] Retrying AI call in ${attempts * 1000}ms...`);
        // המתנה לפני ניסיון נוסף
        await new Promise(resolve => setTimeout(resolve, attempts * 1000));
        continue;
      }
      
      // לא נוכל לנסות שוב, זורקים את השגיאה האחרונה
      throw lastError;
    }
  }
  
  throw lastError;
}

// Parse AI response to JSON
function parseAIResponse(response: string): any {
  try {
    // נסיון לחלץ JSON מהטקסט שחזר
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                      response.match(/```\n([\s\S]*?)\n```/) ||
                      [null, response];
    
    const jsonString = jsonMatch[1] || response;
    
    // אם התקבל כבר JSON מוכן (למשל, ממוק), החזר אותו
    if (typeof jsonString === 'object') {
      return jsonString;
    }
    
    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      // אם פרסור JSON נכשל, ננסה לנקות את המחרוזת ולפרסר שוב
      const cleanedString = jsonString
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      try {
        return JSON.parse(cleanedString);
      } catch {
        // אם גם זה נכשל, פשוט נחזיר את הטקסט המקורי
        return jsonString;
      }
    }
  } catch (error) {
    console.error('[aiController] Error parsing AI response:', error);
    return response; // החזר את המחרוזת המקורית אם הפרסור נכשל
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

// תוכנית אימון מוכנה מראש למקרה שהקריאה ל-AI נכשלת
function getFallbackWorkoutPlan(fitnessLevel: string, goals: string): string {
  console.log('[aiController] Creating fallback workout plan for', fitnessLevel, goals);
  
  let plan = '';
  
  // תוכנית לפי רמת הכושר
  if (fitnessLevel === 'beginner') {
    plan = `# תוכנית אימון למתחילים
    
## יום 1 - אימון גוף עליון
* שכיבות סמיכה: 3 סטים של 8-10 חזרות
* מתח לסנטר (רחב): 3 סטים של 6-8 חזרות
* לחיצת כתפיים עם משקולות: 3 סטים של 10-12 חזרות
* כפיפת מרפקים עם משקולות: 3 סטים של 10-12 חזרות
* פשיטת מרפקים (טרייספס): 3 סטים של 10-12 חזרות

## יום 2 - אימון גוף תחתון
* סקוואט: 3 סטים של 10-12 חזרות
* לאנג׳: 3 סטים של 10 חזרות לכל רגל
* דדליפט: 3 סטים של 8-10 חזרות
* כפיפות בטן: 3 סטים של 15 חזרות
* פלאנק: 3 סטים של 30 שניות

## יום 3 - אימון גוף מלא
* ברפי: 3 סטים של 10 חזרות
* דחיקת כתפיים: 3 סטים של 10-12 חזרות
* חתירה רחבה: 3 סטים של 10-12 חזרות
* סקוואט קפיצה: 3 סטים של 12 חזרות
* פלאנק צידי: 3 סטים של 30 שניות לכל צד`;
  } else if (fitnessLevel === 'intermediate') {
    plan = `# תוכנית אימון לרמת ביניים
    
## יום 1 - יום חזה וטרייספס
* לחיצת חזה עם משקולות: 4 סטים של 8-10 חזרות
* לחיצת חזה משופעת: 3 סטים של 10 חזרות
* פרפר עם משקולות: 3 סטים של 12 חזרות
* יציאה צרפתית: 3 סטים של 10 חזרות
* הורדות טרייספס בכבל: 3 סטים של 12 חזרות

## יום 2 - יום גב וביצפס
* מתח: 4 סטים של 8-10 חזרות
* חתירה כפופה: 3 סטים של 10 חזרות
* פולאובר: 3 סטים של 12 חזרות
* כפיפת מרפקים עם מוט: 3 סטים של 10 חזרות
* פטיש עם משקולות: 3 סטים של 12 חזרות

## יום 3 - יום רגליים וכתפיים
* סקוואט: 4 סטים של 8-10 חזרות
* דדליפט: 3 סטים של 8 חזרות
* לאנג׳ הליכה: 3 סטים של 20 צעדים
* לחיצת כתפיים: 3 סטים של 10 חזרות
* הרחקת זרועות לצדדים: 3 סטים של 12 חזרות`;
  } else {
    plan = `# תוכנית אימון למתקדמים
    
## יום 1 - יום חזה וטרייספס
* לחיצת חזה: 5 סטים של 6-8 חזרות
* לחיצת חזה משופעת: 4 סטים של 8 חזרות
* לחיצת חזה בירידה: 4 סטים של 8 חזרות
* יציאה צרפתית משקל חופשי: 4 סטים של 8 חזרות
* הורדות טרייספס בכבל: 3 סטים של 10 חזרות
* לחיצות צרות: 3 סטים של 10 חזרות

## יום 2 - יום גב וביצפס
* מתח משקל חופשי: 5 סטים של 6-8 חזרות
* חתירה בכבל: 4 סטים של 8 חזרות
* פולאובר: 4 סטים של 8 חזרות
* מתח הפוך: 3 סטים של 10 חזרות
* כפיפת מרפקים עם מוט: 4 סטים של 8 חזרות
* כפיפת מרפקים עם מוט Z: 3 סטים של 10 חזרות

## יום 3 - יום רגליים
* סקוואט: 5 סטים של 6-8 חזרות
* דדליפט: 4 סטים של 6 חזרות
* לאנג׳ הליכה עם משקולות: 4 סטים של 8 חזרות לכל רגל
* כפיפת ברכיים (האמסטרינג): 3 סטים של 10 חזרות
* פשיטת ברכיים (קוודריספס): 3 סטים של 10 חזרות
* עליות עקב: 3 סטים של 15 חזרות

## יום 4 - יום כתפיים ובטן
* לחיצת כתפיים: 5 סטים של 6-8 חזרות
* הרחקת זרועות לצדדים: 4 סטים של 8 חזרות
* חתירה אנכית: 4 סטים של 8 חזרות
* כפיפות בטן: 4 סטים של 15 חזרות
* פלאנק: 3 סטים של 60 שניות
* סיבובי בטן: 3 סטים של 20 חזרות לכל צד`;
  }
  
  // התאמה לפי המטרות
  if (goals.includes('חיזוק') || goals.includes('כוח')) {
    plan += `

## טיפים לחיזוק ובניית כוח:
* התמקדו במשקלים גבוהים יותר וחזרות מעטות (6-8 חזרות)
* וודאו שאתם נחים 2-3 דקות בין סטים
* הקפידו על תזונה עשירה בחלבונים (1.6-2 גרם לק"ג משקל גוף)
* ישנו לפחות 7-8 שעות בלילה לשיקום מיטבי`;
  } else if (goals.includes('הרזיה') || goals.includes('שריפת שומן') || goals.includes('ירידה במשקל')) {
    plan += `

## טיפים לשריפת שומן וירידה במשקל:
* הוסיפו אימוני אינטרוולים (HIIT) 2-3 פעמים בשבוע
* הקפידו על תזונה בגירעון קלורי של 300-500 קלוריות
* שמרו על צריכת חלבון גבוהה (1.8-2.2 גרם לק"ג משקל גוף)
* שתו הרבה מים (לפחות 3 ליטר ביום)
* הקפידו על אכילה של ירקות ופירות טריים`;
  } else if (goals.includes('סיבולת') || goals.includes('אתלטיות')) {
    plan += `

## טיפים לשיפור סיבולת ואתלטיות:
* הוסיפו אימוני ריצה או שחייה 2-3 פעמים בשבוע
* התמקדו בסטים עם חזרות רבות (15-20 חזרות)
* הקפידו על מנוחה קצרה בין סטים (30-60 שניות)
* אכלו פחמימות איכותיות לפני אימונים
* עבדו על תרגילי פליומטריה כמו קפיצות וזריקות`;
  }
  
  return plan;
} 