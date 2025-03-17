import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import { generateToken } from '../../src/utils/tokenUtils';
import path from 'path';
import fs from 'fs';

describe('Create Post API', () => {
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

  test('should create a new post with text content', async () => {
    const postData = {
      content: 'This is a test post about fitness achievements'
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(postData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('content', postData.content);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toEqual(expect.objectContaining({
      _id: testUser._id.toString(),
      username: testUser.username
    }));
    expect(response.body).toHaveProperty('createdAt');
  });

  test('should create a new post with image', async () => {
    // Create a temporary test image
    const testImagePath = path.join(__dirname, '../test-image.jpg');
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
      .post('/api/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('content', 'Post with image')
      .attach('image', testImagePath);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('content', 'Post with image');
    expect(response.body).toHaveProperty('image');
    expect(response.body.image).toBeTruthy();
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toEqual(expect.objectContaining({
      _id: testUser._id.toString(),
      username: testUser.username
    }));
  });

  test('should return 401 if user is not authenticated', async () => {
    const postData = {
      content: 'This post should not be created'
    };

    const response = await request(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });

  test('should return 400 if content is empty', async () => {
    const postData = {
      content: ''
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(postData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  test('should return 400 if content is too long', async () => {
    // Create a very long string (over 1000 characters)
    const longContent = 'A'.repeat(1001);
    
    const postData = {
      content: longContent
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(postData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  test('should return 400 if image is not a valid format', async () => {
    // Create a temporary invalid "image" file
    const invalidImagePath = path.join(__dirname, '../invalid-image.txt');
    fs.writeFileSync(invalidImagePath, 'This is not an image');

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('content', 'Post with invalid image')
      .attach('image', invalidImagePath);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    
    // Clean up
    fs.unlinkSync(invalidImagePath);
  });
}); 