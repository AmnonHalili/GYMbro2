import express from 'express';
import { getChatHistory, getContacts, markMessagesAsRead } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/history/:userId/:otherUserId', authenticateToken, getChatHistory);
router.get('/contacts/:userId', authenticateToken, getContacts);
router.put('/read/:userId/:otherUserId', authenticateToken, markMessagesAsRead);

export default router; 