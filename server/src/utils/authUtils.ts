import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// סביבת הפיתוח
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_refresh_token_secret';

// יצירת אסימון גישה (access token)
export const createToken = (userId: string | Types.ObjectId): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: '1h', // פג תוקף לאחר שעה
  });
};

// יצירת אסימון רענון (refresh token)
export const createRefreshToken = (userId: string | Types.ObjectId): string => {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
    expiresIn: '7d', // פג תוקף לאחר שבוע
  });
};

// אימות אסימון הרענון
export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

// אימות אסימון הגישה
export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}; 