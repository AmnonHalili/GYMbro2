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
import searchRoutes from './routes/searchRoutes';
import { errorHandler } from './middleware/errorMiddleware';
import fs from 'fs';
import { fixEmptyImageFiles } from './middleware/upload';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directories
const ensureUploadDirs = () => {
  const uploadDirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/posts'),
    path.join(__dirname, '../uploads/profile'),
    path.join(__dirname, '../logs')
  ];
  
  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } else {
      // Check writability
      try {
        const testFile = path.join(dir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log(`Directory ${dir} exists and is writable`);
      } catch (err) {
        console.error(`Directory ${dir} exists but is not writable!`, err);
      }
    }
  });
  
  // List files in posts directory for debugging
  const postsDir = path.join(__dirname, '../uploads/posts');
  if (fs.existsSync(postsDir)) {
    try {
      const files = fs.readdirSync(postsDir);
      console.log(`Found ${files.length} files in ${postsDir}`);
      if (files.length > 0) {
        console.log('Sample files:', files.slice(0, 5));
      }
    } catch (err) {
      console.error('Error reading files in posts directory:', err);
    }
  }
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
console.log('נתיב קבצים סטטיים:', path.join(__dirname, '../uploads'));
console.log('נתיב מוחלט:', path.resolve(path.join(__dirname, '../uploads')));

