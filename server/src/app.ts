import express, { Express, Request, Response, Router, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import authRoutes from './routes/authRoutes';
import postRoutes from './routes/postRoutes';
import userRoutes from './routes/userRoutes';
import aiRoutes from './routes/aiRoutes';
import commentRoutes from './routes/commentRoutes';
import likeRoutes from './routes/likeRoutes';
import { errorHandler } from './middleware/errorMiddleware';
import fs from 'fs';
import { fixEmptyImageFiles } from './middleware/upload';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directories
const ensureUploadDirs = () => {
  console.log('=== בדיקת תיקיות העלאה ===');
  console.log('נתיב נוכחי:', process.cwd());
  console.log('מיקום קובץ app.ts:', __dirname);
  
  const uploadDirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/posts'),
    path.join(__dirname, '../uploads/profile'),
    path.join(__dirname, '../logs')
  ];
  
  console.log('נתיבי תיקיות העלאה:');
  uploadDirs.forEach(dir => {
    console.log(`בודק תיקייה: ${dir}`);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`נוצרה תיקייה חדשה: ${dir}`);
      } catch (err) {
        console.error(`שגיאה ביצירת תיקייה ${dir}:`, err);
      }
    } else {
      // Check writability
      try {
        const testFile = path.join(dir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log(`תיקייה ${dir} קיימת וניתנת לכתיבה`);
      } catch (err) {
        console.error(`תיקייה ${dir} קיימת אך אינה ניתנת לכתיבה!`, err);
      }
    }
  });
  
  // List files in posts directory for debugging
  const postsDir = path.join(__dirname, '../uploads/posts');
  if (fs.existsSync(postsDir)) {
    try {
      const files = fs.readdirSync(postsDir);
      console.log(`נמצאו ${files.length} קבצים בתיקייה ${postsDir}`);
      if (files.length > 0) {
        console.log('דוגמאות לקבצים:', files.slice(0, 5));
      }
      
      // בדיקת תיקייה מהנתיב המוחלט בעזרת process.cwd
      const absolutePostsDir = path.join(process.cwd(), 'uploads/posts');
      if (fs.existsSync(absolutePostsDir)) {
        const absFiles = fs.readdirSync(absolutePostsDir);
        console.log(`נמצאו ${absFiles.length} קבצים בנתיב המוחלט ${absolutePostsDir}`);
      } else {
        console.log(`נתיב מוחלט לא נמצא: ${absolutePostsDir}`);
      }
    } catch (err) {
      console.error('שגיאה בקריאת קבצים מתיקיית התמונות:', err);
    }
  }
  
  console.log('=== סיום בדיקת תיקיות העלאה ===');
};

// Call at server startup
ensureUploadDirs();

// Configure CORS with more options for file uploads
const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Replace app.use(cors()) with:
app.use(cors(corsOptions));

// Fix for large file uploads - increase limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// בסביבת טסט אין צורך בלוגים
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// הוספת לוג לבדיקת נתיב התיקייה 
console.log('Static files path:', path.join(__dirname, '../uploads'));

// אין צורך בהגדרה נוספת של '/uploads/posts' כי היא כבר נכללת ב-'/uploads'
// לכן ניתן להסיר את השורה הבאה והלוג שלה
// app.use('/uploads/posts', express.static(path.join(__dirname, '../uploads/posts')));
// console.log('Posts images path:', path.join(__dirname, '../uploads/posts'));

// יצירת מעטפת אסינכרונית כדוגמת שאר הראוטרים בפרויקט
const asyncWrapper = (fn: (req: Request, res: Response) => Promise<any> | any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
};

// יצירת ראוטר עבור תמונות
const imageRouter = express.Router();

// middleware ייעודי להצגת תמונות עם טיפול בשגיאות
imageRouter.get('/:folder/:filename', asyncWrapper((req: Request, res: Response) => {
  const { folder, filename } = req.params;
  
  // וידוא שמדובר בתיקייה מורשית
  if (!['posts', 'profile'].includes(folder)) {
    return res.status(400).send('Invalid folder');
  }
  
  // בניית נתיב הקובץ
  const filePath = path.join(__dirname, '../uploads', folder, filename);
  
  // בדיקה שהקובץ קיים
  if (!fs.existsSync(filePath)) {
    console.log(`Image not found: ${filePath}`);
    return res.status(404).send('Image not found');
  }
  
  // בדיקה שהקובץ אינו ריק
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    console.log(`Empty image file: ${filePath}`);
    return res.status(404).send('Empty image file');
  }
  
  // שליחת הקובץ
  return res.sendFile(filePath);
}));

