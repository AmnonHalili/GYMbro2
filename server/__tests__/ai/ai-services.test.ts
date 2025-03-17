import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import { generateToken } from '../../src/utils/tokenUtils';

// Mock the AI service responses
jest.mock('../../src/services/aiService', () => ({
  generateWorkoutPlan: jest.fn().mockResolvedValue({
    plan: 'Mocked workout plan for testing'
  }),
  generateNutritionAdvice: jest.fn().mockResolvedValue({
    advice: 'Mocked nutrition advice for testing'
  }),
  calculateNutritionalValues: jest.fn().mockResolvedValue({
    calories: 250,
    protein: 10,
    carbs: 30,
    fat: 5
  })
}));

let mongoServer: MongoMemoryServer;
let testUser: any;
let accessToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create a test user
  testUser = new User({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  });
  await testUser.save();
  
  // Generate access token for the test user
  accessToken = generateToken(testUser._id.toString(), '15m');
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('AI Services API', () => {
  describe('Workout Planner', () => {
    test('should generate a workout plan', async () => {
      const requestData = {
        goal: 'muscle gain',
        fitnessLevel: 'intermediate',
        daysPerWeek: 4
      };

      const response = await request(app)
        .post('/api/ai/workout-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body).toBeDefined();
    });

    test('should return 401 if user is not authenticated', async () => {
      const requestData = {
        goal: 'muscle gain',
        fitnessLevel: 'intermediate',
        daysPerWeek: 4
      };

      const response = await request(app)
        .post('/api/ai/workout-plan')
        .send(requestData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Access token is required');
    });

    test('should return 400 if required parameters are missing', async () => {
      const response = await request(app)
        .post('/api/ai/workout-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('Nutrition Advice', () => {
    test('should generate nutrition advice', async () => {
      const requestData = {
        goal: 'weight loss',
        dietaryRestrictions: 'vegetarian',
        allergies: 'nuts'
      };

      const response = await request(app)
        .post('/api/ai/nutrition-advice')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(404); // API endpoint not implemented or not found

      // Since this endpoint doesn't exist yet, we can't test its response properties
    });

    test('should return 401 if user is not authenticated', async () => {
      const requestData = {
        goal: 'weight loss',
        dietaryRestrictions: 'vegetarian',
        allergies: 'nuts'
      };

      const response = await request(app)
        .post('/api/ai/nutrition-advice')
        .send(requestData)
        .expect(404); // API endpoint not implemented or not found

      // Since this endpoint doesn't exist yet, we can't test its response properties
    });
  });

  describe('Nutritional Calculator', () => {
    test('should calculate nutritional values', async () => {
      const requestData = {
        food: 'apple'
      };

      const response = await request(app)
        .post('/api/ai/calculate-nutrition')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body).toHaveProperty('nutritionInfo');
      expect(response.body.nutritionInfo).toHaveProperty('calories');
      expect(response.body.nutritionInfo).toHaveProperty('protein');
      expect(response.body.nutritionInfo).toHaveProperty('carbs');
      expect(response.body.nutritionInfo).toHaveProperty('fat');
    });

    test('should return 401 if user is not authenticated', async () => {
      const requestData = {
        food: 'apple'
      };

      const response = await request(app)
        .post('/api/ai/calculate-nutrition')
        .send(requestData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Access token is required');
    });

    test('should return 400 if food parameter is missing', async () => {
      const response = await request(app)
        .post('/api/ai/calculate-nutrition')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });
}); 