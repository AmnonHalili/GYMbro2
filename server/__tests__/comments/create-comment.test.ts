import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import Comment from '../../src/models/Comment';
import { generateToken } from '../../src/utils/tokenUtils';

describe('Create Comment API', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testPost: any;
  let accessToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create a test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await testUser.save();
    
    // Generate access token
    accessToken = generateToken(testUser._id.toString(), '15m');
    
    // Create a test post
    testPost = new Post({
      user: testUser._id,
      content: 'Test post for comments'
    });
    await testPost.save();
  });

  afterEach(async () => {
    // Clear comments after each test
    await Comment.deleteMany({});
    // Reset comment count on the post
    await Post.findByIdAndUpdate(testPost._id, { commentsCount: 0 });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('should create a comment on a post', async () => {
    const commentData = {
      content: 'This is a test comment'
    };

    const response = await request(app)
      .post(`/api/comments/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(commentData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('content', commentData.content);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.id).toBe(testUser._id.toString());
    expect(response.body).toHaveProperty('post', testPost._id.toString());
    
    // Verify comment was created in database
    const comment = await Comment.findById(response.body.id);
    expect(comment).not.toBeNull();
    expect(comment?.content).toBe(commentData.content);
    
    // Verify post comment count was updated
    const updatedPost = await Post.findById(testPost._id);
    expect(updatedPost?.commentsCount).toBe(1);
  });

  test('should return 401 if user is not authenticated', async () => {
    const commentData = {
      content: 'This is a test comment'
    };

    const response = await request(app)
      .post(`/api/comments/post/${testPost._id}`)
      .send(commentData)
      .expect(401);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Access token is required');
    
    // Verify no comment was created
    const commentsCount = await Comment.countDocuments();
    expect(commentsCount).toBe(0);
  });

  test('should return 404 if post does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const commentData = {
      content: 'This is a test comment'
    };

    const response = await request(app)
      .post(`/api/comments/post/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(commentData)
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('not found');
    
    // Verify no comment was created
    const commentsCount = await Comment.countDocuments();
    expect(commentsCount).toBe(0);
  });

  test('should return 400 if content is missing', async () => {
    const commentData = {
      // content is missing
    };

    const response = await request(app)
      .post(`/api/comments/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(commentData)
      .expect(400);

    expect(response.body).toHaveProperty('errors');
    
    // Verify no comment was created
    const commentsCount = await Comment.countDocuments();
    expect(commentsCount).toBe(0);
  });

  test('should return 400 if content is too long', async () => {
    // Create a comment with content > 500 chars
    const longContent = 'a'.repeat(501);
    const commentData = {
      content: longContent
    };

    const response = await request(app)
      .post(`/api/comments/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(commentData)
      .expect(400);

    expect(response.body).toHaveProperty('errors');
    
    // Verify no comment was created
    const commentsCount = await Comment.countDocuments();
    expect(commentsCount).toBe(0);
  });
}); 