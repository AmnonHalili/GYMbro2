import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import { createTestUser } from '../setup';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Registration Tests', () => {
  // בדיקת הרשמה תקינה
  test('Should register a new user successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user).toHaveProperty('username', 'newuser');
    
    // וידוא שהמשתמש נשמר במסד הנתונים
    const user = await User.findOne({ email: 'newuser@example.com' });
    expect(user).not.toBeNull();
  });

  // בדיקת הרשמה עם משתמש קיים
  test('Should fail to register with existing email', async () => {
    // יצירת משתמש קיים
    await createTestUser('existinguser', 'existing@example.com', 'Password123');
    
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'anotheruser',
        email: 'existing@example.com', // אימייל שכבר קיים
        password: 'Password123',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Email already exists');
  });

  // בדיקת הרשמה עם שם משתמש קיים
  test('Should fail to register with existing username', async () => {
    await createTestUser('uniqueusername', 'unique@example.com', 'Password123');
    
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'uniqueusername', // שם משתמש שכבר קיים
        email: 'different@example.com',
        password: 'Password123',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Username already exists');
  });

  // בדיקת הרשמה עם נתונים חסרים
  test('Should fail to register with missing fields', async () => {
    // חסר שם משתמש
    const response1 = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'missing@example.com',
        password: 'Password123',
      });

    expect(response1.status).toBe(400);
    
    // חסר אימייל
    const response2 = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'missingfields',
        password: 'Password123',
      });

    expect(response2.status).toBe(400);
    
    // חסרה סיסמה
    const response3 = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'missingfields',
        email: 'missing@example.com',
      });

    expect(response3.status).toBe(400);
  });

  // בדיקת סיסמה חלשה מדי
  test('Should fail to register with weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'weakpass',
        email: 'weak@example.com',
        password: '123', // סיסמה קצרה מדי
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
    const errorMessages = response.body.errors.map((err: any) => err.msg);
    expect(errorMessages.some((msg: string) => msg.includes('Password'))).toBe(true);
  });

  // בדיקת פורמט אימייל שגוי
  test('Should fail to register with invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'invalidemail',
        email: 'not-an-email',
        password: 'Password123',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
    const errorMessages = response.body.errors.map((err: any) => err.msg);
    expect(errorMessages.some((msg: string) => msg.includes('valid email'))).toBe(true);
  });
}); 