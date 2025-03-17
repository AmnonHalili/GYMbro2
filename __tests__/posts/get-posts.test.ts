import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import User from '../../src/models/User';
import Post from '../../src/models/Post';
import { generateToken } from '../../src/utils/tokenUtils';

let mongoServer: MongoMemoryServer;
let testUser: any;
let anotherUser: any;
let accessToken: string;
let anotherAccessToken: string;

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
  
  anotherUser = new User({
    username: 'anotheruser',
    email: 'another@example.com',
    password: 'password123'
  });
  await anotherUser.save();
  
  // Generate access tokens
  accessToken = generateToken(testUser._id.toString(), '15m');
  anotherAccessToken = generateToken(anotherUser._id.toString(), '15m');
});

afterEach(async () => {
  await Post.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Get Posts API', () => {
  test('should get all posts', async () => {
    // Create some test posts
    await new Post({ user: testUser._id, content: 'First test post' }).save();
    await new Post({ user: testUser._id, content: 'Second test post' }).save();
    await new Post({ user: testUser._id, content: 'Third test post' }).save();
    
    const response = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('posts');
    expect(Array.isArray(response.body.posts)).toBe(true);
    expect(response.body.posts.length).toBe(3);
  });

  test('should paginate posts correctly', async () => {
    // Create many posts
    for (let i = 1; i <= 15; i++) {
      await new Post({ user: testUser._id, content: `Paginated post ${i}` }).save();
    }
    
    // Get first page (10 posts)
    const response1 = await request(app)
      .get('/api/posts?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response1.body.posts.length).toBe(10);
    
    // Get second page (5 posts)
    const response2 = await request(app)
      .get('/api/posts?page=2&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response2.body.posts.length).toBe(5);
    
    // Verify the posts in the two pages are different
    const firstPageIds = response1.body.posts.map((post: any) => post._id);
    const secondPageIds = response2.body.posts.map((post: any) => post._id);
    
    for (const id of secondPageIds) {
      expect(firstPageIds).not.toContain(id);
    }
  });

  test('should get a single post by id', async () => {
    const testPost = await new Post({ user: testUser._id, content: 'Single post to get' }).save();
    
    const response = await request(app)
      .get(`/api/posts/${testPost._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('_id', testPost._id.toString());
    expect(response.body).toHaveProperty('content', 'Single post to get');
    expect(response.body).toHaveProperty('user', testUser._id.toString());
  });

  test('should return 404 if post does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .get(`/api/posts/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('not found');
  });

  test('should get posts by user', async () => {
    // Create posts for the main user
    await new Post({ user: testUser._id, content: 'Main user post 1' }).save();
    await new Post({ user: testUser._id, content: 'Main user post 2' }).save();
    
    // Create posts for another user
    await new Post({ user: anotherUser._id, content: 'Other user post 1' }).save();
    await new Post({ user: anotherUser._id, content: 'Other user post 2' }).save();
    await new Post({ user: anotherUser._id, content: 'Other user post 3' }).save();
    
    // Get the other user's posts
    const response = await request(app)
      .get(`/api/posts/user/${anotherUser._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('posts');
    expect(Array.isArray(response.body.posts)).toBe(true);
    expect(response.body.posts.length).toBe(3);
    
    // Verify all posts belong to the correct user
    for (const post of response.body.posts) {
      expect(post.user).toBe(anotherUser._id.toString());
    }
  });
}); 