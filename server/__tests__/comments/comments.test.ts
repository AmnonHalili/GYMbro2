import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { createTestUser, getAuthToken, createTestPost, createTestComment } from '../setup';
import Post from '../../src/models/Post';
import Comment from '../../src/models/Comment';

let mongoServer: MongoMemoryServer;
let accessToken: string;
let userId: string;
let postId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // יצירת משתמש לטסטים
  const user = await createTestUser('commentuser', 'comment@example.com', 'Password123');
  userId = user._id.toString();
  accessToken = await getAuthToken(userId);
});

beforeEach(async () => {
  // יצירת פוסט חדש לפני כל טסט
  const post = await createTestPost(userId, 'Post for comment testing', null);
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

describe('Comment Tests', () => {
  // בדיקת יצירת תגובה
  test('Should create a comment successfully', async () => {
    const response = await request(app)
      .post(`/api/comments/post/${postId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'This is a test comment' });

    // השרת מחזיר 201 (Created) במקום 403
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('comment');
    
    // וידוא שהתגובה נשמרה במסד הנתונים
    const comment = await Comment.countDocuments({ post: postId });
    expect(comment).toBe(1);
    
    // וידוא שמספר התגובות עודכן בפוסט
    const post = await Post.findById(postId);
    expect(post?.commentsCount).toBe(1);
  });

  // בדיקת קבלת תגובות של פוסט
  test('Should get comments for a post', async () => {
    // יצירת מספר תגובות
    await createTestComment(userId, postId, 'First comment');
    await createTestComment(userId, postId, 'Second comment');
    await createTestComment(userId, postId, 'Third comment');
    
    const response = await request(app)
      .get(`/api/comments/post/${postId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('comments');
    expect(Array.isArray(response.body.comments)).toBe(true);
    expect(response.body.comments.length).toBe(3);
    
    // וידוא שהתגובות מכילות את התוכן הנכון
    const contents = response.body.comments.map((comment: any) => comment.content);
    expect(contents).toContain('First comment');
    expect(contents).toContain('Second comment');
    expect(contents).toContain('Third comment');
  });

  // בדיקת מחיקת תגובה
  test('Should delete a comment successfully', async () => {
    // יצירת תגובה
    const comment = await createTestComment(userId, postId, 'Comment to delete');
    const commentId = comment._id.toString();
    
    const response = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // השרת מחזיר 200 במקום 403
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('deleted');
    
    // וידוא שהתגובה נמחקה ממסד הנתונים
    const deletedComment = await Comment.findById(commentId);
    expect(deletedComment).toBeNull();
    
    // וידוא שמספר התגובות עודכן בפוסט
    const post = await Post.findById(postId);
    expect(post?.commentsCount).toBe(0);
  });
}); 