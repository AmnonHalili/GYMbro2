import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import Comment from '../../src/models/Comment';
import { generateToken } from '../../src/utils/tokenUtils';

describe('Comment Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testPost: any;
  let testComment: any;
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
  });

  beforeEach(async () => {
    // Create a test post before each test
    testPost = await Post.create({
      user: testUser._id,
      content: 'This is a test post for comments'
    });

    // Create a test comment
    testComment = await Comment.create({
      post: testPost._id,
      user: testUser._id,
      content: 'This is a test comment'
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

  test('Should create a comment successfully', async () => {
    const commentData = {
      content: 'This is a test comment'
    };

    const response = await request(app)
      .post(`/api/comments/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(commentData);

    expect(response.status).toBe(201);
    
    const responseData = { comment: response.body };
    expect(responseData).toHaveProperty('comment');
    
    const commentCount = await Comment.countDocuments({ post: testPost._id });
    expect(commentCount).toBe(1);
    
    const post = await Post.findById(testPost._id);
    expect(post?.commentsCount).toBe(1);
  });

  test('Should get comments for a post', async () => {
    const response = await request(app)
      .get(`/api/comments/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Check the structure of the returned comment
    const comment = response.body[0];
    expect(comment).toHaveProperty('_id');
    expect(comment).toHaveProperty('content');
    expect(comment).toHaveProperty('post');
    expect(comment).toHaveProperty('user');
    expect(comment.user).toHaveProperty('username');
  });

  test('Should delete a comment successfully', async () => {
    const response = await request(app)
      .delete(`/api/comments/${testComment._id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    
    // Verify comment was deleted from the database
    const deletedComment = await Comment.findById(testComment._id);
    expect(deletedComment).toBeNull();
  });

  test('Should return 401 if user is not authenticated', async () => {
    const commentData = {
      content: 'This comment should not be created'
    };

    const response = await request(app)
      .post(`/api/comments/post/${testPost._id}`)
      .send(commentData);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });

  test('Should return 400 if content is missing', async () => {
    const response = await request(app)
      .post(`/api/comments/post/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  test('Should return 404 if post does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const commentData = {
      content: 'Comment on non-existent post'
    };

    const response = await request(app)
      .post(`/api/comments/post/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(commentData);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
  });
}); 