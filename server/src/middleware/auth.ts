import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { Types } from 'mongoose';

// Secret key for JWT tokens (same as in tokenUtils.ts)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-token-secret-for-testing';

// Extend Express User interface to include properties from our IUser model
declare global {
  namespace Express {
    // Extend the existing User interface rather than redefining it
    interface User {
      _id?: Types.ObjectId;
      username?: string;
      email?: string;
      password?: string;
      profilePicture?: string;
      bio?: string;
      googleId?: string;
      comparePassword?: (candidatePassword: string) => Promise<boolean>;
    }
  }
}

// Middleware to authenticate JWT token
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Using type assertion to convert MongoDB document to Express.User
    req.user = {
      _id: user._id as Types.ObjectId,
      username: user.username,
      email: user.email,
      password: user.password,
      profilePicture: user.profilePicture,
      bio: user.bio,
      googleId: user.googleId
    };
    
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }
};

// Middleware to check if user is the owner of a resource
export const isResourceOwner = (resourceModel: any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resourceId = req.params.postId || req.params.commentId;
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        res.status(404).json({ message: 'Resource not found' });
        return;
      }

      // Safe access to user ID with type checking
      const userId = req.user?._id ? req.user._id.toString() : null;
      
      if (!userId || resource.user.toString() !== userId) {
        res.status(403).json({ message: 'Not authorized to access this resource' });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
      return;
    }
  };
}; 