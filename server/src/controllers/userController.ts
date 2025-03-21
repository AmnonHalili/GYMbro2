import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Post from '../models/Post';
import fs from 'fs';
import path from 'path';
import { Types } from 'mongoose';

// Get current user profile
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      console.error('[userController] User ID not found in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const userId = req.userId;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.error(`[userController] User ${userId} not found in database`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`[userController] Returning user data for ${user.username || user.email} (${user._id})`);
    
    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio || '',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[userController] Get current user error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      id: user._id,
      username: user.username,
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
};

// Get user by username
export const getUserByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      id: user._id,
      username: user.username,
      profilePicture: user.profilePicture,
      bio: user.bio
    });
  } catch (error) {
    console.error('Get user by username error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
};

// Get user posts
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const skip = (page - 1) * limit;
    
    // Find posts by the user
    const posts = await Post.find({ user: user._id })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalPosts = await Post.countDocuments({ user: user._id });
    
    res.status(200).json({
      posts,
      totalPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      hasMore: skip + posts.length < totalPosts,
      user: {
        id: user._id,
        username: user.username,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Server error while fetching user posts' });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    console.log('[userController] updateProfile was called with body:', req.body);
    console.log('[userController] updateProfile request headers:', req.headers);
    console.log('[userController] updateProfile request file:', req.file);
    
    // Extract user ID from request (added by authenticateToken middleware)
    const userId = req.userId;
    
    if (!userId) {
      console.error('[userController] User not authenticated in updateProfile');
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    console.log(`[userController] Updating profile for user ID: ${userId}`);
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update username if provided
    if (req.body.username) {
      // Check if username is already taken (but not by current user)
      const existingUser = await User.findOne({ 
        username: req.body.username, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      
      user.username = req.body.username;
    }
    
    // Handle profile picture if uploaded
    if (req.file) {
      // If previously set, delete old profile picture (optional)
      if (user.profilePicture && user.profilePicture !== '/uploads/default.jpg') {
        try {
          const oldPicturePath = path.join(process.cwd(), user.profilePicture.replace(/^\//, ''));
          console.log(`בודק קיום תמונת פרופיל ישנה: ${oldPicturePath}`);
          
          if (fs.existsSync(oldPicturePath)) {
            fs.unlinkSync(oldPicturePath);
            console.log(`מחקתי תמונת פרופיל ישנה: ${oldPicturePath}`);
          } else {
            console.log(`תמונת הפרופיל הישנה לא נמצאה: ${oldPicturePath}`);
          }
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
          // Continue even if delete fails
        }
      }
      
      // Set new profile picture path
      user.profilePicture = `/uploads/profile/${req.file.filename}`;
      console.log(`נתיב תמונת הפרופיל החדש: ${user.profilePicture}`);
    }
    
    // Handle removing profile picture
    if (req.body.removeProfilePicture === 'true') {
      if (user.profilePicture && user.profilePicture !== '/uploads/default.jpg') {
        try {
          const picturePath = path.join(process.cwd(), user.profilePicture.replace(/^\//, ''));
          
          if (fs.existsSync(picturePath)) {
            fs.unlinkSync(picturePath);
            console.log(`Deleted profile picture: ${picturePath}`);
          }
        } catch (error) {
          console.error('Error deleting profile picture:', error);
        }
      }
      
      // Reset to default
      user.profilePicture = '/uploads/default.jpg';
    }
    
    // Save updated user
    await user.save();
    
    console.log(`[userController] User ${userId} profile updated successfully`);
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('[userController] Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

// Update profile picture
export const updateProfilePicture = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Handle profile picture if uploaded
    if (req.file) {
      // Delete old profile picture if exists
      if (user.profilePicture && user.profilePicture !== '/uploads/default.jpg') {
          const oldPicturePath = path.join(process.cwd(), user.profilePicture.replace(/^\//, ''));
          console.log(`בודק קיום תמונת פרופיל ישנה: ${oldPicturePath}`);
          if (fs.existsSync(oldPicturePath)) {
            fs.unlinkSync(oldPicturePath);
            console.log(`מחקתי תמונת פרופיל ישנה: ${oldPicturePath}`);
          } else {
            console.log(`תמונת הפרופיל הישנה לא נמצאה: ${oldPicturePath}`);
          }
      }
      
      // Set new profile picture path
      user.profilePicture = `/uploads/profile/${req.file.filename}`;
      console.log(`נתיב תמונת הפרופיל החדש: ${user.profilePicture}`);
      
      // Save updated user
      await user.save();
      
      return res.status(200).json({
        message: 'Profile picture updated successfully',
        profilePicture: user.profilePicture,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture
        }
      });
    } else {
      return res.status(400).json({ message: 'No profile picture uploaded' });
    }
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ message: 'Server error while updating profile picture' });
  }
}; 