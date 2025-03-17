import express from 'express';
import { body } from 'express-validator';
import * as userController from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { uploadProfilePicture } from '../middleware/upload';
import { validate } from '../middleware/validation';

const router = express.Router();

// Profile update validation
const profileUpdateValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
];

// Get current user profile
router.get('/me', authenticateToken, userController.getCurrentUser);

// Get user by ID
router.get('/:userId', userController.getUserById);

// Get user by username
router.get('/username/:username', userController.getUserByUsername);

// Update user profile
router.put(
  '/me',
  authenticateToken,
  uploadProfilePicture,
  validate(profileUpdateValidation),
  userController.updateProfile
);

export default router; 