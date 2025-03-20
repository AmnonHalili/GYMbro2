import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import { generateToken } from '../../src/utils/auth';
import bcrypt from 'bcrypt';

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

  describe('Google Authentication', () => {
    test('should handle Google authentication request', async () => {
      // Mocking Google auth data
      const googleAuthData = {
        googleId: '1234567890',
        email: 'google@example.com',
        name: 'Google User',
        picture: 'https://example.com/picture.jpg',
        token: 'fake-google-token'
      };

      const response = await request(app)
        .post('/api/auth/google')
        .send(googleAuthData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Google authentication successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(googleAuthData.email);
    });

    test('should link Google account to existing user', async () => {
      // Create a user
      await User.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password: await bcrypt.hash('Password123!', 10)
      });

      // Send Google auth data with the same email
      const googleAuthData = {
        googleId: '1234567890',
        email: 'existing@example.com',
        name: 'Existing User',
        picture: 'https://example.com/picture.jpg',
        token: 'fake-google-token'
      };

      const response = await request(app)
        .post('/api/auth/google')
        .send(googleAuthData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Google authentication successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(googleAuthData.email);
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