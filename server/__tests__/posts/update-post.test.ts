import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import { generateToken } from '../../src/utils/tokenUtils';

let mongoServer: MongoMemoryServer;
let testUser: any;
let anotherUser: any;
let testPost: any;
let accessToken: string;
let anotherAccessToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create test users
  testUser = new User({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  });
  await testUser.save();
  
  anotherUser = new User({
    username: 'anotheruser',
    email: 'another@example.com',
    password: 'password123'
  });
  await anotherUser.save();
  
  // Generate access tokens
  accessToken = generateToken(testUser._id.toString(), '15m');
  anotherAccessToken = generateToken(anotherUser._id.toString(), '15m');
});

beforeEach(async () => {
  // Create a test post before each test
  testPost = new Post({
    user: testUser._id,
    content: 'Original post content'
  });
  await testPost.save();
});

afterEach(async () => {
  await Post.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Update Post API', () => {
  test('should update a post successfully', async () => {
    const updateData = {
      content: 'Updated post content'
    };

    const response = await request(app)
      .put(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('post');
    expect(response.body.post).toHaveProperty('_id');
    expect(response.body.post.content).toBe(updateData.content);
    expect(response.body.post.user._id).toBe(testUser._id.toString());

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
      .send(updateData)
      .expect(401);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('token');
  });

  test('should return 403 if user is not the post owner', async () => {
    const updateData = {
      content: 'This update should not work'
    };

    const response = await request(app)
      .put(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${anotherAccessToken}`)
      .send(updateData);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('You can only update your own posts');
  });

  test('should return 400 if content is missing', async () => {
    const response = await request(app)
      .put(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(400);
    // The response contains validation errors in a different format
    expect(response.body).toHaveProperty('errors');
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(response.body.errors[0]).toHaveProperty('path', 'content');
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
    expect(response.body.message).toContain('not found');
  });
});
