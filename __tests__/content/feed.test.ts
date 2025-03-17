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
  let otherUsers: any[] = [];
  let posts: any[] = [];
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

    // Create additional users
    for (let i = 0; i < 3; i++) {
      const user = await User.create({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: 'Password123'
      });
      otherUsers.push(user);
    }

    // Create test posts
    const creators = [testUser, ...otherUsers];
    
    for (let i = 0; i < 15; i++) {
      const creator = creators[i % creators.length];
      const post = await Post.create({
        user: creator._id,
        content: `Post ${i + 1} content`,
        image: i % 3 === 0 ? 'test-image.jpg' : undefined,
        createdAt: new Date(Date.now() - i * 3600000) // Posts at hourly intervals
      });
      posts.push(post);
    }
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('Main Feed', () => {
    test('should get feed with pagination', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('currentPage');
      
      // Verify post structure
      const post = response.body.posts[0];
      expect(post).toHaveProperty('_id');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('user');
      expect(post.user).toHaveProperty('username');
    });

    test('should respect page and limit parameters', async () => {
      const limit = 5;
      
      const response = await request(app)
        .get(`/api/posts?page=2&limit=${limit}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBeLessThanOrEqual(limit);
      expect(response.body.currentPage).toBe(2);
    });

    test('should return 401 if user is not authenticated', async () => {
      const response = await request(app)
        .get('/api/posts');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('User Feed', () => {
    test('should get posts for a specific user', async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUser._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      
      // All returned posts should belong to the test user
      response.body.posts.forEach((post: any) => {
        expect(post.user._id).toBe(testUser._id.toString());
      });
    });

    test('should return empty array for user with no posts', async () => {
      // Create a user with no posts
      const emptyUser = await User.create({
        username: 'emptyuser',
        email: 'empty@example.com',
        password: 'Password123'
      });

      const response = await request(app)
        .get(`/api/posts/user/${emptyUser._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBe(0);
    });
  });

  describe('Trending Posts', () => {
    test('should get trending posts sorted by likes', async () => {
      // Add likes to make some posts "trending"
      await Post.findByIdAndUpdate(posts[0]._id, { $set: { likesCount: 10 } });
      await Post.findByIdAndUpdate(posts[1]._id, { $set: { likesCount: 5 } });
      await Post.findByIdAndUpdate(posts[2]._id, { $set: { likesCount: 8 } });

      const response = await request(app)
        .get('/api/posts/trending')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      
      // Verify posts are sorted by likes count
      if (response.body.posts.length > 1) {
        for (let i = 0; i < response.body.posts.length - 1; i++) {
          expect(response.body.posts[i].likesCount).toBeGreaterThanOrEqual(
            response.body.posts[i + 1].likesCount
          );
        }
      }
    });

    test('should respect limit parameter', async () => {
      const limit = 2;
      
      const response = await request(app)
        .get(`/api/posts/trending?limit=${limit}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBeLessThanOrEqual(limit);
    });
  });
}); 