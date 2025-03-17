import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Comment from '../src/models/Comment';
import { generateToken } from '../src/utils/tokenUtils';

describe('Delete Post API', () => {
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

    accessToken = generateToken(testUser._id.toString(), '15m');
    otherUserToken = generateToken(otherUser._id.toString(), '15m');
  });

  beforeEach(async () => {
    // Create a test post before each test
    testPost = await Post.create({
      user: testUser._id,
      content: 'Test post for deletion',
      image: 'test-image-path.jpg'
    });

    // Create a test comment on the post
    await Comment.create({
      post: testPost._id,
      user: testUser._id,
      content: 'Test comment on the post'
    });
  });

  afterEach(async () => {
    // Clean up posts and comments after each test
    await Post.deleteMany({});
    await Comment.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  test('should delete post successfully', async () => {
    const response = await request(app)
      .delete(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    
    // Verify post was deleted from the database
    const deletedPost = await Post.findById(testPost._id);
    expect(deletedPost).toBeNull();
    
    // Verify associated comments were deleted
    const comments = await Comment.find({ post: testPost._id });
    expect(comments.length).toBe(0);
  });

  test('should return 401 if user is not authenticated', async () => {
    const response = await request(app)
      .delete(`/api/posts/${testPost._id}`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Access token is required');
    
    // Verify post was not deleted
    const post = await Post.findById(testPost._id);
    expect(post).not.toBeNull();
  });

  test('should return 403 if user is not the post owner', async () => {
    const response = await request(app)
      .delete(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
    
    // Verify post was not deleted
    const post = await Post.findById(testPost._id);
    expect(post).not.toBeNull();
  });

  test('should return 404 if post does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .delete(`/api/posts/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
  });

  test('should handle invalid post ID format', async () => {
    const response = await request(app)
      .delete('/api/posts/invalid-id')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });
}); 