import request from 'supertest';
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
  let users: any[] = [];
  let posts: any[] = [];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users
    const usernames = ['fitness_lover', 'gym_enthusiast', 'health_guru', 'workout_master', 'nutrition_expert'];
    for (let i = 0; i < usernames.length; i++) {
      const user = await User.create({
        username: usernames[i],
        email: `${usernames[i]}@example.com`,
        password: 'Password123',
        profilePicture: i % 2 === 0 ? 'profile.jpg' : undefined
      });
      users.push(user);
    }

    // Set the first user as our test user
    testUser = users[0];
    accessToken = generateToken(testUser._id.toString(), '15m');

    // Create test posts with different content
    const contents = [
      'My workout routine for building muscle',
      'Best protein supplements for muscle growth',
      'How to maintain a balanced diet for fitness',
      'Cardio exercises for weight loss',
      'Strength training tips for beginners',
      'Yoga poses for flexibility and strength',
      'Nutrition advice for pre and post workout',
      'My fitness journey and transformation'
    ];

    for (let i = 0; i < contents.length; i++) {
      const post = await Post.create({
        user: users[i % users.length]._id,
        content: contents[i],
        image: i % 3 === 0 ? 'post-image.jpg' : undefined
      });
      posts.push(post);
    }
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('Search Users', () => {
    test('should find users by username fragment', async () => {
      const query = 'fitness';
      
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'users', q: query });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);
      
      // All returned users should match the query
      response.body.users.forEach((user: any) => {
        expect(user.username.toLowerCase()).toContain(query.toLowerCase());
      });
    });

    test('should return empty array for no user matches', async () => {
      const query = 'nonexistentusername';
      
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'users', q: query });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBe(0);
    });
  });

  describe('Search Posts', () => {
    test('should find posts by content fragment', async () => {
      const query = 'workout';
      
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'posts', q: query });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBeGreaterThan(0);
      
      // All returned posts should match the query
      response.body.posts.forEach((post: any) => {
        expect(post.content.toLowerCase()).toContain(query.toLowerCase());
      });
    });

    test('should return empty array for no post matches', async () => {
      const query = 'nonexistentcontent';
      
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'posts', q: query });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBe(0);
    });

    test('should respect limit parameter', async () => {
      const limit = 2;
      
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'posts', q: 'fitness', limit });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('Combined Search', () => {
    test('should search both users and posts', async () => {
      const query = 'fit';
      
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ q: query });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(Array.isArray(response.body.posts)).toBe(true);
      
      // Verify returned results match the query
      if (response.body.users.length > 0) {
        response.body.users.forEach((user: any) => {
          expect(user.username.toLowerCase()).toContain(query.toLowerCase());
        });
      }
      
      if (response.body.posts.length > 0) {
        response.body.posts.forEach((post: any) => {
          expect(post.content.toLowerCase()).toContain(query.toLowerCase());
        });
      }
    });

    test('should return 401 if user is not authenticated', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'test' });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    test('should return 400 if query is too short', async () => {
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ q: 'a' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });
}); 