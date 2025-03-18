import express from 'express';
import { body } from 'express-validator';
import * as aiController from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = express.Router();

// Workout plan validation
const workoutPlanValidation = [
  body('fitnessLevel').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Valid fitness level is required'),
  body('goals').isArray().withMessage('Goals must be an array'),
  body('daysPerWeek').isInt({ min: 1, max: 7 }).withMessage('Days per week must be between 1-7'),
  body('equipment').isIn(['none', 'minimal', 'home-gym', 'gym']).withMessage('Valid equipment option is required')
];

// Nutrition calculation validation
const nutritionValidation = [
  body('food').notEmpty().withMessage('Food item is required')
];

// Nutrition advice validation
const nutritionAdviceValidation = [
  body('age').isInt({ min: 16, max: 100 }).withMessage('Age must be between 16-100'),
  body('weight').isFloat({ min: 30, max: 250 }).withMessage('Weight must be between 30-250 kg'),
  body('height').isFloat({ min: 120, max: 220 }).withMessage('Height must be between 120-220 cm'),
  body('activityLevel').isIn(['sedentary', 'light', 'moderate', 'high', 'very_high']).withMessage('Valid activity level is required'),
  body('dietaryPreferences').isIn(['balanced', 'vegetarian', 'vegan', 'high_protein']).withMessage('Valid dietary preference is required'),
  body('healthGoals').isIn(['lose', 'maintain', 'gain']).withMessage('Valid health goal is required'),
  body('existingConditions').optional().isString().withMessage('Existing conditions must be a string')
];

/**
 * @swagger
 * /api/ai/workout-plan:
 *   post:
 *     summary: Generate workout plan
 *     description: Generate a personalized workout plan based on user's fitness level, goals, and equipment.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fitnessLevel
 *               - goals
 *               - daysPerWeek
 *               - equipment
 *             properties:
 *               fitnessLevel:
 *                 type: string
 *                 description: User's current fitness level
 *                 example: intermediate
 *                 enum: [beginner, intermediate, advanced]
 *               goals:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: User's fitness goals
 *                 example: ["build muscle", "improve endurance"]
 *               daysPerWeek:
 *                 type: integer
 *                 description: Number of days per week for workouts
 *                 example: 4
 *                 minimum: 1
 *                 maximum: 7
 *               equipment:
 *                 type: string
 *                 description: Available equipment for workouts
 *                 example: minimal
 *                 enum: [none, minimal, home-gym, gym]
 *               provider:
 *                 type: string
 *                 description: AI provider to use (optional)
 *                 example: gemini
 *                 enum: [gemini, openai]
 */
router.post(
  '/workout-plan',
  authenticateToken,
  validate(workoutPlanValidation),
  aiController.generateWorkoutPlan
);

/**
 * @swagger
 * /api/ai/calculate-nutrition:
 *   post:
 *     summary: Calculate nutrition information
 *     description: Get detailed nutritional information for a specified food item.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - food
 *             properties:
 *               food:
 *                 type: string
 *                 description: Food item to calculate nutrition for
 *                 example: 100g chicken breast
 *               quantity:
 *                 type: string
 *                 description: Quantity of food (optional)
 *                 example: 1 serving
 *     responses:
 *       200:
 *         description: Nutrition information calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 food:
 *                   type: string
 *                   example: 100g chicken breast
 *                 calories:
 *                   type: number
 *                   example: 165
 *                 protein:
 *                   type: string
 *                   example: 31g
 *                 carbs:
 *                   type: string
 *                   example: 0g
 *                 fat:
 *                   type: string
 *                   example: 3.6g
 *                 fiber:
 *                   type: string
 *                   example: 0g
 *                 sugars:
 *                   type: string
 *                   example: 0g
 *                 sodium:
 *                   type: string
 *                   example: 74mg
 *                 potassium:
 *                   type: string
 *                   example: 256mg
 *                 cholesterol:
 *                   type: string
 *                   example: 85mg
 *                 vitamins:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Vitamin B6: 0.6mg", "Vitamin B12: 0.3µg"]
 *                 minerals:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Zinc: 0.9mg", "Phosphorus: 196mg"]
 *       400:
 *         description: Validation error in request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized, authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error or AI service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/calculate-nutrition',
  authenticateToken,
  validate(nutritionValidation),
  aiController.calculateNutrition
);

/**
 * @swagger
 * /api/ai/nutrition-advice:
 *   post:
 *     summary: Generate nutrition advice
 *     description: Generate personalized nutrition advice based on user's profile and goals.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - age
 *               - weight
 *               - height
 *               - activityLevel
 *               - dietaryPreferences
 *               - healthGoals
 *             properties:
 *               age:
 *                 type: integer
 *                 description: User's age
 *                 example: 30
 *                 minimum: 16
 *                 maximum: 100
 *               weight:
 *                 type: number
 *                 description: Current weight in kg
 *                 example: 70
 *                 minimum: 30
 *                 maximum: 250
 *               height:
 *                 type: number
 *                 description: Height in cm
 *                 example: 175
 *                 minimum: 120
 *                 maximum: 220
 *               activityLevel:
 *                 type: string
 *                 description: Physical activity level
 *                 example: moderate
 *                 enum: [sedentary, light, moderate, high, very_high]
 *               dietaryPreferences:
 *                 type: string
 *                 description: Dietary preference
 *                 example: balanced
 *                 enum: [balanced, vegetarian, vegan, high_protein]
 *               healthGoals:
 *                 type: string
 *                 description: Health goals
 *                 example: lose
 *                 enum: [lose, maintain, gain]
 *               existingConditions:
 *                 type: string
 *                 description: Any existing health conditions (optional)
 *                 example: high blood pressure, lactose intolerance
 *               provider:
 *                 type: string
 *                 description: AI provider to use (optional)
 *                 example: gemini
 *                 enum: [gemini, openai]
 */
router.post(
  '/nutrition-advice',
  authenticateToken,
  validate(nutritionAdviceValidation),
  aiController.generateNutritionAdvice
);

/**
 * @swagger
 * /api/ai/fitness-tips:
 *   get:
 *     summary: Get fitness tips
 *     description: Retrieve AI-generated fitness and nutrition tips.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [workout, nutrition, recovery, motivation]
 *         description: Category of tips to retrieve (optional)
 *     responses:
 *       200:
 *         description: Fitness tips retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tips:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         example: workout
 *                       tip:
 *                         type: string
 *                         example: For maximum muscle growth, aim to progressively increase weights every 2-3 weeks in your strength training sessions.
 *       401:
 *         description: Unauthorized, authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error or AI service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/fitness-tips', authenticateToken, aiController.getFitnessTips);

export default router; 