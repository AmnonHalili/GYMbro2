import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';
import mongoose from 'mongoose';

// Token types
export interface TokenPayload {
  userId: string;
}

// Helper function to generate tokens
export const generateTokens = (user: IUser) => {
  // Make sure _id is always cast to string
  const userId = user._id ? user._id.toString() : '';
  
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);
  return { accessToken, refreshToken };
};

// Generate access token
export const generateAccessToken = (userId: string): string => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  const payload: TokenPayload = { userId };
  return jwt.sign(payload, process.env.JWT_SECRET || 'jwt_secret', {
    expiresIn: '1h',
  });
};

// Generate refresh token
export const generateRefreshToken = (userId: string): string => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  const payload: TokenPayload = { userId };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'jwt_refresh_secret', {
    expiresIn: '7d',
  });
};

// Verify access token
export const verifyAccessToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt_secret') as TokenPayload;
    return decoded.userId;
  } catch (error) {
    return null;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'jwt_refresh_secret') as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}; 