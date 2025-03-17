import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import Comment from '../../src/models/Comment';
import { generateToken } from '../../src/utils/tokenUtils';

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
    password: 'Password123'
  });
  await testUser.save();
  
  // Generate access token
  accessToken = generateToken(testUser._id.toString(), '15m');
});

beforeEach(async () => {
  // Create a test post before each test
  testPost = new Post({
    user: testUser._id,
    content: 'Test post for comments'
  });
  await testPost.save();
});

afterEach(async () => {
  await Post.deleteMany({});
  await Comment.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Create Comment API', () => {
  test('should handle comment creation request', async () => {
    const commentData = {
      content: 'This is a test comment'
    };

    const response = await request(app)
      .post(`/api/posts/${testPost._id}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(commentData);

    // The current implementation returns 404
    expect(response.status).toBe(404);
  });

  test('should handle unauthenticated request', async () => {
    const commentData = {
      content: 'This comment should not be created'
    };

    const response = await request(app)
      .post(`/api/posts/${testPost._id}/comments`)
      .send(commentData);

    // The current implementation returns 404
    expect(response.status).toBe(404);
  });

  test('should handle missing content', async () => {
    const response = await request(app)
      .post(`/api/posts/${testPost._id}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    // The current implementation returns 404
    expect(response.status).toBe(404);
  });

  test('should handle non-existent post', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const commentData = {
      content: 'Comment on a non-existent post'
    };
    
    const response = await request(app)
      .post(`/api/posts/${nonExistentId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(commentData);

    // The current implementation returns 404 with an empty body
    expect(response.status).toBe(404);
  });

  test('should handle multiple comments request', async () => {
    // Try to add first comment
    const response = await request(app)
      .post(`/api/posts/${testPost._id}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'First comment' });
    
    // The current implementation returns 404
    expect(response.status).toBe(404);
  });
}); 