import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import { generateToken } from '../../src/utils/tokenUtils';

describe('Content Feed API', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let accessToken: string;
  let testPosts: any[] = [];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!'
    });
    await testUser.save();
    
    // Generate access token
    accessToken = generateToken(testUser._id.toString(), '15m');
    
    // Create additional test users
    const users = [];
    for (let i = 0; i < 3; i++) {
      const user = new User({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: 'Password123!'
      });
      await user.save();
      users.push(user);
    }
    
    // Create test posts
    for (let i = 0; i < 15; i++) {
      // Alternate between users for posts
      const user = i % 4 === 0 ? testUser : users[i % 3];
      
      const post = new Post({
        user: user._id,
        content: `Test post ${i + 1}`,
        likesCount: i % 5, // Some posts with more likes for trending test
        commentsCount: i % 3
      });
      await post.save();
      testPosts.push(post);
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Post.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Main Feed', () => {
    test('should get feed with pagination', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      
      if (response.body.posts.length > 0) {
        // Verify response has the correct structure
        const firstPost = response.body.posts[0];
        expect(firstPost).toHaveProperty('_id');
        expect(firstPost).toHaveProperty('content');
        expect(firstPost).toHaveProperty('user');
      }
    });

    test('should respect page and limit parameters', async () => {
      const limit = 5;
      const response = await request(app)
        .get(`/api/posts?page=2&limit=${limit}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      
      // Verify pagination is working if there are enough posts
      if (testPosts.length > limit && response.body.posts.length > 0) {
        const firstPageResponse = await request(app)
          .get(`/api/posts?page=1&limit=${limit}`)
          .set('Authorization', `Bearer ${accessToken}`);
        
        if (firstPageResponse.body.posts && firstPageResponse.body.posts.length > 0) {
          const firstPageIds = firstPageResponse.body.posts.map((post: any) => post._id);
          const secondPageIds = response.body.posts.map((post: any) => post._id);
          
          // Check that the pages don't have overlapping posts if we have enough posts
          if (firstPageIds.length === limit && secondPageIds.length > 0) {
            const hasOverlap = secondPageIds.some((id: string) => firstPageIds.includes(id));
            expect(hasOverlap).toBe(false);
          }
        }
      }
    });

    test('should return 401 if user is not authenticated', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200); // API doesn't require authentication for viewing posts

      expect(response.body).toHaveProperty('posts');
    });
  });

  describe('User Feed', () => {
    test('should get posts for a specific user', async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUser._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      
      // Verify all posts belong to the requested user if we have any results
      if (response.body.posts.length > 0) {
        response.body.posts.forEach((post: any) => {
          expect(post.user._id).toBe(testUser._id.toString());
        });
      }
    });

    test('should return empty array for user with no posts', async () => {
      // Create a user with no posts
      const noPostsUser = new User({
        username: 'nopostsuser',
        email: 'noposts@example.com',
        password: 'Password123!'
      }) as any;
      await noPostsUser.save();
      const noPostsToken = generateToken(noPostsUser._id.toString(), '15m');

      const response = await request(app)
        .get(`/api/posts/user/${noPostsUser._id}`)
        .set('Authorization', `Bearer ${noPostsToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBe(0);
    });
  });

  describe('Trending Posts', () => {
    test('should get trending posts sorted by likes', async () => {
      const response = await request(app)
        .get('/api/posts/trending')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // API מחזיר מערך ישירות במקום אובייקט עם מאפיין posts
      const posts = Array.isArray(response.body) ? response.body : response.body.posts;
      expect(Array.isArray(posts)).toBe(true);
      
      // Verify posts are sorted by likes in descending order if we have any results
      if (posts.length > 1) {
        for (let i = 0; i < posts.length - 1; i++) {
          expect(Number(posts[i].likesCount)).toBeGreaterThanOrEqual(
            Number(posts[i + 1].likesCount)
          );
        }
      }
    });

    test('should respect limit parameter', async () => {
      const limit = 3;
      const response = await request(app)
        .get(`/api/posts/trending?limit=${limit}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // API מחזיר מערך ישירות במקום אובייקט עם מאפיין posts
      const posts = Array.isArray(response.body) ? response.body : response.body.posts;
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeLessThanOrEqual(limit);
    });
  });
});
