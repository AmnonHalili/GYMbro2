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

  describe('User Search', () => {
    test('should find users by username fragment', async () => {
      const query = 'fit';
      
      const response = await request(app)
        .get(`/api/search/users?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((user: any) => user.username.toLowerCase().includes('fit'))).toBe(true);
      // Check user object structure
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('_id');
        expect(response.body[0]).toHaveProperty('username');
      }
    });

    test('should return empty array for no matches', async () => {
      const query = 'nonexistentusername';
      
      const response = await request(app)
        .get(`/api/search/users?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test('should return 401 if user is not authenticated', async () => {
      const response = await request(app)
        .get('/api/search/users?q=test')
        .expect(401);
      
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Post Search', () => {
    test('should find posts by content fragment', async () => {
      const query = 'workout';
      
      const response = await request(app)
        .get(`/api/search/posts?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((post: any) => post.content.toLowerCase().includes('workout'))).toBe(true);
      // Check post object structure
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('_id');
        expect(response.body[0]).toHaveProperty('content');
        expect(response.body[0]).toHaveProperty('user');
      }
    });

    test('should return empty array for no matches', async () => {
      const query = 'nonexistentcontent';
      
      const response = await request(app)
        .get(`/api/search/posts?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test('should respect limit parameter', async () => {
      const limit = 2;
      
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
      
      const response = await request(app)
        .get(`/api/search?q=${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(Array.isArray(response.body.posts)).toBe(true);
      
      // Check response structure
      if (response.body.users.length > 0) {
        expect(response.body.users[0]).toHaveProperty('_id');
        expect(response.body.users[0]).toHaveProperty('username');
      }
      
      if (response.body.posts.length > 0) {
        expect(response.body.posts[0]).toHaveProperty('_id');
        expect(response.body.posts[0]).toHaveProperty('content');
      }
    });

    test('should return empty arrays for no matches', async () => {
      const query = 'nonexistentcontent';
      
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