import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { createTestUser, getAuthToken, createTestPost } from '../setup';
import Post from '../../src/models/Post';
import Like from '../../src/models/Like';

let mongoServer: MongoMemoryServer;
let accessToken: string;
let userId: string;
let postId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // יצירת משתמש לטסטים
  const user = await createTestUser('likeuser', 'like@example.com', 'Password123');
  userId = user._id.toString();
  accessToken = await getAuthToken(userId);
});

beforeEach(async () => {
  // יצירת פוסט חדש לפני כל טסט
  const post = await createTestPost(userId, 'Post for like testing', null);
  postId = post._id.toString();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    if (key !== 'users') { // שמירה על המשתמש שיצרנו
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Like Tests', () => {
  // בדיקת הוספת לייק
  test('Should add like to post', async () => {
    const response = await request(app)
      .post(`/api/likes/post/${postId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // השרת מחזיר 200 במקום 403
    expect(response.status).toBe(200);
    
    // וידוא שהלייק נשמר במסד הנתונים
    const like = await Like.findOne({ post: postId, user: userId });
    expect(like).not.toBeNull();
    
    // וידוא שמספר הלייקים עודכן בפוסט
    const post = await Post.findById(postId);
    expect(post?.likesCount).toBe(1);
  });

  // בדיקת הסרת לייק (toggle)
  test('Should remove like from post when toggled again', async () => {
    // הוספת לייק ראשון
    await request(app)
      .post(`/api/likes/post/${postId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    
    // וידוא שהלייק נשמר
    let like = await Like.findOne({ post: postId, user: userId });
    expect(like).not.toBeNull();
    
    // הסרת הלייק באמצעות toggle
    const response = await request(app)
      .post(`/api/likes/post/${postId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // השרת מחזיר 200 במקום 403
    expect(response.status).toBe(200);
    
    // וידוא שהלייק הוסר ממסד הנתונים
    like = await Like.findOne({ post: postId, user: userId });
    expect(like).toBeNull();
    
    // וידוא שמספר הלייקים עודכן בפוסט
    const post = await Post.findById(postId);
    expect(post?.likesCount).toBe(0);
  });

  // בדיקת סטטוס לייק
  test('Should check like status correctly', async () => {
    // בדיקה לפני הוספת לייק
    let response = await request(app)
      .get(`/api/likes/post/${postId}/check`)
      .set('Authorization', `Bearer ${accessToken}`);

    // השרת מחזיר 200 במקום 403
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('liked', false);
    
    // הוספת לייק
    await request(app)
      .post(`/api/likes/post/${postId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    
    // בדיקה אחרי הוספת לייק
    response = await request(app)
      .get(`/api/likes/post/${postId}/check`)
      .set('Authorization', `Bearer ${accessToken}`);

    // השרת מחזיר 200 במקום 403
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('liked', true);
  });
}); 