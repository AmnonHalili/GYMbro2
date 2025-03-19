import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// ממשק בסיסי לבקשה עם קובץ
export interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

// וידוא קיום תיקיות העלאה
const ensureUploadDirs = () => {
  try {
    // תיקיית uploads ראשית
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // תיקיית posts
    const postsDir = path.join(uploadsDir, 'posts');
    if (!fs.existsSync(postsDir)) {
      fs.mkdirSync(postsDir, { recursive: true });
    }
    
    // תיקיית profile
    const profileDir = path.join(uploadsDir, 'profile');
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    
    return true;
  } catch (error) {
    console.error('שגיאה ביצירת תיקיות העלאה:', error);
    return false;
  }
};

// יצירת מופע של multer להעלאת תמונות פוסטים
const postStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    // ודא קיום תיקיות
    ensureUploadDirs();
    cb(null, path.join(process.cwd(), 'uploads', 'posts'));
  },
  filename: function(req, file, cb) {
    // יצירת שם קובץ ייחודי
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const ext = path.extname(file.originalname) || '.jpg';
    
    cb(null, `post-${timestamp}-${randomString}${ext}`);
  }
});

// יצירת מופע של multer להעלאת תמונות פרופיל
const profileStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    // ודא קיום תיקיות
    ensureUploadDirs();
    cb(null, path.join(process.cwd(), 'uploads', 'profile'));
  },
  filename: function(req, file, cb) {
    // יצירת שם קובץ ייחודי
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const ext = path.extname(file.originalname) || '.jpg';
    
    cb(null, `profile-${timestamp}-${randomString}${ext}`);
  }
});

// פילטר סוגי קבצים מותרים
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('סוג קובץ לא מורשה. יש להעלות קבצי תמונה בלבד.'));
  }
};

// יצירת מידלוור להעלאת תמונות פוסטים
export const uploadPostImage = (req: RequestWithFile, res: Response, next: NextFunction) => {
  const upload = multer({
  storage: postStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter
  }).single('image');

  upload(req, res, (err) => {
    if (err) {
      console.error('שגיאה בהעלאת תמונת פוסט:', err);
      return res.status(400).json({ message: `שגיאה בהעלאת תמונה: ${err.message}` });
    }

    // אם הקובץ הועלה בהצלחה, הוסף את הנתיב לבקשה
    if (req.file) {
      // קביעת הנתיב לשמירה במסד הנתונים
      req.body.image = `/uploads/posts/${req.file.filename}`;
      console.log(`תמונה הועלתה בהצלחה: ${req.file.filename}`);
      console.log(`נתיב התמונה: ${req.body.image}`);
    }

    next();
  });
};

// יצירת מידלוור להעלאת תמונות פרופיל
export const uploadProfileImage = (req: RequestWithFile, res: Response, next: NextFunction) => {
  const upload = multer({
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
  }).single('profilePicture');

  upload(req, res, (err) => {
    if (err) {
      console.error('שגיאה בהעלאת תמונת פרופיל:', err);
      return res.status(400).json({ message: `שגיאה בהעלאת תמונת פרופיל: ${err.message}` });
    }

    // אם הקובץ הועלה בהצלחה, הוסף את הנתיב לבקשה
    if (req.file) {
      // קביעת הנתיב לשמירה במסד הנתונים
      req.body.profilePicture = `/uploads/profile/${req.file.filename}`;
      console.log(`תמונת פרופיל הועלתה בהצלחה: ${req.file.filename}`);
      console.log(`נתיב תמונת הפרופיל: ${req.body.profilePicture}`);
    }
      
      next();
  });
}; 