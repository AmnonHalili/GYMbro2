import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import { generateToken } from '../../src/utils/tokenUtils';

describe('Update Post API', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let otherUser: any;
  let testPost: any;
  let accessToken: string;
  let otherUserToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123'
    });
    
    otherUser = await User.create({
      username: 'otheruser',
      email: 'other@example.com',
      password: 'Password123'
    });
    
    // Generate access tokens
    accessToken = generateToken(testUser._id.toString(), '15m');
    otherUserToken = generateToken(otherUser._id.toString(), '15m');
  });

  beforeEach(async () => {
    // Create a test post before each test
    testPost = await Post.create({
      user: testUser._id,
      content: 'Original post content'
    });
  });

  afterEach(async () => {
    // Clean up posts after each test
    await Post.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  test('should update a post successfully', async () => {
    const updateData = {
      content: 'Updated post content'
    };

    const response = await request(app)
      .put(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('_id');
    expect(response.body.content).toBe(updateData.content);
    expect(response.body.user._id).toBe(testUser._id.toString());

    // Verify post was updated in the database
    const updatedPost = await Post.findById(testPost._id);
    expect(updatedPost).not.toBeNull();
    expect(updatedPost?.content).toBe(updateData.content);
  });

  test('should return 401 if user is not authenticated', async () => {
    const updateData = {
      content: 'This update should not work'
    };

    const response = await request(app)
      .put(`/api/posts/${testPost._id}`)
      .send(updateData);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });

  test('should return 403 if user is not the post owner', async () => {
    const updateData = {
      content: 'This update should not work'
    };

    const response = await request(app)
      .put(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send(updateData);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
  });

  test('should return 400 if content is missing', async () => {
    const response = await request(app)
      .put(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  test('should return 404 if post does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const updateData = {
      content: 'This post does not exist'
    };

    const response = await request(app)
      .put(`/api/posts/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
  });
}); 