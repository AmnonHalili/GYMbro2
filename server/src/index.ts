import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import apiRoutes from './routes';
import passport from 'passport';
import './config/passport';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Access-Control-Allow-Origin']
}));

// הוספת middleware לטיפול בבקשות options עבור CORS
app.options('*', cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Access-Control-Allow-Origin']
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // מאפשר טעינת משאבים מדומיינים אחרים
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(passport.initialize());

// הגדרת תיקיות סטטיות
const uploadsDir = path.join(__dirname, '..', 'uploads');
const postsDir = path.join(uploadsDir, 'posts');
const profileDir = path.join(uploadsDir, 'profile');

// יצירת התיקיות אם הן לא קיימות
if (!fs.existsSync(uploadsDir)) {
  console.log(`יוצר תיקיית uploads בנתיב: ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(postsDir)) {
  console.log(`יוצר תיקיית uploads/posts בנתיב: ${postsDir}`);
  fs.mkdirSync(postsDir, { recursive: true });
}

if (!fs.existsSync(profileDir)) {
  console.log(`יוצר תיקיית uploads/profile בנתיב: ${profileDir}`);
  fs.mkdirSync(profileDir, { recursive: true });
}

// הגדרת תיקיות סטטיות עם CORS headers
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

app.use('/uploads/posts', express.static(postsDir, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

app.use('/uploads/profile', express.static(profileDir, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

console.log('תיקיות סטטיות הוגדרו:');
console.log(`- /uploads -> ${uploadsDir}`);
console.log(`- /uploads/posts -> ${postsDir}`);
console.log(`- /uploads/profile -> ${profileDir}`);

// בדיקת הרשאות קריאה/כתיבה
try {
  const testFilePath = path.join(uploadsDir, 'test-permissions.txt');
  fs.writeFileSync(testFilePath, 'בדיקת הרשאות');
  console.log(`בדיקת הרשאות כתיבה: הצלחה! נכתב קובץ זמני: ${testFilePath}`);
  
  const readContent = fs.readFileSync(testFilePath, 'utf-8');
  console.log(`בדיקת הרשאות קריאה: הצלחה! תוכן הקובץ: ${readContent}`);
  
  fs.unlinkSync(testFilePath);
  console.log('הקובץ הזמני נמחק בהצלחה');
} catch (error) {
  console.error('שגיאה בבדיקת הרשאות קריאה/כתיבה:', error);
  console.error('ייתכן שיש בעיה בהרשאות של תיקיית uploads!');
}

// הגדרה נוספת עם CORS נכון
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// הדפסת מסלולים סטטיים שהוגדרו (לדיבאג)
console.log(`[Server] 📋 הנתיבים הסטטיים שהוגדרו במערכת:`);
app._router.stack.forEach((item: any) => {
  if (item.name === 'serveStatic') {
    console.log(`[Server] - הנתיב '${item.regexp}' מופנה לתיקייה: ${(item.handle as any).root}`);
  }
});

// מעטפת אסינכרונית לטיפול בבקשות
const asyncWrapper = (fn: (req: Request, res: Response) => Promise<any> | any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
};

// נתיב מיוחד לתמונות שהועבר מ-routes/index.ts
app.get('/api/image/:type/:filename', asyncWrapper((req: Request, res: Response) => {
  const type = req.params.type;
  const filename = req.params.filename;
  
  if (!['posts', 'profile'].includes(type)) {
    return res.status(400).json({ error: 'Invalid image type' });
  }
  
  const imagePath = path.join(__dirname, '../uploads', type, filename);
  console.log(`[ImageService] Serving image from: ${imagePath}`);
  
  if (!fs.existsSync(imagePath)) {
    console.log(`[ImageService] File not found: ${imagePath}`);
    return res.status(404).json({ error: 'Image not found' });
  }
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  
  return res.sendFile(imagePath);
}));

// setup static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.get('/', (req: Request, res: Response) => {
  res.send('GYMbro2 API is running');
});

// Use API routes
app.use('/api', apiRoutes);

// Connect to MongoDB
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || '';
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// API Documentation
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.error('Swagger documentation error:', error);
}

// Start server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

export default app; 