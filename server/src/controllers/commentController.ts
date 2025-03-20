import { Request, Response } from 'express';
import Comment from '../models/Comment';
import Post from '../models/Post';
import User from '../models/User';

// Create a new comment
export const createComment = async (req: Request, res: Response): Promise<void> => {
  try {
    // שימוש ב-type assertion לגישה לאובייקט המשתמש
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ message: 'Access token is required' });
      return;
    }
    
    const { postId } = req.params;
    const { content } = req.body;
    
    // Validate required fields
    if (!content) {
      res.status(400).json({ message: 'Comment content is required' });
      return;
    }
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    // Create new comment
    const comment = new Comment({
      content,
      post: postId,
      user: user._id,
    });
    
    await comment.save();
    
    // Update comments count on the post
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();
    
    // Return comment with user details
    res.status(201).json({ comment: {
      id: comment._id,
      post: postId,
      content: comment.content,
      createdAt: comment.get('createdAt'),
      user: {
        id: user._id,
        username: user.username,
        profilePicture: user.profilePicture || ''
      }
    }});
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Server error while creating comment' });
  }
};

// Get comments for a post
export const getCommentsByPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const skip = (page - 1) * limit;
    
    // Find the post first to check if it exists
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    // Find comments for the post with pagination
    const comments = await Comment.find({ post: postId })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: 1 }) // Oldest first
      .skip(skip)
      .limit(limit);
    
    // Count total comments for pagination
    const totalComments = await Comment.countDocuments({ post: postId });
    
    res.status(200).json({
      comments,
      pagination: {
        total: totalComments,
        page,
        limit,
        pages: Math.ceil(totalComments / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Server error while fetching comments' });
  }
};

// Get comment by ID
export const getCommentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId).populate('user', 'username profilePicture');
    
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }
    
    res.status(200).json(comment);
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ message: 'Server error while fetching comment' });
  }
};

// Update comment
export const updateComment = async (req: Request, res: Response): Promise<void> => {
  try {
    // שימוש ב-type assertion לגישה לאובייקט המשתמש
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    const { commentId } = req.params;
    const { content } = req.body;
    
    // Validate required fields
    if (!content) {
      res.status(400).json({ message: 'Comment content is required' });
      return;
    }
    
    // Find comment by ID
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }
    
    // Check if user is the comment owner
    if (comment.user && user._id && comment.user.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to update this comment' });
      return;
    }
    
    // Update the comment
    comment.content = content;
    await comment.save();
    
    // Get post to return the comments count
    const post = await Post.findById(comment.post);
    const commentsCount = post ? post.commentsCount : 0;
    
    res.status(200).json({
      message: 'Comment updated successfully',
      comment,
      postId: comment.post,
      commentsCount
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Server error while updating comment' });
  }
};

// Delete comment
export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  try {
    // שימוש ב-type assertion לגישה לאובייקט המשתמש
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    const { commentId } = req.params;
    
    // Find comment by ID
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }
    
    // Check if user is the comment owner
    if (comment.user && user._id && comment.user.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to delete this comment' });
      return;
    }
    
    // Get post ID before deletion for response
    const postId = comment.post;
    
    // Delete the comment
    await Comment.findByIdAndDelete(commentId);
    
    // Update comments count on the post
    const post = await Post.findById(postId);
    if (post) {
      post.commentsCount = Math.max((post.commentsCount || 0) - 1, 0);
      await post.save();
    }
    
    res.status(200).json({
      message: 'Comment deleted successfully',
      postId,
      commentsCount: post ? post.commentsCount : 0
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Server error while deleting comment' });
  }
}; 