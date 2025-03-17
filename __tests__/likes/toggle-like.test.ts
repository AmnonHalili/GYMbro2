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
    password: 'Password123'
  });
  await testUser.save();
  
  anotherUser = new User({
    username: 'anotheruser',
    email: 'another@example.com',
    password: 'Password123'
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
    content: 'Test post for likes'
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

describe('Toggle Like API', () => {
  test('should handle like request to a post', async () => {
    const response = await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('liked', true);
    expect(response.body).toHaveProperty('likesCount');
    expect(response.body.likesCount).toBe(1);
  });

  test('should handle unlike request to a post', async () => {
    // First try to like the post
    await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    
    // Then try to toggle it off
    const response = await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('liked', false);
    expect(response.body).toHaveProperty('likesCount');
    expect(response.body.likesCount).toBe(0);
  });

  test('should handle unauthenticated like request', async () => {
    const response = await request(app)
      .post(`/api/likes/post/${testPost._id}`);

    expect(response.status).toBe(401);
  });

  test('should handle request for non-existent post', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .post(`/api/likes/post/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
  });

  test('should handle multiple users liking request', async () => {
    // First user tries to like the post
    await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    
    // Second user tries to like the post
    const response = await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .set('Authorization', `Bearer ${anotherAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('liked', true);
    expect(response.body).toHaveProperty('likesCount');
    expect(response.body.likesCount).toBe(2);
  });
}); 