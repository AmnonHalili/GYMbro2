import { Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';

// Search users by username
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!query) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }
    
    // Search for users where username contains the query (case insensitive)
    const users = await User.find({
      username: { $regex: query, $options: 'i' }
    })
    .select('username profilePicture')
    .limit(limit);
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error while searching users' });
  }
};

// Search posts by content
export const searchPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!query) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }
    
    // Search for posts where content contains the query (case insensitive)
    const posts = await Post.find({
      content: { $regex: query, $options: 'i' }
    })
    .populate('user', 'username profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit);
    
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ message: 'Server error while searching posts' });
  }
};

// Combined search for both users and posts
export const combinedSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 5; // Limit per category
    
    if (!query) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }
    
    // Run user and post searches in parallel
    const [users, posts] = await Promise.all([
      User.find({
        username: { $regex: query, $options: 'i' }
      })
      .select('username profilePicture')
      .limit(limit),
      
      Post.find({
        content: { $regex: query, $options: 'i' }
      })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit)
    ]);
    
    res.status(200).json({
      users,
      posts
    });
  } catch (error) {
    console.error('Error performing combined search:', error);
    res.status(500).json({ message: 'Server error while searching' });
  }
}; 