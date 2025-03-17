import express from 'express';
import * as likeController from '../controllers/likeController';
import { authenticateToken } from '../middleware/auth';
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

/**
 * @swagger
 * /api/likes/post/{postId}:
 *   post:
 *     summary: Toggle like on a post
 *     description: Like or unlike a post. If the post is already liked by the user, it will be unliked.
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to like/unlike
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked:
 *                   type: boolean
 *                   description: Whether the post is now liked or unliked
 *                   example: true
 *                 likesCount:
 *                   type: integer
 *                   description: Updated number of likes for the post
 *                   example: 42
 *       401:
 *         description: Unauthorized, authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Post not found
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
router.post('/post/:postId', authenticateToken, asyncWrapper(likeController.toggleLike));

/**
 * @swagger
 * /api/likes/post/{postId}/check:
 *   get:
 *     summary: Check if user has liked a post
 *     description: Check if the current authenticated user has liked a specific post.
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to check
 *     responses:
 *       200:
 *         description: Like status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked:
 *                   type: boolean
 *                   description: Whether the user has liked the post
 *                   example: true
 *       401:
 *         description: Unauthorized, authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Post not found
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
router.get('/post/:postId/check', authenticateToken, asyncWrapper(likeController.checkLikeStatus));

/**
 * @swagger
 * /api/likes/post/{postId}/users:
 *   get:
 *     summary: Get users who liked a post
 *     description: Retrieve a list of users who have liked a specific post.
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: 6082fd3d12e87a001cb57f32
 *                   username:
 *                     type: string
 *                     example: johndoe
 *                   profilePicture:
 *                     type: string
 *                     example: /uploads/profiles/john-123456.jpg
 *       404:
 *         description: Post not found
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
router.get('/post/:postId/users', asyncWrapper(likeController.getLikesByPost));

export default router; 