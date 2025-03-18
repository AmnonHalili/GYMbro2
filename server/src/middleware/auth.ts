import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { Types } from 'mongoose';

// Secret key for JWT tokens
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-token-secret-for-testing';
const JWT_SECRET = process.env.JWT_SECRET || ACCESS_TOKEN_SECRET;

// הגדרת הממשק של הטוקן המפוענח
interface DecodedToken {
  id?: string;
  userId?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

// שימוש באינטרפייס של המשתמש מהמודל
declare global {
  namespace Express {
    // הרחבת הממשק הקיים של Request
    interface Request {
      userId?: string;
      // הערה: אנחנו לא מגדירים user כאן כי הוא מוגדר על ידי Passport
    }
  }
}

// Token authentication middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log(`[auth] No token provided in request to ${req.originalUrl}`);
      res.status(401).json({ message: 'No authentication token provided' });
      return;
    }

    // הוספת לוגים מפורטים לדיבוג
    console.log(`[auth] Authenticating request to ${req.method} ${req.originalUrl} with token (first 10 chars): ${token.substring(0, 10)}...`);
    console.log(`[auth] Token length: ${token.length}, token type: ${typeof token}`);
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
      
      console.log(`[auth] Token decoded structure:`, {
        hasId: !!decoded?.id,
        hasUserId: !!decoded?.userId,
        hasEmail: !!decoded?.email,
        hasExp: !!decoded?.exp,
        hasIat: !!decoded?.iat
      });
      
      // תמיכה בשני סוגי הטוקנים - אחד עם שדה 'id' ואחד עם שדה 'userId'
      const userId = decoded.id || decoded.userId;
      
      if (!userId) {
        console.error('[auth] Invalid token structure - missing user ID');
        res.status(401).json({ message: 'Invalid token structure' });
        return;
      }
      
      // בדיקת תוקף פגות תוקף
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTime) {
        console.error('[auth] Token expired');
        res.status(401).json({ 
          message: 'Token expired', 
          expiredAt: new Date(decoded.exp * 1000).toISOString(),
          currentTime: new Date(currentTime * 1000).toISOString()
        });
        return;
      }
      
      console.log(`[auth] Token verified successfully for user ${userId}`);
      
      // בדיקה שהמשתמש קיים במערכת
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        console.error(`[auth] User ${userId} not found in database`);
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      // הוספת לוג של נתוני המשתמש לבדיקה
      console.log(`[auth] User found in database:`, {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        hasProfilePicture: !!user.profilePicture
      });
      
      // Add user to request using type assertion
      (req as any).user = user;
      req.userId = userId;
      
      console.log(`[auth] Authentication successful for user ${user.username || user.email}`);
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        console.error('[auth] Token expired:', error.message);
        res.status(401).json({ 
          message: 'Token expired',
          expiredAt: error.expiredAt
        });
      } else if (error.name === 'JsonWebTokenError') {
        console.error('[auth] Invalid token:', error.message);
        res.status(403).json({ 
          message: 'Invalid token', 
          reason: error.message 
        });
      } else {
        console.error('[auth] Token verification error:', error);
        res.status(403).json({ message: 'Token verification failed' });
      }
    }
  } catch (error) {
    console.error('[auth] Unexpected error in authentication middleware:', error);
    res.status(500).json({ message: 'Internal server error in authentication' });
  }
};

// Optional authentication middleware
export const optionalAuthenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // אם אין טוקן, ממשיכים ללא אימות
      console.log(`[auth] No token provided for optional auth to ${req.originalUrl}, continuing without authentication`);
      next();
      return;
    }

    console.log(`[auth] Optional authentication for request to ${req.method} ${req.originalUrl}`);
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
      
      // בדיקת המשתמש
      const userId = decoded.id || decoded.userId;
      if (!userId) {
        console.warn('[auth] Invalid token structure in optional auth');
        next();
        return;
      }
      
      const user = await User.findById(userId).select('-password');
      
      if (user) {
        // Add user to request if found
        (req as any).user = user;
        req.userId = userId;
        console.log(`[auth] Optional authentication succeeded for user ${user.username || user.email}`);
      } else {
        console.warn(`[auth] User ${userId} from token not found in database`);
      }
      
      next();
    } catch (error: any) {
      // אם יש שגיאה באימות, ממשיכים ללא אימות אבל מספקים לוג מפורט
      console.warn(`[auth] Optional authentication failed: ${error.message}, continuing without authentication`);
      next();
    }
  } catch (error) {
    console.error('[auth] Unexpected error in optional authentication middleware:', error);
    next();
  }
};

// Admin-only middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // העתקת המשתמש באמצעות type assertion
    const user = (req as any).user as IUser;
    
    if (!user) {
      console.error('[auth] Admin access attempted without authentication');
      res.status(401).json({ message: 'Authentication required for admin access' });
      return;
    }

    // בדיקה שהמשתמש הוא מנהל 
    if (user.role !== 'admin' && !user.isAdmin) {
      console.error(`[auth] Non-admin user ${req.userId} attempted to access admin resource`);
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    console.log(`[auth] Admin access granted to user ${req.userId}`);
    next();
  } catch (error) {
    console.error('[auth] Error in admin middleware:', error);
    res.status(500).json({ message: 'Internal server error in admin verification' });
  }
};

// Middleware to check if user is the owner of a resource
export const isResourceOwner = (resourceModel: any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resourceId = req.params.postId || req.params.commentId || req.params.id;
      
      if (!resourceId) {
        console.error('[auth] Resource ID not found in request parameters');
        res.status(400).json({ message: 'Resource ID is required' });
        return;
      }
      
      console.log(`[auth] Checking resource ownership for ID ${resourceId}`);
      
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        console.error(`[auth] Resource with ID ${resourceId} not found`);
        res.status(404).json({ message: 'Resource not found' });
        return;
      }

      // Safe access to user ID with type assertion
      const user = (req as any).user as IUser;
      const userId = user?._id ? user._id.toString() : req.userId;
      
      if (!userId) {
        console.error('[auth] User ID not available in request');
        res.status(401).json({ message: 'Authentication required to access this resource' });
        return;
      }
      
      const resourceOwnerId = typeof resource.user === 'object' 
        ? resource.user.toString() 
        : resource.user;
      
      if (resourceOwnerId !== userId) {
        console.error(`[auth] User ${userId} is not the owner of resource ${resourceId}`);
        res.status(403).json({ message: 'Not authorized to access this resource' });
        return;
      }

      console.log(`[auth] Resource ownership verified for user ${userId}`);
      next();
    } catch (error) {
      console.error('[auth] Error checking resource ownership:', error);
      res.status(500).json({ message: 'Server error while checking resource ownership' });
    }
  };
}; 