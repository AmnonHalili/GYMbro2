import express from "express";
import { body } from 'express-validator';
import * as userController from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { uploadProfilePicture, uploadProfileImage } from '../middleware/upload';
import { validate } from '../middleware/validation';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// Wrapper for controller functions to return void
const asyncWrapper = (fn: (req: Request, res: Response) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
};

// Profile update validation
const profileUpdateValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
];

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the profile information of the currently authenticated user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6082fd3d12e87a001cb57f32
 *                     username:
 *                       type: string
 *                       example: johndoe
 *                     email:
 *                       type: string
 *                       example: john@example.com
 *                     profilePicture:
 *                       type: string
 *                       example: /uploads/profiles/john-123456.jpg
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2023-03-15T08:00:00Z
 *       401:
 *         description: Unauthorized, authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticateToken, asyncWrapper(userController.getCurrentUser));

/**
 * @swagger
 * /api/users/{username}/posts:
 *   get:
 *     summary: Get user posts
 *     description: Retrieve all posts created by a user identified by username.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username of the user whose posts to retrieve
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts per page
 *     responses:
 *       200:
 *         description: User posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 totalPosts:
 *                   type: integer
 *                   example: 25
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6082fd3d12e87a001cb57f32
 *                     username:
 *                       type: string
 *                       example: johndoe
 *                     profilePicture:
 *                       type: string
 *                       example: /uploads/profiles/john-123456.jpg
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:username/posts', asyncWrapper(userController.getUserPosts));

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a user's profile by their MongoDB ID.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the user
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6082fd3d12e87a001cb57f32
 *                     username:
 *                       type: string
 *                       example: johndoe
 *                     profilePicture:
 *                       type: string
 *                       example: /uploads/profiles/john-123456.jpg
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2023-03-15T08:00:00Z
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:userId', asyncWrapper(userController.getUserById));

/**
 * @swagger
 * /api/users/username/{username}:
 *   get:
 *     summary: Get user by username
 *     description: Retrieve a user's profile by their username.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username of the user
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6082fd3d12e87a001cb57f32
 *                     username:
 *                       type: string
 *                       example: johndoe
 *                     profilePicture:
 *                       type: string
 *                       example: /uploads/profiles/john-123456.jpg
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2023-03-15T08:00:00Z
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/username/:username', asyncWrapper(userController.getUserByUsername));

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update the current user's profile information.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: New username (optional)
 *                 example: john_updated
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6082fd3d12e87a001cb57f32
 *                     username:
 *                       type: string
 *                       example: john_updated
 *                     email:
 *                       type: string
 *                       example: john@example.com
 *                     profilePicture:
 *                       type: string
 *                       example: /uploads/profiles/john-123456.jpg
 *       400:
 *         description: Validation error or username already taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized, authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/profile', authenticateToken, uploadProfileImage, profileUpdateValidation, asyncWrapper(userController.updateProfile));

/**
 * @swagger
 * /api/users/profile-picture:
 *   put:
 *     summary: Update profile picture
 *     description: Upload and update the current user's profile picture.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture image file
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6082fd3d12e87a001cb57f32
 *                     username:
 *                       type: string
 *                       example: johndoe
 *                     profilePicture:
 *                       type: string
 *                       example: /uploads/profiles/john-updated-123456.jpg
 *       400:
 *         description: Invalid or missing image file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized, authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/profile-picture', authenticateToken, uploadProfileImage, asyncWrapper(userController.updateProfilePicture));

export default router;
