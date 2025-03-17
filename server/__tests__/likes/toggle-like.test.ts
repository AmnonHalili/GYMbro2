import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import Like from '../../src/models/Like';
import { generateToken } from '../../src/utils/tokenUtils';

describe('Toggle Like API', () => {
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
    
    // Create a test post
    testPost = new Post({
      user: testUser._id,
      content: 'Test post for likes',
    });
    await testPost.save();
  });

  afterEach(async () => {
    // Reset likes after each test
    await Like.deleteMany({});
    // Reset post like count
    await Post.findByIdAndUpdate(testPost._id, { likesCount: 0 });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Post.deleteMany({});
    await Like.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('should add a like to a post', async () => {
    const response = await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(response.body).toHaveProperty('liked', true);
    expect(response.body).toHaveProperty('likesCount', 1);
    
    // Verify like was created in database
    const like = await Like.findOne({ user: testUser._id, post: testPost._id });
    expect(like).not.toBeNull();
    
    // Verify post like count was updated
    const updatedPost = await Post.findById(testPost._id);
    expect(updatedPost?.likesCount).toBe(1);
  });

  test('should remove a like from a post', async () => {
    // First add a like
    await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
    
    // Then toggle it off
    const response = await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('liked', false);
    expect(response.body).toHaveProperty('likesCount', 0);
    
    // Verify like was removed from database
    const like = await Like.findOne({ user: testUser._id, post: testPost._id });
    expect(like).toBeNull();
    
    // Verify post like count was updated
    const updatedPost = await Post.findById(testPost._id);
    expect(updatedPost?.likesCount).toBe(0);
  });

  test('should return 401 if user is not authenticated', async () => {
    const response = await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .expect(401);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Access token is required');
  });

  test('should return 404 if post does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .post(`/api/likes/post/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('not found');
    
    // Verify no like was created
    const likesCount = await Like.countDocuments();
    expect(likesCount).toBe(0);
  });

  test('should handle multiple users liking the same post', async () => {
    // First user likes the post
    await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
    
    // Second user likes the post
    const response = await request(app)
      .post(`/api/likes/post/${testPost._id}`)
      .set('Authorization', `Bearer ${anotherAccessToken}`)
      .expect(201);

    expect(response.body).toHaveProperty('liked', true);
    expect(response.body).toHaveProperty('likesCount', 2);
    
    // Verify both likes exist in database
    const likesCount = await Like.countDocuments();
    expect(likesCount).toBe(2);
    
    // Verify post like count was updated
    const updatedPost = await Post.findById(testPost._id);
    expect(updatedPost?.likesCount).toBe(2);
  });
}); 