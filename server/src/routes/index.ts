import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import postRoutes from './postRoutes';
import commentRoutes from './commentRoutes';
import likeRoutes from './likeRoutes';
import aiRoutes from './aiRoutes';
import searchRoutes from './searchRoutes';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/likes', likeRoutes);
router.use('/ai', aiRoutes);
router.use('/search', searchRoutes);

// יצירת תיקיית uploads אם לא קיימת
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// העברת קבצים סטטיים
router.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// נתיב התמונות הועבר ל-index.ts כדי לפתור שגיאת TypeScript
// הקוד המקורי:
// router.get('/image/:type/:filename', (req: express.Request, res: express.Response) => { ... });

// בדיקת סטטוס
router.get('/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default router; 