import jwt, { SignOptions, Secret } from 'jsonwebtoken';

type TokenPayload = {
  userId: string;
};

// Determine the secret key based on token type
const getSecret = (isRefresh: boolean): Buffer => {
  const secret = isRefresh 
    ? process.env.JWT_REFRESH_SECRET
    : process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error(`${isRefresh ? 'JWT_REFRESH_SECRET' : 'JWT_SECRET'} is not defined`);
  }
  
  return Buffer.from(secret, 'utf8');
};

/**
 * Generate a JWT token
 * @param userId User ID to include in the token
 * @param expiresIn Token expiration time
 * @param isRefresh Whether this is a refresh token
 * @returns Generated JWT token
 */
const generateToken = (userId: string, expiresIn: string, isRefresh = false): string => {
  const secret = getSecret(isRefresh);
  
  const payload: TokenPayload = { userId };
  const options: SignOptions = { expiresIn };
  
  return jwt.sign(payload, secret, options);
};

/**
 * Generate both access and refresh tokens for a user
 * @param userId User ID to include in the tokens
 * @returns Object containing both tokens
 */
export const generateTokens = (userId: string): { accessToken: string; refreshToken: string } => {
  const payload: TokenPayload = { userId };
  
  const accessToken = jwt.sign(
    payload, 
    getSecret(false), 
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    payload, 
    getSecret(true), 
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

/**
 * Verify a JWT token
 * @param token Token to verify
 * @param isRefresh Whether this is a refresh token
 * @returns Decoded token payload or null if invalid
 */
export const verifyToken = (token: string, isRefresh = false): TokenPayload | null => {
  try {
    return jwt.verify(token, getSecret(isRefresh)) as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Generate access token
export const generateAccessToken = (payload: object, expiresIn: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.sign(payload, secret, { expiresIn: expiresIn });
}; 