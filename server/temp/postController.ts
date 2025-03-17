import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Like from '../models/Like';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Create a new post
export const createPost = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const user = req.user;

    const post = new Post({
      user: user._id,
      content,
      image: req.file ? `/uploads/posts/${req.file.filename}` : undefined
    });

    await post.save();

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        id: post._id,
        content: post.content,
        image: post.image,
        user: {
          id: user._id,
          username: user.username,
          profilePicture: user.profilePicture
        },
        likesCount: 0,
        commentsCount: 0,
        createdAt: post.createdAt
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error while creating post' });
  }
};

// Get all posts with pagination
export const getPosts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = req.query.userId as string;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (userId) {
      query.user = userId;
    }

    // Get posts with pagination
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profilePicture');

    // Get total count for pagination
    const total = await Post.countDocuments(query);

    // Format posts for response
    const formattedPosts = posts.map(post => {
      const postUser = post.user as any;
      return {
        id: post._id,
        content: post.content,
        image: post.image,
        user: {
          id: postUser._id,
          username: postUser.username,
          profilePicture: postUser.profilePicture
        },
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt as Date
      };
    });

    res.json({
      posts: formattedPosts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error while fetching posts' });
  }
};

// Get a single post by ID
export const getPostById = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).populate('user', 'username profilePicture');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const postUser = post.user as any;
    
    res.json({
      id: post._id,
      content: post.content,
      image: post.image,
      user: {
        id: postUser._id,
        username: postUser.username,
        profilePicture: postUser.profilePicture
      },
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      createdAt: post.createdAt as Date
    });
  } catch (error) {
    console.error('Get post by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching post' });
  }
};

// Update a post
export const updatePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author of the post
    if (post.user.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    // Update post content
    post.content = content;

    // Update image if provided
    if (req.file) {
      // Delete old image if exists
      if (post.image) {
        const oldImagePath = path.join(__dirname, '../../public', post.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      post.image = `/uploads/posts/${req.file.filename}`;
    }

    await post.save();

    res.json({
      message: 'Post updated successfully',
      post: {
        id: post._id,
        content: post.content,
        image: post.image,
        user: {
          id: user._id,
          username: user.username,
          profilePicture: user.profilePicture
        },
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt as Date,
        updatedAt: post.updatedAt as Date
      }
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Server error while updating post' });
  }
};

// Delete a post
export const deletePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author of the post
    if (post.user.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Delete image if exists
    if (post.image) {
      const imagePath = path.join(__dirname, '../../public', post.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete all comments associated with the post
    await Comment.deleteMany({ post: postId });

    // Delete all likes associated with the post
    await Like.deleteMany({ post: postId });

    // Delete the post
    await post.deleteOne();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error while deleting post' });
  }
}; 