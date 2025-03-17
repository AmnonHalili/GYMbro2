import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Comment from '../src/models/Comment';
import Like from '../src/models/Like';

/**
 * יוצר משתמש חדש למטרות טסטים
 * @param username שם משתמש
 * @param email כתובת אימייל
 * @param password סיסמה
 * @returns משתמש שנוצר
 */
export async function createTestUser(username: string, email: string, password: string): Promise<any> {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    username,
    email,
    password: hashedPassword,
    profilePicture: null,
  });
  await user.save();
  return user;
}

/**
 * יוצר טוקן JWT לצורך אותנטיקציה בטסטים
 * @param userId מזהה המשתמש
 * @returns טוקן גישה
 */
export async function getAuthToken(userId: string): Promise<string> {
  const tokenSecret = process.env.ACCESS_TOKEN_SECRET || 'access-secret-for-test';
  return jwt.sign({ userId }, tokenSecret, { expiresIn: '1h' });
}

/**
 * מכין תמונת טסט לשימוש בטסטים
 * @returns נתיב לתמונת הטסט
 */
export async function setupTestImage(): Promise<string> {
  // העתקת תמונת טסט אם קיימת במקום אחר
  const mockImagePath = path.join(__dirname, '..', '__mocks__', 'test-image.jpg');
  
  // אם התמונה לא קיימת, צור תמונה מינימלית
  if (!fs.existsSync(mockImagePath)) {
    const dir = path.dirname(mockImagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // יצירת קובץ תמונה מינימלי
    const minimalJPEGHeader = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x10, 0x03, 0x01,
      0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xc4, 0x00, 0x14,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02,
      0x10, 0x03, 0x10, 0x00, 0x00, 0x01, 0x54, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xd9
    ]);
    fs.writeFileSync(mockImagePath, minimalJPEGHeader);
  }
  
  return mockImagePath;
}

/**
 * יוצר פוסט חדש למטרות טסטים
 * @param userId מזהה המשתמש היוצר
 * @param content תוכן הפוסט
 * @param imageUrl נתיב לתמונה (אופציונלי)
 * @returns הפוסט שנוצר
 */
export async function createTestPost(userId: string, content: string, imageUrl: string | null): Promise<any> {
  const post = new Post({
    user: userId,
    content,
    image: imageUrl,
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  await post.save();
  return post;
}

/**
 * יוצר תגובה חדשה למטרות טסטים
 * @param userId מזהה המשתמש המגיב
 * @param postId מזהה הפוסט
 * @param content תוכן התגובה
 * @returns התגובה שנוצרה
 */
export async function createTestComment(userId: string, postId: string, content: string): Promise<any> {
  const comment = new Comment({
    user: userId,
    post: postId,
    content,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  await comment.save();
  
  // עדכון מספר התגובות בפוסט
  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
  
  return comment;
}

/**
 * יוצר לייק חדש למטרות טסטים
 * @param userId מזהה המשתמש
 * @param postId מזהה הפוסט
 * @returns הלייק שנוצר
 */
export async function createTestLike(userId: string, postId: string): Promise<any> {
  const like = new Like({
    user: userId,
    post: postId,
    createdAt: new Date()
  });
  await like.save();
  
  // עדכון מספר הלייקים בפוסט
  await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
  
  return like;
}

/**
 * מנקה אוסף נתונים מסוים
 * @param collectionName שם האוסף לניקוי
 */
export async function clearCollection(collectionName: string): Promise<void> {
  if (mongoose.connection.collections[collectionName]) {
    await mongoose.connection.collections[collectionName].deleteMany({});
  }
}

/**
 * מנקה את כל אוספי הנתונים
 */
export async function clearAllCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export default {
  createTestUser,
  getAuthToken,
  setupTestImage,
  createTestPost,
  createTestComment,
  createTestLike,
  clearCollection,
  clearAllCollections,
}; 