import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import { generateToken } from '../../src/utils/tokenUtils';

let mongoServer: MongoMemoryServer;
let testUser: any;
let accessToken: string;

// Mock the AI service responses
jest.mock('../../src/services/aiService', () => ({
  callAI: jest.fn().mockImplementation((prompt) => {
    if (prompt.includes('workout plan')) {
      return Promise.resolve({
        workoutPlan: [
          {
            day: 'Monday',
            focus: 'Chest and Triceps',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '8-10' }
            ]
          },
          {
            day: 'Wednesday',
            focus: 'Back and Biceps',
            exercises: [
              { name: 'Pull-ups', sets: 4, reps: 'Max' }
            ]
          }
        ]
      });
    } else if (prompt.includes('nutrition')) {
      return Promise.resolve({
        advice: 'Mocked nutrition advice for testing'
      });
    } else if (prompt.includes('nutritional values')) {
      return Promise.resolve({
        nutritionInfo: {
          name: 'apple',
          calories: 250,
          protein: 20,
          carbs: 30,
          fat: 10,
          fiber: 5,
          vitamins: ['A', 'C', 'D'],
          minerals: ['Calcium', 'Iron', 'Potassium']
        }
      });
    } else {
      return Promise.resolve({
        tips: [
          {
            title: 'Stay Consistent',
            description: 'Consistency is key for seeing results.'
          }
        ]
      });
    }
  })
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create a test user
  testUser = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123'
  });
  
  // Generate access token
  accessToken = generateToken(testUser._id.toString(), '15m');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('AI Services API', () => {
  describe('Workout Planner', () => {
    test('should generate workout plan', async () => {
      const requestData = {
        goals: 'weight loss',
        fitnessLevel: 'beginner',
        daysPerWeek: 3,
        equipment: 'minimal'
      };

      const response = await request(app)
        .post('/api/ai/workout-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('workoutPlan');
      expect(Array.isArray(response.body.workoutPlan)).toBe(true);
    });

    test('should return 401 if user is not authenticated', async () => {
      const requestData = {
        goals: 'weight loss',
        fitnessLevel: 'beginner',
        daysPerWeek: 3,
        equipment: 'minimal'
      };

      const response = await request(app)
        .post('/api/ai/workout-plan')
        .send(requestData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    test('should return 400 if required parameters are missing', async () => {
      const response = await request(app)
        .post('/api/ai/workout-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fitnessLevel: 'beginner',
          // missing goals
          daysPerWeek: 3,
          equipment: 'minimal'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Nutrition Advice', () => {
    test('should provide nutrition advice', async () => {
      const requestData = {
        goal: 'weight loss',
        dietaryRestrictions: 'vegetarian',
        calorieTarget: 2000
      };

      const response = await request(app)
        .post('/api/ai/nutrition-advice')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('advice');
      expect(response.body.advice).toBe('Mocked nutrition advice for testing');
    });

    test('should return 401 if user is not authenticated', async () => {
      const requestData = {
        goal: 'weight loss',
        dietaryRestrictions: 'vegetarian',
        calorieTarget: 2000
      };

      const response = await request(app)
        .post('/api/ai/nutrition-advice')
        .send(requestData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    test('should return 400 if required parameters are missing', async () => {
      const response = await request(app)
        .post('/api/ai/nutrition-advice')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          // missing goal
          dietaryRestrictions: 'vegetarian',
          calorieTarget: 2000
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
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
        .send(requestData);

      expect(response.status).toBe(200);
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
        .send(requestData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    test('should return 400 if food parameter is missing', async () => {
      const response = await request(app)
        .post('/api/ai/calculate-nutrition')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });
  
  describe('Fitness Tips', () => {
    test('should return fitness tips', async () => {
      const response = await request(app)
        .get('/api/ai/fitness-tips')
        .set('Authorization', `Bearer ${accessToken}`);
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tips');
    });
    
    test('should support category parameter', async () => {
      const response = await request(app)
        .get('/api/ai/fitness-tips?category=weightlifting')
        .set('Authorization', `Bearer ${accessToken}`);
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tips');
    });
    
    test('should return 401 if user is not authenticated', async () => {
      const response = await request(app)
        .get('/api/ai/fitness-tips');
        
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });
  });
}); 