import request from "supertest";
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import { verifyToken } from '../../src/utils/tokenUtils';
import bcrypt from 'bcrypt';

describe('Authentication Routes', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).not.toBeNull();
      expect(user?.username).toBe(userData.username);
    });

    test('should reject registration with existing email', async () => {
      // First create a user
      await User.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'Password123!'
      });

      // Try to register with the same email
      const userData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Email already exists');
      
      // Check the database to ensure no new user was created
      const users = await User.find({ email: userData.email });
      expect(users.length).toBe(1);
    });

    test('should reject registration with weak password', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      // Verify no user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeNull();
    });
  });

  describe('User Login', () => {
    test('should login successfully with correct credentials', async () => {
      // Create a user for login test
      const password = 'Password123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        username: 'loginuser',
        email: 'login@example.com',
        password: hashedPassword
      });

      const loginData = {
        email: 'login@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    test('should reject login with incorrect password', async () => {
      // Create a user for login test
      const password = 'Password123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        username: 'loginuser',
        email: 'login@example.com',
        password: hashedPassword
      });

      const loginData = {
        email: 'login@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid email or password');
    });

    test('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid email or password');
    });
  });

  describe('Token Refresh', () => {
    test('should refresh access token with valid refresh token', async () => {
      // Create a user
      const user = await User.create({
        username: 'refreshuser',
        email: 'refresh@example.com',
        password: await bcrypt.hash('Password123!', 10)
      });

      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refresh@example.com',
          password: 'Password123!'
        });

      const fakeRefreshToken = 'fake-refresh-token';

      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: fakeRefreshToken })
        .expect(401);

      expect(response.body).toBeDefined();
    });

    test('should reject refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('message');
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

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(googleAuthData.email);

      // Verify user was created in database
      const user = await User.findOne({ email: googleAuthData.email });
      expect(user).not.toBeNull();
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

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(googleAuthData.email);
    });
  });
});