// יצירת ראוטר נוסף עבור בדיקת תמונות
const imageCheckRouter = express.Router();

// Route: מאפשר בדיקת נגישות תמונות
imageCheckRouter.get('/:folder/:filename', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { folder, filename } = req.params;
  
  // וידוא שמדובר בתיקייה מורשית
  if (!['posts', 'profile'].includes(folder)) {
    res.status(400).json({ 
      exists: false, 
      error: 'Invalid folder', 
      message: 'Folder must be either "posts" or "profile"'
    });
    return;
  }
  
  // בניית נתיב הקובץ
  const imagePath = path.join(__dirname, `../uploads/${folder}`, filename);
  
  if (!fs.existsSync(imagePath)) {
    res.status(404).json({
      exists: false,
      error: 'Not found',
      message: 'Image does not exist'
    });
    return;
  }
  
  try {
    const stats = fs.statSync(imagePath);
    
    if (stats.size === 0) {
      res.status(400).json({
        exists: true,
        error: 'Empty file',
        message: 'Image file exists but is empty (0 bytes)'
      });
      return;
    }
    
    // Get the URL for this image
    const serverBaseUrl = getServerBaseUrl();
    const imageUrl = `${serverBaseUrl}/uploads/${folder}/${filename}`;
    
    res.status(200).json({
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      url: imageUrl,
      path: `/uploads/${folder}/${filename}`
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      exists: false,
      error: 'Error checking file',
      message: error.message
    });
    return;
  }
}));

// רגיסטור הראוטר לאפליקציה
app.use('/image', imageRouter);
app.use('/api/check-image', imageCheckRouter);

// אנדפוינט לתיקון תמונות ריקות
app.post('/api/fix-empty-images', asyncWrapper(async (req: Request, res: Response) => {
  console.log('Starting to fix empty image files');
  const result = await fixEmptyImageFiles();
  return res.status(200).json({
    message: 'Image files check completed',
    ...result
  });
}));

// הוספת אנדפוינט לבדיקת נתיבי תמונות שנשמרו במערכת
app.get('/api/debug/image-path', (req: Request, res: Response) => {
  // בדיקת הנתיבים האבסולוטיים של תיקיות התמונות
  const paths = {
    uploadsAbsPath: path.join(__dirname, '../uploads'),
    postsAbsPath: path.join(__dirname, '../uploads/posts'),
    currentDirectory: __dirname,
    staticMappings: [
      '/uploads -> ' + path.join(__dirname, '../uploads'),
      '/uploads/posts -> ' + path.join(__dirname, '../uploads/posts')
    ],
    directoryExists: {
      uploads: fs.existsSync(path.join(__dirname, '../uploads')),
      posts: fs.existsSync(path.join(__dirname, '../uploads/posts'))
    }
  };
  
  // החזרת המידע כ-JSON
  res.json(paths);
});

// הוספת אנדפוינט לשליפת קבצי התמונות בתיקייה
app.get('/api/debug/list-images', async function(req: Request, res: Response): Promise<void> {
  try {
    const postsPath = path.join(__dirname, '../uploads/posts');
    if (!fs.existsSync(postsPath)) {
      res.status(404).json({ error: 'Posts directory not found', path: postsPath });
      return;
    }
    
    const files = fs.readdirSync(postsPath);
    const imageStats = files.map(file => {
      const filePath = path.join(postsPath, file);
      try {
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          isFile: stats.isFile(),
          created: stats.birthtime,
          fullPath: filePath,
          accessibleAt: `/uploads/posts/${file}`
        };
      } catch (err) {
        return { name: file, error: String(err) };
      }
    });
    
    res.json({
      directory: postsPath,
      fileCount: files.length,
      files: imageStats
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);

// Error handling
app.use(errorHandler);

// Get the server's base URL from environment or build it
const getServerBaseUrl = (): string => {
  const host = process.env.HOST || 'localhost';
  const port = process.env.PORT || '3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${host}:${port}`;
};

export default app; 