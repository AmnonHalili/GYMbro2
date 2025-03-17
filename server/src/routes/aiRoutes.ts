import express from 'express';
import { body } from 'express-validator';
import * as aiController from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = express.Router();

// Workout plan validation
const workoutPlanValidation = [
  body('fitnessLevel').notEmpty().withMessage('Fitness level is required'),
  body('goals').notEmpty().withMessage('Fitness goals are required'),
  body('daysPerWeek').isInt({ min: 1, max: 7 }).withMessage('Days per week must be between 1-7'),
  body('equipment').notEmpty().withMessage('Equipment information is required')
];

// Nutrition calculation validation
const nutritionValidation = [
  body('food').notEmpty().withMessage('Food item is required')
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
 *                 type: string
 *                 description: User's fitness goals
 *                 example: build muscle and improve endurance
 *               daysPerWeek:
 *                 type: integer
 *                 description: Number of days per week for workouts
 *                 example: 4
 *                 minimum: 1
 *                 maximum: 7
 *               equipment:
 *                 type: string
 *                 description: Available equipment for workouts
 *                 example: home gym with dumbbells and resistance bands
 *               age:
 *                 type: integer
 *                 description: User's age (optional)
 *                 example: 30
 *               weight:
 *                 type: number
 *                 description: User's weight in kg (optional)
 *                 example: 75.5
 *               height:
 *                 type: number
 *                 description: User's height in cm (optional)
 *                 example: 180
 *               gender:
 *                 type: string
 *                 description: User's gender (optional)
 *                 example: male
 *                 enum: [male, female, other]
 *               healthConditions:
 *                 type: string
 *                 description: Any health conditions to consider (optional)
 *                 example: lower back pain
 *     responses:
 *       200:
 *         description: Workout plan generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plan:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       example: Intermediate Muscle Building 4-Day Plan
 *                     introduction:
 *                       type: string
 *                       example: This 4-day workout plan is designed to help you build muscle and improve endurance with your home gym equipment...
 *                     schedule:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           day:
 *                             type: string
 *                             example: Day 1 - Upper Body
 *                           exercises:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                   example: Dumbbell Bench Press
 *                                 sets:
 *                                   type: integer
 *                                   example: 4
 *                                 reps:
 *                                   type: string
 *                                   example: 8-10
 *                                 rest:
 *                                   type: string
 *                                   example: 60-90 seconds
 *                                 instructions:
 *                                   type: string
 *                                   example: Lie on a flat bench with dumbbells held at chest level...
 *                     tips:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Start with a proper warm-up", "Focus on form over weight", "Stay hydrated throughout your workout"]
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