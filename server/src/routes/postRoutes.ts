import express, { Request, Response, NextFunction } from 'express';
import * as postController from '../controllers/postController';
import { uploadPostImage, RequestWithFile } from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// מעטפת אסינכרונית למניעת try/catch חוזרים
const asyncWrapper = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// פשוט להעביר כל בקשה למידלוור העלאה, לא צריך מעטפת
router.get('/', asyncWrapper(postController.getAllPosts));
router.get('/user/:userId', asyncWrapper(postController.getPostsByUser));
router.get('/trending', asyncWrapper(postController.getTrendingPosts));
router.get('/:postId', asyncWrapper(postController.getPostById));

// נתיבים עם העלאת קבצים
router.post('/', authenticateToken, uploadPostImage, asyncWrapper(postController.createPost));
router.put('/:postId', authenticateToken, uploadPostImage, asyncWrapper(postController.updatePost));
router.delete('/:postId', authenticateToken, asyncWrapper(postController.deletePost));

// נתיבי תחזוקה
router.post('/maintenance/fix-images', authenticateToken, asyncWrapper(postController.fixPostImages));

export default router; 