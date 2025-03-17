import { Request, Response } from 'express';
import Like from '../models/Like';
import Post from '../models/Post';

// Toggle like on a post
export const toggleLike = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user already liked the post
    const existingLike = await Like.findOne({ post: postId, user: user._id });
    
    if (existingLike) {
      // User already liked the post, so remove the like
      await existingLike.deleteOne();
      
      // Update likes count on the post
      post.likesCount = Math.max((post.likesCount || 0) - 1, 0);
      await post.save();
      
      return res.status(200).json({
        liked: false,
        likesCount: post.likesCount
      });
    } else {
      // User hasn't liked the post yet, so add a like
      const newLike = new Like({
        post: postId,
        user: user._id,
      });
      
      await newLike.save();
      
      // Update likes count on the post
      post.likesCount = (post.likesCount || 0) + 1;
      await post.save();
      
      return res.status(200).json({
        liked: true,
        likesCount: post.likesCount
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Server error while toggling like' });
  }
};

// Check if user has liked a post
export const checkLikeStatus = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user has liked the post
    const like = await Like.findOne({ post: postId, user: user._id });
    
    res.status(200).json({
      liked: !!like
    });
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).json({ message: 'Server error while checking like status' });
  }
};

// Get users who liked a post
export const getLikesByPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const skip = (page - 1) * limit;
    
    // Find likes for the post with populated user info
    const likes = await Like.find({ post: postId })
      .populate('user', 'username profilePicture')
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Like.countDocuments({ post: postId });
    
    // Format the response with type assertion
    const users = likes.map(like => {
      const user = like.user as any;
      return {
        id: user._id,
        username: user.username,
        profilePicture: user.profilePicture
      };
    });
    
    res.status(200).json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching likes:', error);
    res.status(500).json({ message: 'Server error while fetching likes' });
  }
}; 