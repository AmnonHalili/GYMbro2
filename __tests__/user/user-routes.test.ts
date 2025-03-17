import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../server/src/app';
import User from '../../server/src/models/User';
import { generateToken } from '../../server/src/utils/tokenUtils';
import path from 'path';
import fs from 'fs';

describe('User API Routes', () => {
  let mongoServer: MongoMemoryServer;
  let userId: string;
  let authToken: string;
  let userToGet: any;

  beforeAll(async () => {
    // Setup MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create a test user
    const user = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123'
    });
    await user.save();
    userId = user._id.toString();

    // Generate authentication token
    authToken = generateToken(userId, '1h');

    // Create another user to test getUserById and getUserByUsername
    userToGet = new User({
      username: 'usertoget',
      email: 'usertoget@example.com',
      password: 'password123'
    });
    await userToGet.save();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('username', 'testuser');
      expect(res.body).toHaveProperty('email', 'testuser@example.com');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/:userId', () => {
    it('should return user by ID', async () => {
      const res = await request(app).get(`/api/users/${userToGet._id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('username', 'usertoget');
      // Should not return email for privacy
      expect(res.body).not.toHaveProperty('email');
    });

    it('should return 404 if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/users/${nonExistentId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/users/username/:username', () => {
    it('should return user by username', async () => {
      const res = await request(app).get('/api/users/username/usertoget');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('username', 'usertoget');
      expect(res.body).not.toHaveProperty('email');
    });

    it('should return 404 if username not found', async () => {
      const res = await request(app).get('/api/users/username/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update username successfully', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 'updatedusername' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Profile updated successfully');
      expect(res.body.user).toHaveProperty('username', 'updatedusername');

      // Verify the user was updated in the database
      const updatedUser = await User.findById(userId);
      expect(updatedUser?.username).toBe('updatedusername');
    });

    it('should return 409 if username is already taken', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 'usertoget' });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('message', 'Username is already taken');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .send({ username: 'someusername' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid username', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 'a' }); // Too short username

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });
}); 