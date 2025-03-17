import { Request, Response } from 'express';
import Comment from '../models/Comment';
import Post from '../models/Post';

// Create a new comment
export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate content
    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create the comment
    const comment = new Comment({
      content,
      user: user._id,
      post: post._id
    });

    await comment.save();

    // Increment comments count on the post
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    // Return the created comment with user info
    const commentResponse = {
      id: comment._id,
      content: comment.content,
      post: comment.post,
      user: {
        id: user._id,
        username: user.username,
        profilePicture: user.profilePicture
      },
      createdAt: new Date(),
      commentsCount: post.commentsCount
    };

    res.status(201).json(commentResponse);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Server error while creating comment' });
  }
};

// Get comments for a post
export const getCommentsByPost = async (req: Request, res: Response) => {
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
    
    // Find comments for the post
    const comments = await Comment.find({ post: postId })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalComments = await Comment.countDocuments({ post: postId });
    
    // Format comments for response
    const formattedComments = comments.map(comment => {
      const user = comment.user as any;
      return {
        id: comment._id,
        content: comment.content,
        user: {
          id: user._id,
          username: user.username,
          profilePicture: user.profilePicture
        },
        createdAt: comment['createdAt']
      };
    });
    
    res.status(200).json({
      comments: formattedComments,
      totalComments,
      currentPage: page,
      totalPages: Math.ceil(totalComments / limit),
      hasMore: skip + comments.length < totalComments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Server error while fetching comments' });
  }
};

// Get comment by ID
export const getCommentById = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId).populate('user', 'username profilePicture');
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    const user = comment.user as any;
    
    res.status(200).json({
      id: comment._id,
      content: comment.content,
      user: {
        id: user._id,
        username: user.username,
        profilePicture: user.profilePicture
      },
      createdAt: comment['createdAt']
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ message: 'Server error while fetching comment' });
  }
};

// Update comment
export const updateComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Validate content
    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }
    
    // Find the comment
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if user is the owner of the comment
    if (comment.user && user._id && comment.user.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }
    
    // Update the comment
    comment.content = content;
    await comment.save();
    
    // Populate user information
    await comment.populate('user', 'username profilePicture');
    
    const commentUser = comment.user as any;
    
    res.status(200).json({
      id: comment._id,
      content: comment.content,
      user: {
        id: commentUser._id,
        username: commentUser.username,
        profilePicture: commentUser.profilePicture
      },
      createdAt: comment['createdAt'],
      updatedAt: comment['updatedAt']
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Server error while updating comment' });
  }
};

// Delete comment
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Find the comment
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if user is the owner of the comment
    if (comment.user && user._id && comment.user.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    
    // Find the post to update comments count
    const post = await Post.findById(comment.post);
    
    // Delete the comment
    await comment.deleteOne();
    
    // Decrement comments count on the post if it exists
    if (post) {
      post.commentsCount = Math.max((post.commentsCount || 0) - 1, 0);
      await post.save();
    }
    
    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Server error while deleting comment' });
  }
}; 