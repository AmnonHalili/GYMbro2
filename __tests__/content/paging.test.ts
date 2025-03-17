import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../server/src/app';
import User from '../../server/src/models/User';
import Post from '../../server/src/models/Post';
import { generateToken } from '../../server/src/utils/tokenUtils';

describe('Post Paging API', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let accessToken: string;
  let posts: any[] = [];

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
    
    // Create multiple posts for testing paging
    for (let i = 0; i < 15; i++) {
      const post = new Post({
        user: testUser._id,
        content: `Test post content ${i + 1}`,
        imageUrl: null,
        createdAt: new Date(Date.now() - i * 3600000) // posts at one hour intervals
      });
      await post.save();
      posts.push(post);
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Post.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('GET /api/posts', () => {
    it('should get first page of posts with default page size', async () => {
      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('posts');
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body.posts.length).toBe(10); // Default page size should be 10
      expect(res.body).toHaveProperty('totalPosts');
      expect(res.body.totalPosts).toBe(15);
      expect(res.body).toHaveProperty('hasMore', true);
      
      // Verify the posts are ordered by most recent first
      expect(new Date(res.body.posts[0].createdAt).getTime()).toBeGreaterThan(
        new Date(res.body.posts[1].createdAt).getTime()
      );
    });

    it('should get second page of posts with custom page size', async () => {
      const res = await request(app)
        .get('/api/posts?page=2&limit=5')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('posts');
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body.posts.length).toBe(5);
      expect(res.body).toHaveProperty('totalPosts');
      expect(res.body.totalPosts).toBe(15);
      expect(res.body).toHaveProperty('hasMore', true);
      
      // Check the posts are correctly paginated
      // Page 2 with limit 5 should have posts 6-10 in reverse chronological order
      expect(res.body.posts[0].content).toBe('Test post content 6');
    });

    it('should handle page beyond available content', async () => {
      const res = await request(app)
        .get('/api/posts?page=4&limit=5')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('posts');
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body.posts.length).toBe(0);
      expect(res.body).toHaveProperty('totalPosts');
      expect(res.body.totalPosts).toBe(15);
      expect(res.body).toHaveProperty('hasMore', false);
    });

    it('should filter posts by user', async () => {
      // Create another user with posts
      const anotherUser = new User({
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'Password123'
      });
      await anotherUser.save();
      
      // Create a few posts for the other user
      for (let i = 0; i < 3; i++) {
        await new Post({
          user: anotherUser._id,
          content: `Another user post ${i + 1}`,
          imageUrl: null
        }).save();
      }
      
      // Filter posts by the original test user
      const res = await request(app)
        .get(`/api/posts?userId=${testUser._id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('posts');
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body.totalPosts).toBe(15);
      
      // Verify all returned posts belong to the requested user
      res.body.posts.forEach((post: any) => {
        expect(post.user._id.toString()).toBe(testUser._id.toString());
      });
    });
  });
}); 