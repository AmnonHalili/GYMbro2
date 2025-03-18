import { Request, Response } from 'express';
import Like from '../models/Like';
import Post from '../models/Post';
import User from '../models/User';

// Toggle like on a post
export const toggleLike = async (req: Request, res: Response): Promise<void> => {
  try {
    // שימוש ב-type assertion לגישה לאובייקט המשתמש
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    const { postId } = req.params;
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    // Check if user already liked the post
    const existingLike = await Like.findOne({ post: postId, user: user._id });
    
    let liked = false;
    
    if (existingLike) {
      // User already liked the post, so unlike it
      await Like.findByIdAndDelete(existingLike._id);
      
      // Decrement likes count on the post
      post.likesCount = Math.max((post.likesCount || 0) - 1, 0);
      await post.save();
    } else {
      // User hasn't liked the post yet, so like it
      const newLike = new Like({
        post: postId,
        user: user._id,
      });
      
      await newLike.save();
      
      // Increment likes count on the post
      post.likesCount = (post.likesCount || 0) + 1;
      await post.save();
      
      liked = true;
    }
    
    res.status(200).json({
      message: liked ? 'Post liked successfully' : 'Post unliked successfully',
      liked,
      likesCount: post.likesCount
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Server error while toggling like' });
  }
};

// Check if user has liked a post
export const checkLikeStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // שימוש ב-type assertion לגישה לאובייקט המשתמש
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    const { postId } = req.params;
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    // Check if user has liked the post
    const existingLike = await Like.findOne({ post: postId, user: user._id });
    
    res.status(200).json({
      liked: !!existingLike,
      likesCount: post.likesCount || 0
    });
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).json({ message: 'Server error while checking like status' });
  }
};

// Get users who liked a post
export const getLikesByPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const skip = (page - 1) * limit;
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    // Find likes for the post with pagination
    const likes = await Like.find({ post: postId })
      .populate('user', 'username profilePicture')
      .skip(skip)
      .limit(limit);
    
    // Extract user information from likes
    const users = likes.map(like => {
      const user = like.user as any;
      return {
        id: user._id,
        username: user.username,
        profilePicture: user.profilePicture
      };
    });
    
    // Count total likes for pagination
    const totalLikes = await Like.countDocuments({ post: postId });
    
    res.status(200).json({
      users,
      pagination: {
        total: totalLikes,
        page,
        limit,
        pages: Math.ceil(totalLikes / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching likes:', error);
    res.status(500).json({ message: 'Server error while fetching likes' });
  }
}; 