// הוספת מידלוואר CORS ייעודי לתמונות
app.use('/uploads', (req, res, next) => {
  // כותרות CORS אשר יתירו גישה מכל דומיין
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  // כותרות קריטיות לפתרון בעיות אבטחה וקרוס-אוריג'ין
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

// תוספת חדשה - מאפשר גישה ישירה לתמונות במסלול נוסף עם CORS
app.use('/api/uploads', (req, res, next) => {
  // הגדרות להתמודדות עם CORS עבור תמונות
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

console.log('Added direct image path with CORS headers:', path.join(__dirname, '../uploads'));

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
imageRouter.get('/:folder/:filename', asyncWrapper(async (req: Request, res: Response) => {
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
    
    // אם לא קיים בתיקיית התיקייה הספציפית, ננסה בתיקיית השורש
    const rootFilePath = path.join(__dirname, '../uploads', filename);
    if (fs.existsSync(rootFilePath)) {
      console.log(`Image found in root uploads folder: ${rootFilePath}`);
      
      // הוספת כותרות CORS מורחבות
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'credentialless');
      
      // הגדרת Cache-Control לשמירת התמונה בזיכרון המטמון
      res.header('Cache-Control', 'public, max-age=86400'); // 24 שעות
      res.header('Content-Type', 'image/jpeg');
      
      // שליחת הקובץ
      return res.sendFile(rootFilePath);
    }
    
    return res.status(404).send('Image not found');
  }
  
  // בדיקה שהקובץ אינו ריק
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    console.log(`Empty image file: ${filePath}`);
    return res.status(404).send('Empty image file');
  }
  
  // הוספת כותרות CORS מורחבות
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'credentialless');
  
  // הגדרת Cache-Control לשמירת התמונה בזיכרון המטמון
  res.header('Cache-Control', 'public, max-age=86400'); // 24 שעות
  res.header('Content-Type', 'image/jpeg');
  
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

// רישום כל נתיבי ה-API תחת הקידומת /api/
app.use('/api/check-image', imageCheckRouter);
app.use('/api/image', imageRouter);
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/search', searchRoutes);

// אנדפוינט לתיקון תמונות ריקות
app.post('/api/fix-empty-images', asyncWrapper(async (req: Request, res: Response) => {
  console.log('Starting to fix empty image files');
  const result = await fixEmptyImageFiles();
  return res.status(200).json({
    message: 'Image files check completed',
    ...result
  });
}));

// אנדפוינט חדש ומאוחד לבדיקת נתיבי תמונות
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

// אנדפוינט לשליפת קבצי התמונות בתיקייה
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

// Static files - הגדרה אחת מאוחדת במקום שתיים
app.use('/uploads', (req, res, next) => {
  // Debug request
  console.log(`[StaticFiles] Request for: ${req.url}`, {
    fullPath: path.join(__dirname, '../uploads', req.url),
    exists: fs.existsSync(path.join(__dirname, '../uploads', req.url))
  });
  
  // Set headers for CORS and caching
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Log upload dirs and permissions
const printUploadsPermissions = () => {
  const uploadDirs = [
    path.join(__dirname, '../uploads'), 
    path.join(__dirname, '../uploads/posts'),
    path.join(__dirname, '../uploads/profile')
  ];
  
  uploadDirs.forEach(dir => {
    try {
      const stats = fs.statSync(dir);
      const permissions = '0' + (stats.mode & parseInt('777', 8)).toString(8);
      console.log(`Directory ${dir} permissions: ${permissions}`);
      
      // Check for some files
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        console.log(`Files in ${dir}: ${files.length > 0 ? files.slice(0, 5).join(', ') : 'none'}`);
      }
    } catch (err) {
      console.error(`Error checking ${dir}:`, err);
    }
  });
};

printUploadsPermissions();

// API route handler for checking images - מטפל ב-API prefix
app.get('/api/check-image/:folder/:filename', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { folder, filename } = req.params;
  
  // Log request
  console.log(`[API Check Image] Request for ${folder}/${filename}`);
  
  // Handle URL encoding - decode the filename  
  const decodedFilename = decodeURIComponent(filename);
  console.log(`[API Check Image] Decoded filename: ${decodedFilename}`);
  
  // Validate folder
  if (!['posts', 'profile'].includes(folder)) {
    res.status(400).json({ 
      exists: false, 
      error: 'Invalid folder', 
      message: 'Folder must be either "posts" or "profile"'
    });
    return;
  }
  
  // Build file path
  const imagePath = path.join(__dirname, '../uploads', folder, decodedFilename);
  console.log(`[API Check Image] Looking for file at: ${imagePath}`);
  
  try {
    // Check if file exists with exact name
    let fileExists = fs.existsSync(imagePath);
    let finalPath = imagePath;
    
    // If not found, try to find file with timestamp prefix
    if (!fileExists) {
      console.log(`[API Check Image] File not found with exact name, checking for timestamp version`);
      
      const dir = path.join(__dirname, '../uploads', folder);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        // Find any file ending with the requested filename (ignoring timestamp prefix)
        const matchingFile = files.find(file => file.includes('_' + decodedFilename));
        
        if (matchingFile) {
          finalPath = path.join(dir, matchingFile);
          fileExists = true;
          console.log(`[API Check Image] Found matching file: ${matchingFile}`);
        }
      }
    }
    
    if (!fileExists) {
      console.log(`[API Check Image] File not found: ${imagePath}`);
      res.status(404).json({
        exists: false,
        error: 'Not found',
        message: 'Image does not exist'
      });
      return;
    }
    
    // Check file stats
    const stats = fs.statSync(finalPath);
    if (stats.size === 0) {
      console.log(`[API Check Image] Empty file: ${finalPath}`);
      res.status(400).json({
        exists: true,
        error: 'Empty file',
        message: 'Image file exists but is empty (0 bytes)'
      });
      return;
    }
    
    // Get the filename from the path for the URL
    const actualFilename = path.basename(finalPath);
    
    // Get image URL
    const serverBaseUrl = getServerBaseUrl();
    const imageUrl = `${serverBaseUrl}/uploads/${folder}/${actualFilename}`;
    
    console.log(`[API Check Image] Success:`, {
      path: finalPath,
      size: stats.size,
      url: imageUrl
    });
    
    res.status(200).json({
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      url: imageUrl,
      path: `/uploads/${folder}/${actualFilename}`
    });
  } catch (error: any) {
    console.error(`[API Check Image] Error:`, error);
    res.status(500).json({
      exists: false,
      error: 'Error checking file',
      message: error.message
    });
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/search', searchRoutes);

// Error handling
app.use(errorHandler);

// Get the server's base URL from environment or build it
const getServerBaseUrl = (): string => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  const host = process.env.HOST || 'localhost';
  const port = process.env.PORT || '5000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${host}:${port}`;
};

export default app; 