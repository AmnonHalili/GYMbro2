import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../server/src/app';
import User from '../../server/src/models/User';
import { generateToken } from '../../server/src/utils/tokenUtils';
import * as aiService from '../../server/src/services/aiService';

// Mock the AI service to avoid actual API calls
jest.mock('../../server/src/services/aiService');

describe('AI Workout Plan API', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let accessToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123'
    });
    await testUser.save();
    
    // Generate auth token
    accessToken = generateToken(testUser._id.toString(), '15m');
    
    // Mock AI service responses
    (aiService.generateWorkoutPlan as jest.Mock).mockResolvedValue({
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
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
    jest.restoreAllMocks();
  });

  describe('POST /api/ai/workout-plan', () => {
    it('should generate a workout plan for authenticated user', async () => {
      const res = await request(app)
        .post('/api/ai/workout-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fitnessLevel: 'intermediate',
          goals: 'Build muscle',
          daysPerWeek: 3,
          equipment: 'full gym'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('workoutPlan');
      expect(Array.isArray(res.body.workoutPlan)).toBe(true);
      expect(res.body.workoutPlan.length).toBe(3); // 3 days of workout
      
      // Check workout plan structure
      const firstDay = res.body.workoutPlan[0];
      expect(firstDay).toHaveProperty('day');
      expect(firstDay).toHaveProperty('focus');
      expect(firstDay).toHaveProperty('exercises');
      expect(Array.isArray(firstDay.exercises)).toBe(true);
      
      // Check exercise structure
      const firstExercise = firstDay.exercises[0];
      expect(firstExercise).toHaveProperty('name');
      expect(firstExercise).toHaveProperty('sets');
      expect(firstExercise).toHaveProperty('reps');
      
      // Verify the AI service was called with correct parameters
      expect(aiService.generateWorkoutPlan).toHaveBeenCalledWith({
        fitnessLevel: 'intermediate',
        goals: 'Build muscle',
        daysPerWeek: 3,
        equipment: 'full gym'
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      const res = await request(app)
        .post('/api/ai/workout-plan')
        .send({
          fitnessLevel: 'beginner',
          goals: 'Weight loss',
          daysPerWeek: 2,
          equipment: 'minimal'
        });
      
      expect(res.status).toBe(401);
      expect(aiService.generateWorkoutPlan).not.toHaveBeenCalled();
    });

    it('should return 400 if required parameters are missing', async () => {
      const res = await request(app)
        .post('/api/ai/workout-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fitnessLevel: 'advanced',
          // missing goals
          daysPerWeek: 5,
          equipment: 'full gym'
        });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(aiService.generateWorkoutPlan).not.toHaveBeenCalled();
    });

    it('should handle AI service errors gracefully', async () => {
      // Mock AI service to throw error for this test
      (aiService.generateWorkoutPlan as jest.Mock).mockRejectedValueOnce(
        new Error('AI service error')
      );
      
      const res = await request(app)
        .post('/api/ai/workout-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fitnessLevel: 'intermediate',
          goals: 'Build muscle',
          daysPerWeek: 3,
          equipment: 'full gym'
        });
      
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Error generating workout plan');
    });
  });
}); 