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

// Get a single post by ID
export const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findById(postId).populate('user', 'username profilePicture');
    
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    res.status(200).json({ post });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Server error while fetching post' });
  }
};

// Create a new post
export const createPost = async (req: Request, res: Response): Promise<void> => {
  try {
    // שימוש ב-type assertion לגישה לאובייקט המשתמש
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    const { content } = req.body;
    
    if (!content) {
      res.status(400).json({ message: 'Content is required' });
      return;
    }
    
    const newPost = new Post({
      content,
      user: user._id,
      image: req.file ? `/uploads/posts/${req.file.filename}` : null
    });
    
    await newPost.save();
    
    // Populate user data for response
    await newPost.populate('user', 'username profilePicture');
    
    res.status(201).json({
      message: 'Post created successfully',
      post: newPost
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Server error while creating post' });
  }
};

// Update an existing post
export const updatePost = async (req: Request, res: Response): Promise<void> => {
  try {
    // שימוש ב-type assertion לגישה לאובייקט המשתמש
    const user = (req as any).user;
    const { postId } = req.params;
    const { content } = req.body;
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    // Check if the user is the post owner
    if (post.user.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'User not authorized to update this post' });
      return;
    }
    
    // Update post content
    if (content) {
      post.content = content;
    }
    
    // Handle image update
    if (req.file) {
      // Delete the old image if exists
      if (post.image) {
        const oldImagePath = path.join(__dirname, '../../', post.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      // Set new image path
      post.image = `/uploads/posts/${req.file.filename}`;
    }
    
    await post.save();
    await post.populate('user', 'username profilePicture');
    
    res.status(200).json({
      message: 'Post updated successfully',
      post
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Server error while updating post' });
  }
};

// Delete a post
export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    // שימוש ב-type assertion לגישה לאובייקט המשתמש
    const user = (req as any).user;
    const { postId } = req.params;
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    // Check if the user is the post owner
    if (post.user.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'User not authorized to delete this post' });
      return;
    }
    
    // Delete image if exists
    if (post.image) {
      const imagePath = path.join(__dirname, '../../', post.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Delete the post
    await Post.findByIdAndDelete(postId);
    
    res.status(200).json({ 
      message: 'Post deleted successfully',
      postId
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Server error while deleting post' });
  }
};
