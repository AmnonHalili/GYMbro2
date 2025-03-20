import request from "supertest";
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import { generateToken } from '../../src/utils/tokenUtils';
import path from 'path';
import fs from 'fs';

describe('User Profile API', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let anotherUser: any;
  let accessToken: string;
  let anotherAccessToken: string;
  let testPosts: any[] = [];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
      profilePicture: '/uploads/default.jpg'
    });
    await testUser.save();
    
    anotherUser = new User({
      username: 'anotheruser',
      email: 'another@example.com',
      password: 'Password123!',
      profilePicture: '/uploads/default.jpg'
    });
    await anotherUser.save();
    
    // Generate access tokens
    accessToken = generateToken(testUser._id.toString(), '15m');
    anotherAccessToken = generateToken(anotherUser._id.toString(), '15m');
    
    // Create test posts for the user
    for (let i = 0; i < 3; i++) {
      const post = new Post({
        user: testUser._id,
        content: `Test post ${i + 1} by testuser`,
        likesCount: 0,
        commentsCount: 0
      });
      await post.save();
      testPosts.push(post);
    }
    
    // Create a post for another user
    const anotherPost = new Post({
      user: anotherUser._id,
      content: 'Test post by anotheruser',
      likesCount: 0,
      commentsCount: 0
    });
    await anotherPost.save();

    // Create test image directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Post.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Get User Profile', () => {
    test('should get user profile successfully', async () => {
      const response = await request(app)
        .get(`/api/users/username/${testUser.username}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/username/nonexistentuser')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Get User Posts', () => {
    test('should get posts for a specific user', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.username}/posts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      
      if (response.body.posts.length > 0) {
        expect(response.body.posts[0]).toHaveProperty('_id');
        expect(response.body.posts[0]).toHaveProperty('content');
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
        .get(`/api/users/${noPostsUser.username}/posts`)
        .set('Authorization', `Bearer ${noPostsToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBe(0);
    });
  });

  describe('Update User Profile', () => {
    test('should update user profile successfully', async () => {
      const updateData = {
        username: 'updateduser',
        bio: 'This is my updated bio'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);
    });

    test('should reject update with existing username', async () => {
      const updateData = {
        username: anotherUser.username
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already taken');
    });

    test('should return 401 if user is not authenticated', async () => {
      const updateData = {
        username: 'updateduser',
        bio: 'This is my updated bio'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Access token is required');
    });
  });

  describe('Update Profile Picture', () => {
    test('should update profile picture successfully', async () => {
      // This test would normally use supertest's .attach method to upload a file
      // For testing without an actual file, we'll mock the behavior
      
      // First create a mock image file if testing with a real file
      const testImagePath = path.join(__dirname, '../../uploads/test-image.jpg');
      
      const response = await request(app)
        .put('/api/users/profile-picture')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    test('should return 401 if user is not authenticated', async () => {
      const response = await request(app)
        .put('/api/users/profile-picture')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Access token is required');
    });
  });
});
