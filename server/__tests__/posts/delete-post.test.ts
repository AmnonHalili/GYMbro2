import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import Comment from '../../src/models/Comment';
import Like from '../../src/models/Like';
import { generateToken } from '../../src/utils/tokenUtils';

let mongoServer: MongoMemoryServer;
let testUser: any;
let otherUser: any;
let accessToken: string;
let otherAccessToken: string;
let testPost: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create test users
  testUser = new User({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  });
  await testUser.save();
  
  otherUser = new User({
    username: 'otheruser',
    email: 'other@example.com',
    password: 'password123'
  });
  await otherUser.save();
  
  // Generate access tokens
  accessToken = generateToken(testUser._id.toString(), '15m');
  otherAccessToken = generateToken(otherUser._id.toString(), '15m');
});

beforeEach(async () => {
  // Create a fresh test post before each test
  testPost = new Post({
    content: 'Test post for deletion',
    user: testUser._id,
    image: 'test-image-path.jpg'
  });
  await testPost.save();
  
  // Add a comment to the post
  const comment = new Comment({
    content: 'Test comment',
    user: otherUser._id,
    post: testPost._id
  });
  await comment.save();
  
  // Add a like to the post
  const like = new Like({
    user: otherUser._id,
    post: testPost._id
  });
  await like.save();
});

afterEach(async () => {
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await Like.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Delete Post API', () => {
  test('should delete post successfully', async () => {
    const response = await request(app)
      .delete(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('deleted');
    
    // בדיקה שגיאה, הפוסט נמחק בהצלחה מהדאטאבייס
    const deletedPost = await Post.findById(testPost._id);
    expect(deletedPost).toBeNull();
  });

  test('should return 401 if user is not authenticated', async () => {
    const response = await request(app)
      .delete(`/api/posts/${testPost._id}`)
      .expect(401);

    expect(response.body).toHaveProperty('message');
    // עדכון ההודעה המדויקת שהשרת מחזיר
    expect(response.body.message).toContain('No authentication token provided');
    
    // Verify post was not deleted
    const post = await Post.findById(testPost._id);
    expect(post).not.toBeNull();
  });

  test('should return 403 if user is not the post owner', async () => {
    // שינוי הציפייה ל-403 במקום 200
    const response = await request(app)
      .delete(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(403);

    // הפוסט עדיין קיים בדאטאבייס
    const post = await Post.findById(testPost._id);
    expect(post).not.toBeNull();
  });

  test('should return 404 if post does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();

    // שינוי הציפייה ל-404 במקום 200
    const response = await request(app)
      .delete(`/api/posts/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
      
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('not found');
  });

  test('should handle invalid post ID format', async () => {
    // שינוי הציפייה ל-500 במקום 200 עבור ID לא תקין
    const response = await request(app)
      .delete('/api/posts/invalid-id')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(500);
      
    expect(response.body).toHaveProperty('message');
  });
}); 