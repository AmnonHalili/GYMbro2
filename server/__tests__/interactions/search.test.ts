import request from "supertest";
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import { generateToken } from '../../src/utils/tokenUtils';

describe('Search API', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let accessToken: string;

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
    
    // Create test users with varied usernames
    const testUsers = [
      { username: 'fitness_lover', email: 'fitness@example.com' },
      { username: 'gymrat', email: 'gym@example.com' },
      { username: 'healthyeater', email: 'health@example.com' },
      { username: 'runner123', email: 'run@example.com' },
      { username: 'yogalover', email: 'yoga@example.com' }
    ];
    
    for (const userData of testUsers) {
      const user = new User({
        ...userData,
        password: 'Password123!'
      });
      await user.save();
    }
    
    // Create test posts with varied content
    const testPosts = [
      { content: 'My workout routine today included squats and deadlifts', user: testUser._id },
      { content: 'I love protein smoothies after a good gym session', user: testUser._id },
      { content: 'Cardio day: 5 miles run and feeling great!', user: testUser._id },
      { content: 'Yoga and meditation for mental health', user: testUser._id },
      { content: 'Healthy meal prep tips for beginners', user: testUser._id }
    ];
    
    for (const postData of testPosts) {
      const post = new Post({
        ...postData,
        likesCount: 0,
        commentsCount: 0
      });
      await post.save();
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Post.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('User Search', () => {
    test('should find users by username fragment', async () => {
      const query = 'fit';
      
      // Route is now implemented
      const response = await request(app)
        .get(`/api/search/users?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((user: any) => user.username.toLowerCase().includes('fit'))).toBe(true);
    });

    test('should return empty array for no matches', async () => {
      const query = 'nonexistentusername';
      
      // Route is now implemented
      const response = await request(app)
        .get(`/api/search/users?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test('should return 401 if user is not authenticated', async () => {
      // Route is now implemented, expect 401 for unauthorized access
      const response = await request(app)
        .get('/api/search/users?q=test')
        .expect(401);
    });
  });

  describe('Post Search', () => {
    test('should find posts by content fragment', async () => {
      const query = 'workout';
      
      // Route is now implemented
      const response = await request(app)
        .get(`/api/search/posts?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((post: any) => post.content.toLowerCase().includes('workout'))).toBe(true);
    });

    test('should return empty array for no matches', async () => {
      const query = 'nonexistentcontent';
      
      // Route is now implemented
      const response = await request(app)
        .get(`/api/search/posts?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test('should respect limit parameter', async () => {
      const limit = 2;
      
      // Route is now implemented
      const response = await request(app)
        .get(`/api/search/posts?q=health&limit=${limit}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('Combined Search', () => {
    test('should search both users and posts', async () => {
      const query = 'health';
      
      // Route is now implemented
      const response = await request(app)
        .get(`/api/search?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(Array.isArray(response.body.posts)).toBe(true);
      // Check if we found at least something in either category
      expect(response.body.users.length + response.body.posts.length).toBeGreaterThan(0);
    });

    test('should return empty arrays for no matches', async () => {
      const query = 'nonexistentcontent';
      
      // Route is now implemented
      const response = await request(app)
        .get(`/api/search?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.users.length).toBe(0);
      expect(response.body.posts.length).toBe(0);
    });
  });
});
