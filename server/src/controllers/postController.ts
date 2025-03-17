import { Request, Response } from 'express';
import Post from '../models/Post';
import { IUser } from '../models/User';
import fs from 'fs';
import path from 'path';

// Get all posts (feed) with pagination
export const getAllPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = req.query.userId as string;
    
    const skip = (page - 1) * limit;
    
    // Build filter based on query parameters
    const filter: any = {};
    if (userId) {
      filter.user = userId;
    }
    
    // Find posts with optional filtering
    const posts = await Post.find(filter)
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalPosts = await Post.countDocuments(filter);
    
    res.status(200).json({
      posts,
      totalPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      hasMore: skip + posts.length < totalPosts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Server error while fetching posts' });
  }
};

// Get posts by user ID
export const getPostsByUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const skip = (page - 1) * limit;
    
    // Find posts by the specified user
    const posts = await Post.find({ user: userId })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalPosts = await Post.countDocuments({ user: userId });
    
    res.status(200).json({
      posts,
      totalPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      hasMore: skip + posts.length < totalPosts
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Server error while fetching user posts' });
  }
};

// Get trending posts (most liked)
export const getTrendingPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Find posts sorted by likes count
    const posts = await Post.find()
      .populate('user', 'username profilePicture')
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit);
    
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.status(500).json({ message: 'Server error while fetching trending posts' });
  }
};

// Create a new post
export const createPost = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: 'Post created successfully' });
};

// Get post by ID
export const getPostById = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ post: {} });
};

// Update post
export const updatePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const user = req.user as IUser;

    // Validate content
    if (!content) {
      res.status(400).json({ message: 'Content is required' });
      return;
    }

    // Find the post
    const post = await Post.findById(postId);
    
    // Check if post exists
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Check if user is the owner of the post
    if (post.user && user && post.user.toString() !== user._id?.toString()) {
      res.status(403).json({ message: 'Not authorized to update this post' });
      return;
    }

    // Update the post
    post.content = content;
    await post.save();

    // Populate user information
    await post.populate('user', 'username profilePicture');

    res.status(200).json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Server error while updating post' });
  }
};

// Delete post
export const deletePost = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: 'Post deleted successfully' });
};
