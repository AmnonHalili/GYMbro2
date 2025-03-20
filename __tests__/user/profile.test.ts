import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import { generateToken } from '../../src/utils/tokenUtils';
import path from 'path';
import fs from 'fs';

describe('User Profile API', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let accessToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123'
    });

    accessToken = generateToken(testUser._id.toString(), '15m');

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  test('should fetch user profile data', async () => {
    const response = await request(app)
      .get(`/api/users/${testUser._id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('_id', testUser._id.toString());
    expect(response.body).toHaveProperty('username', testUser.username);
    expect(response.body).toHaveProperty('email', testUser.email);
    expect(response.body).not.toHaveProperty('password');
  });

  test('should fetch current user profile', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('_id', testUser._id.toString());
    expect(response.body).toHaveProperty('username', testUser.username);
    expect(response.body).toHaveProperty('email', testUser.email);
    expect(response.body).not.toHaveProperty('password');
  });

  test('should update user profile', async () => {
    const updatedData = {
      username: 'updatedusername'
    };

    const response = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updatedData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('_id', testUser._id.toString());
    expect(response.body).toHaveProperty('username', updatedData.username);
    expect(response.body).toHaveProperty('email', testUser.email);
    expect(response.body).not.toHaveProperty('password');

    // Verify changes were saved to the database
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser?.username).toBe(updatedData.username);
  });

  test('should update profile picture', async () => {
    // Create a temporary test image
    const testImagePath = path.join(__dirname, '../test-profile-image.jpg');
    if (!fs.existsSync(testImagePath)) {
      // Create a simple 1x1 pixel image if it doesn't exist
      const buffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xc2, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00,
        0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x01, 0x3f,
        0x10
      ]);
      fs.writeFileSync(testImagePath, buffer);
    }

    const response = await request(app)
      .put('/api/users/me/profile-picture')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('profilePicture', testImagePath);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('_id', testUser._id.toString());
    expect(response.body).toHaveProperty('profilePicture');
    expect(response.body.profilePicture).toBeTruthy();

    // Verify changes were saved to the database
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser?.profilePicture).toBeTruthy();
    
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  test('should return 401 if user is not authenticated', async () => {
    const response = await request(app)
      .get('/api/users/me');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Access token is required');
  });

  test('should return 404 if user does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .get(`/api/users/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
  });

  test('should reject invalid profile updates', async () => {
    const invalidData = {
      username: '' // Empty username is invalid
    };

    const response = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(invalidData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  test('should reject invalid profile picture format', async () => {
    // Create a temporary invalid "image" file
    const invalidImagePath = path.join(__dirname, '../invalid-profile-image.txt');
    fs.writeFileSync(invalidImagePath, 'This is not an image');

    const response = await request(app)
      .put('/api/users/me/profile-picture')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('profilePicture', invalidImagePath);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Access token is required');
    
    // Clean up
    fs.unlinkSync(invalidImagePath);
  });
}); 