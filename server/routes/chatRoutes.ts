import express from 'express';
import { getContacts, getChatHistory, markMessagesAsRead } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// כל הראוטים מוגנים ודורשים אימות
router.use(authenticateToken);

// קבלת רשימת אנשי קשר
router.get('/contacts/:userId', getContacts);

// קבלת היסטוריית צ'אט
router.get('/history/:userId/:targetId', getChatHistory);

// סימון הודעות כנקראו
router.put('/read/:userId/:targetId', markMessagesAsRead);

export default router; 