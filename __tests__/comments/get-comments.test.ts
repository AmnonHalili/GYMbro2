import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../server/src/app';
import User from '../../server/src/models/User';
import Post from '../../server/src/models/Post';
import Comment from '../../server/src/models/Comment';
import { generateToken } from '../../server/src/utils/tokenUtils';

describe('Get Comments API', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testPost: any;
  let accessToken: string;
  let comments: any[] = [];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123'
    });
    await testUser.save();
    
    // Generate auth token
    accessToken = generateToken(testUser._id.toString(), '15m');
    
    // Create test post
    testPost = new Post({
      user: testUser._id,
      content: 'Test post content',
      imageUrl: null
    });
    await testPost.save();
    
    // Create multiple comments for testing
    for (let i = 0; i < 5; i++) {
      const comment = new Comment({
        user: testUser._id,
        post: testPost._id,
        content: `Test comment ${i + 1}`
      });
      await comment.save();
      comments.push(comment);
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('GET /api/comments/post/:postId', () => {
    it('should get all comments for a post', async () => {
      const res = await request(app)
        .get(`/api/comments/post/${testPost._id}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('comments');
      expect(Array.isArray(res.body.comments)).toBe(true);
      expect(res.body.comments.length).toBe(5);
      
      // Check if comment structure is correct
      const comment = res.body.comments[0];
      expect(comment).toHaveProperty('_id');
      expect(comment).toHaveProperty('content');
      expect(comment).toHaveProperty('user');
      expect(comment.user).toHaveProperty('username');
    });

    it('should return empty array for a post with no comments', async () => {
      // Create a new post without comments
      const newPost = new Post({
        user: testUser._id,
        content: 'Post with no comments',
        imageUrl: null
      });
      await newPost.save();
      
      const res = await request(app)
        .get(`/api/comments/post/${newPost._id}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('comments');
      expect(Array.isArray(res.body.comments)).toBe(true);
      expect(res.body.comments.length).toBe(0);
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/comments/post/${nonExistentId}`);
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'Post not found');
    });
  });

  describe('GET /api/comments/:commentId', () => {
    it('should get a specific comment by ID', async () => {
      const commentId = comments[0]._id;
      
      const res = await request(app)
        .get(`/api/comments/${commentId}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id', commentId.toString());
      expect(res.body).toHaveProperty('content', 'Test comment 1');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', 'testuser');
    });

    it('should return 404 for non-existent comment', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/comments/${nonExistentId}`);
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'Comment not found');
    });
  });
}); 