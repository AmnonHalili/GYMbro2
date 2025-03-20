import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import { generateTokens } from '../../src/utils/tokenUtils';

let mongoServer: MongoMemoryServer;
let refreshToken: string;
let userId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      port: 27020, // Unique port different from other test files
      storageEngine: 'ephemeralForTest'
    }
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // יצירת משתמש לצורך בדיקת רענון טוקן
  const user = new User({
    username: 'refreshuser',
    email: 'refresh@example.com',
    password: 'Password123'
  });
  await user.save();
  userId = user._id.toString();
  
  // יצירת טוקנים למשתמש
  const tokens = generateTokens(userId);
  refreshToken = tokens.refreshToken;
});

afterAll(async () => {
  try {
    await User.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  } catch (error) {
    console.error('Error shutting down MongoDB:', error);
  }
});

describe('Refresh Token Tests', () => {
  // בדיקת רענון טוקן תקין
  test('Should refresh access token with valid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('id', userId);
  });

  // בדיקת רענון טוקן לא תקין
  test('Should fail with invalid refresh token', async () => {
    const invalidToken = 'invalid.token.string';
    
    const response = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken: invalidToken });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Invalid or expired refresh token');
  });
  
  // בדיקת רענון טוקן ללא טוקן
  test('Should fail with missing refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh-token')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Refresh token required');
  });
}); 