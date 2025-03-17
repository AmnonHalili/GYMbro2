import jwt, { SignOptions, Secret } from 'jsonwebtoken';

// Secret keys for JWT tokens
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-token-secret-for-testing';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-token-secret-for-testing';

/**
 * Generate a JWT token
 * @param userId - The user ID to include in the token
 * @param expiresIn - Token expiration time (e.g., '15m', '7d')
 * @param isRefreshToken - Whether this is a refresh token
 * @returns The generated JWT token
 */
export const generateToken = (
  userId: string,
  expiresIn: string,
  isRefreshToken: boolean = false
): string => {
  const secret = isRefreshToken ? REFRESH_TOKEN_SECRET : ACCESS_TOKEN_SECRET;
  const payload = { userId };
  
  return jwt.sign(payload, secret as Secret, { expiresIn });
};

/**
 * Verify a JWT token
 * @param token - The token to verify
 * @param isRefreshToken - Whether this is a refresh token
 * @returns The decoded token payload or null if invalid
 */
export const verifyToken = (
  token: string,
  isRefreshToken: boolean = false
): { userId: string } | null => {
  try {
    const secret = isRefreshToken ? REFRESH_TOKEN_SECRET : ACCESS_TOKEN_SECRET;
    const decoded = jwt.verify(token, secret as Secret) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate both access and refresh tokens for a user
 * @param userId - The user ID to include in the tokens
 * @returns Object containing both tokens
 */
export const generateTokens = (userId: string): { accessToken: string; refreshToken: string } => {
  const accessToken = generateToken(userId, '15m');
  const refreshToken = generateToken(userId, '7d', true);
  
  return { accessToken, refreshToken };
}; 