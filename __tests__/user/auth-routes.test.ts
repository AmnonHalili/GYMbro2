import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import { generateToken } from '../../src/utils/auth';

describe('Authentication Routes', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let refreshToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create a test user
    testUser = await User.create({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'Password123'
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('_id');
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    test('should fail to register with existing email', async () => {
      const userData = {
        username: 'anotheruser',
        email: 'testuser@example.com', // Already exists
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('email already exists');
    });

    test('should fail to register with existing username', async () => {
      const userData = {
        username: 'testuser', // Already exists
        email: 'different@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('username already exists');
    });

    test('should fail to register with weak password', async () => {
      const userData = {
        username: 'weakpassuser',
        email: 'weak@example.com',
        password: 'weak' // Too weak
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Save refresh token for later tests
      refreshToken = response.body.refreshToken;
    });

    test('should fail to login with wrong password', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'WrongPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid credentials');
    });

    test('should fail to login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    test('should refresh access token with valid refresh token', async () => {
      // Skip if we didn't get a refresh token from login test
      if (!refreshToken) {
        console.warn('Skipping refresh token test - no token available');
        return;
      }

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    test('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid refresh token');
    });

    test('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Refresh token is required');
    });
  });

  describe('POST /api/auth/google', () => {
    test('should handle Google authentication', async () => {
      // Mock Google user data
      const googleUserData = {
        googleId: '123456789',
        email: 'google@example.com',
        name: 'Google User',
        picture: 'https://example.com/picture.jpg'
      };

      const response = await request(app)
        .post('/api/auth/google')
        .send(googleUserData)
        .expect(200);

      // Check the response based on current implementation
      // This might need adjustment based on actual implementation
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    test('should fail with missing Google data', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should handle logout request', async () => {
      // First login to get tokens
      const loginData = {
        email: 'testuser@example.com',
        password: 'Password123'
      };

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      const { accessToken, refreshToken } = loginResponse.body;

      // Then logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('logged out');
    });
  });
}); 