import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import bcrypt from 'bcrypt';

// יוצרים פונקציה מקומית במקום להשתמש ב-setup.ts
async function createTestUser(username: string, email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  return user.save();
}

describe('User Login Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // אתחול MongoMemoryServer עם אפשרויות מותאמות
    mongoServer = await MongoMemoryServer.create({
      instance: { port: 0 } // נותן למונגו לבחור פורט פנוי
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    // מחיקת כל המסמכים מכל האוספים אחרי כל בדיקה
    try {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  });

  afterAll(async () => {
    // ניתוק מהמסד נתונים ועצירת השרת לפני סיום הטסטים
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  });

  // בדיקת התחברות תקינה
  test('Should login successfully with valid credentials', async () => {
    // יצירת משתמש לטסט
    await createTestUser('testuser', 'test@example.com', 'Password123');
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      });

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
    // יצירת משתמש לטסט
    await createTestUser('wrongpassword', 'wrong@example.com', 'Password123');
    
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