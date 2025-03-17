import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { createTestUser } from '../setup';

let mongoServer: MongoMemoryServer;
let refreshToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Refresh Token Tests', () => {
  // בדיקת רענון טוקן תקף
  test('Should refresh access token with valid refresh token', async () => {
    // יצירת משתמש ושמירת הטוקנים
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'refreshuser',
        email: 'refresh@example.com',
        password: 'Password123',
      });

    refreshToken = registerResponse.body.refreshToken;
    
    const response = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('user');
  });

  // בדיקת רענון טוקן לא תקף
  test('Should fail with invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken: 'invalid-token' });

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
  });
}); 