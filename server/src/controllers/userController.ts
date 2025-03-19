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
    const userFromReq = (req as any).user;
    
    if (!userFromReq || !userFromReq._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const userId = userFromReq._id.toString();
    const { username, bio } = req.body;
    
    // Get fresh user data from database to avoid type issues
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username is already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(409).json({ message: 'Username is already taken' });
      }
      
      user.username = username;
    }
    
    // Update bio if provided
    if (bio !== undefined) {
      user.bio = bio;
    }
    
    await user.save();
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

// Update profile picture
export const updateProfilePicture = async (req: Request, res: Response) => {
  try {
    const userFromReq = (req as any).user;
    
    if (!userFromReq || !userFromReq._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const userId = userFromReq._id.toString();
    console.log(`מעדכן תמונת פרופיל למשתמש: ${userId}`);
    
    // Get fresh user data from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Handle profile picture if uploaded
    if (req.file) {
      console.log(`קובץ תמונת פרופיל התקבל: ${req.file.originalname}, שם קובץ: ${req.file.filename}`);
      
      // Delete old profile picture if exists
      if (user.profilePicture && user.profilePicture !== '/uploads/default.jpg') {
        try {
          // שימוש בנתיב יחסי
          const oldPicturePath = path.join(process.cwd(), user.profilePicture.replace(/^\//, ''));
          console.log(`בודק קיום קובץ פרופיל ישן: ${oldPicturePath}`);
          
          if (fs.existsSync(oldPicturePath)) {
            fs.unlinkSync(oldPicturePath);
            console.log(`נמחק קובץ פרופיל ישן: ${oldPicturePath}`);
          } else {
            console.log(`קובץ פרופיל ישן לא נמצא: ${oldPicturePath}`);
          }
        } catch (error) {
          console.error(`שגיאה במחיקת תמונת פרופיל ישנה:`, error);
          // ממשיכים גם אם יש שגיאה במחיקת הקובץ הישן
        }
      }
      
      // Set new profile picture path
      user.profilePicture = `/uploads/profile/${req.file.filename}`;
      console.log(`נתיב תמונת פרופיל חדש: ${user.profilePicture}`);
      
      await user.save();
      
      res.status(200).json({
        message: 'Profile picture updated successfully',
        profilePicture: user.profilePicture
      });
    } else {
      console.log(`לא נשלחה תמונת פרופיל חדשה`);
      return res.status(400).json({ message: 'No profile picture uploaded' });
    }
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ message: 'Server error while updating profile picture' });
  }
}; 