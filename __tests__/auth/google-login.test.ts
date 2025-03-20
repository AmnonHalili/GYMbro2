import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import { generateToken } from '../../src/utils/tokenUtils';

let mongoServer: MongoMemoryServer;
let testUser: any;
let accessToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      port: 27018, // Unique port different from other test files
      storageEngine: 'ephemeralForTest'
    }
  });
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

afterEach(async () => {
  try {
    // Reset data after each test
    await User.updateMany({}, { googleId: undefined });
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
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

describe('Google OAuth Login', () => {
  test('should create a new user when Google login for the first time', async () => {
    const googleData = {
      token: 'fake-google-token',
      email: 'google@example.com',
      name: 'Google User',
      picture: 'https://example.com/picture.jpg',
      googleId: '123456789'
    };

    const response = await request(app)
      .post('/api/auth/google')
      .send(googleData)
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Google authentication successful');
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user.email).toBe(googleData.email);
  });

  test('should login existing user with Google', async () => {
    // Create user that exists but hasn't used Google login yet
    const existingUser = await User.findOneAndUpdate(
      { email: 'test@example.com' },
      { $set: { googleId: undefined } },
      { new: true }
    );

    const googleData = {
      token: 'fake-google-token',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/new-picture.jpg',
      googleId: '987654321'
    };

    const response = await request(app)
      .post('/api/auth/google')
      .send(googleData)
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Google authentication successful');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(googleData.email);
  });

  test('should return an error if required Google data is missing', async () => {
    const incompleteData = {
      token: 'fake-google-token',
      // Missing email and googleId which are required
      name: 'Google User'
    };

    const response = await request(app)
      .post('/api/auth/google')
      .send(incompleteData)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Invalid Google token or missing user data');
  });
}); 