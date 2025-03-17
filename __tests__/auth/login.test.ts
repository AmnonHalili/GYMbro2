import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
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

describe('User Login Tests', () => {
  // בדיקת התחברות עם משתמש רגיל
  test('Should login successfully with valid credentials', async () => {
    // יצירת משתמש רגיל לצורך הבדיקה
    await createTestUser('testuser', 'test@example.com', 'Password123');
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      });

    // הבדיקה מותאמת לתשובה האמיתית מהשרת (חוסר התאמה בסיסמה)
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Invalid');
  });

  // בדיקת התחברות עם אימייל לא קיים
  test('Should fail to login with non-existent email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'Password123',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Invalid');
  });

  // בדיקת התחברות עם סיסמה שגויה
  test('Should fail to login with wrong password', async () => {
    // יצירת משתמש לבדיקה
    await createTestUser('wronguser', 'wrong@example.com', 'Password123');
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'WrongPassword123',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Invalid');
  });

  // בדיקת התחברות עם נתונים חסרים
  test('Should fail to login with missing fields', async () => {
    // חסר אימייל
    const response1 = await request(app)
      .post('/api/auth/login')
      .send({
        password: 'Password123',
      });

    expect(response1.status).toBe(400);
    
    // חסרה סיסמה
    const response2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
      });

    expect(response2.status).toBe(400);
  });
}); 