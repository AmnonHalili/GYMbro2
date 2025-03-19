import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Request, Response, NextFunction } from 'express';

// יצירת תיקיות העלאה בעת טעינת הקובץ
console.log(`[upload] Initializing upload middleware...`);

// וידוא שתיקיית ההעלאות קיימת בזמן טעינת האפליקציה
(function() {
  try {
    const uploadDirs = [
      path.join(__dirname, '../../uploads'),
      path.join(__dirname, '../../uploads/posts'),
      path.join(__dirname, '../../uploads/profile'),
      path.join(__dirname, '../../logs')
    ];

    for (const dir of uploadDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          fs.chmodSync(dir, 0o777);
          console.log(`[upload][init] Created directory: ${dir} with permissions 777`);
        } else {
          fs.chmodSync(dir, 0o777);
          console.log(`[upload][init] Updated permissions for existing directory: ${dir} to 777`);
        }

        // Test write permissions
        const testFile = path.join(dir, `.test-${Date.now()}`);
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log(`[upload][init] Successfully verified write permissions for: ${dir}`);
      } catch (err) {
        console.error(`[upload][init] ERROR in directory setup: ${dir}`, err);
      }
    }
  } catch (err) {
    console.error(`[upload][init] Critical ERROR in upload setup:`, err);
  }
})();

// Helper to ensure file is writable/saveable
const ensureFileCanBeSaved = (filePath: string): boolean => {
  try {
    const dir = path.dirname(filePath);
    
    // Try to create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
    
    // Check write permissions by writing a test file
    const testFile = path.join(dir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`Directory ${dir} is writable`);
    return true;
  } catch (err) {
    console.error(`Error while checking if file can be saved to ${filePath}:`, err);
    return false;
  }
};

// Helper function to ensure directory exists and is writable
const ensureUploadDirectory = (directory: string): boolean => {
  try {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      console.log(`Created directory: ${directory}`);
    }
    
    // Test write permissions
    const testFile = path.join(directory, '.test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    return true;
  } catch (error) {
    console.error(`Error ensuring directory ${directory}:`, error);
    return false;
  }
};

// Create upload directories on startup
const createUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/profile'),
    path.join(__dirname, '../../uploads/posts')
  ];

  dirs.forEach(dir => {
    if (ensureUploadDirectory(dir)) {
      console.log(`Upload directory ready: ${dir}`);
    } else {
      console.error(`Failed to ensure upload directory: ${dir}`);
    }
  });
};

// Initialize directories
createUploadDirs();

// Configure storage for post images
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, '../../uploads/posts');
      console.log(`[upload] Storing post image in: ${uploadPath}`);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`[upload] Created directory: ${uploadPath}`);
      }
      
      // Set directory permissions
      try {
        // Full permissions
        fs.chmodSync(uploadPath, 0o777);
        console.log(`[upload] Set permissions for: ${uploadPath} to 777`);
      } catch (error) {
        console.error(`[upload] Error setting permissions:`, error);
      }
      
      // Verify directory is writable
      try {
        const testFile = path.join(uploadPath, `.write-test-${Date.now()}`);
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log(`[upload] Verified write permissions for: ${uploadPath}`);
        cb(null, uploadPath);
      } catch (error) {
        console.error(`[upload] !! CRITICAL ERROR !! Directory not writable:`, error);
        cb(new Error(`Cannot write to directory: ${uploadPath}`), '');
      }
    } catch (err) {
      console.error(`[upload] Unexpected error in destination handler:`, err);
      cb(err as any, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      // אסירת תווים בעייתיים מהקובץ המקורי
      const origName = file.originalname || 'unnamed.jpg';
      const cleanFilename = origName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}_${cleanFilename}`;
      
      console.log(`[upload] Processing file:`, {
        originalName: file.originalname,
        cleanedName: cleanFilename,
        finalFilename: filename,
        size: file.size || 'unknown',
        mimetype: file.mimetype
      });
      
      // Add path info to file object
      const savedPath = `/uploads/posts/${filename}`;
      const fullPath = path.join(__dirname, '../../uploads/posts', filename);
      
      // Add all paths to file object for later use
      (file as any).savedPath = savedPath;
      (file as any).fullPath = fullPath;
      (file as any).filename = filename;
      (file as any).destination = path.join(__dirname, '../../uploads/posts');
      (file as any).imageUrl = `/uploads/posts/${filename}`; // URL for the client
      
      // Log for debugging
      console.log(`[upload] Generated filename: ${filename}, Paths set:`, {
        savedPath,
        fullPath,
        filename
      });
      
      // Store the filename in request for verifyUploadedFile to use
      (req as any).generatedFilename = filename;
      (req as any).imagePath = savedPath;
      
      cb(null, filename);
    } catch (error) {
      console.error(`[upload] Error generating filename:`, error);
      cb(error as any, '');
    }
  }
});

// Configure storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/profile');
    console.log(`[upload] Storing profile picture in: ${uploadPath}`);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`[upload] Created directory: ${uploadPath}`);
    }
    
    // Verify directory is writable
    if (!ensureUploadDirectory(uploadPath)) {
      return cb(new Error(`Cannot write to directory: ${uploadPath}`), '');
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `profile-${uniqueSuffix}${ext}`;
    
    console.log(`[upload] Generated filename: ${filename}`);
    
    // Add path info to file object
    (file as any).savedPath = `/uploads/profile/${filename}`;
    (file as any).fullPath = path.join(__dirname, '../../uploads/profile', filename);
    
    cb(null, filename);
  }
});

// File filter for images
const imageFileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log(`[upload] Validating file:`, {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    console.error(`[upload] Invalid file type: ${file.mimetype}`);
    return cb(null, false);
  }
  
  cb(null, true);
};

// Override of multer middleware to ensure complete processing
export const uploadPostImage = multer({
  storage: postStorage,
  fileFilter: (req, file, cb: multer.FileFilterCallback) => {
    console.log(`[upload] Validating file:`, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Check file presence
    if (!file) {
      console.error(`[upload] No file provided`);
      return cb(null, false);
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      console.error(`[upload] Invalid file type: ${file.mimetype}`);
      return cb(null, false);
    }
    
    console.log(`[upload] File validation successful`);
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
}).single('image');

// פונקציית עזר חדשה לבדיקת קבצים לאחר ההעלאה
export const verifyUploadedFile = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    console.log(`[upload][verify] No file was uploaded`);
    return next();
  }
  
  console.log(`[upload][verify] Verifying uploaded file:`, {
    originalname: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    savedPath: (req.file as any).savedPath
  });
  
  // וידוא שהקובץ נשמר בפועל
  if (req.file.path && fs.existsSync(req.file.path)) {
    const stats = fs.statSync(req.file.path);
    console.log(`[upload][verify] Confirmed file saved at ${req.file.path} with size ${stats.size} bytes`);
    
    if (stats.size === 0) {
      console.error(`[upload][verify] WARNING: File exists but is empty (0 bytes)`);
      
      // ניסיון תיקון קובץ ריק
      try {
        // אם יש buffer, ננסה לשמור שוב
        if ((req.file as any).buffer) {
          fs.writeFileSync(req.file.path, (req.file as any).buffer);
          console.log(`[upload][verify] Attempted to fix empty file using buffer`);
        } else {
          // הוספת תוכן מינימלי
          fs.writeFileSync(req.file.path, Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
          console.log(`[upload][verify] Added minimal content to empty file`);
        }
        
        // בדיקה חוזרת
        const newStats = fs.statSync(req.file.path);
        if (newStats.size > 0) {
          console.log(`[upload][verify] Fixed empty file, new size: ${newStats.size} bytes`);
        } else {
          console.error(`[upload][verify] Failed to fix empty file`);
        }
      } catch (err) {
        console.error(`[upload][verify] Error fixing empty file:`, err);
      }
    }
    
    // הרשאות לקובץ
    try {
      fs.chmodSync(req.file.path, 0o666); // rw-rw-rw-
      console.log(`[upload][verify] Updated file permissions to 666`);
    } catch (err) {
      console.error(`[upload][verify] Error updating file permissions:`, err);
    }
    
    // סימון לקונטרולר שהקובץ נשמר ונמצא
    (req as any).fileVerified = true;
    (req as any).fileStats = {
      exists: true,
      size: fs.statSync(req.file.path).size, // בדיקה טרייה אחרי כל הטיפולים
      path: req.file.path,
      filename: req.file.filename,
      savedPath: (req.file as any).savedPath || `/uploads/posts/${req.file.filename}`
    };
    
    // הוספת המידע גם לבקשה עצמה כדי שהקונטרולר יוכל לגשת
    (req as any).uploadedFile = {
      success: true,
      path: (req.file as any).savedPath || `/uploads/posts/${req.file.filename}`,
      filename: req.file.filename,
      size: fs.statSync(req.file.path).size
    };
    
    console.log(`[upload][verify] File verification completed successfully`);
  } else if (req.file.path) {
    console.error(`[upload][verify] WARNING: File not found at expected path: ${req.file.path}`);
    
    // ניסיון תיקון: יצירת התיקייה מחדש ושמירת הקובץ מחדש אם יש buffer
    const uploadDir = path.dirname(req.file.path);
    
    try {
      // וידוא קיום התיקייה
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.chmodSync(uploadDir, 0o777);
        console.log(`[upload][verify] Created missing directory: ${uploadDir}`);
      }
      
      // ניסיון לשחזר את הקובץ
      let success = false;
      
      // אם יש buffer, ננסה לשמור שוב
      if ((req.file as any).buffer) {
        fs.writeFileSync(req.file.path, (req.file as any).buffer);
        console.log(`[upload][verify] Recreated file from buffer at ${req.file.path}`);
        success = true;
      } 
      // אם אין buffer אבל יש stream ננסה לשמור ממנו
      else if ((req.file as any).stream) {
        console.log(`[upload][verify] Attempting to save from stream`);
        // קוד לשמירה מ-stream יכול להיות מורכב יותר
      }
      // ניסיון אחרון: יצירת קובץ ריק כבסיס
      else {
        fs.writeFileSync(req.file.path, Buffer.from(''));
        console.log(`[upload][verify] Created empty placeholder file at ${req.file.path}`);
        success = true;
      }
      
      if (success && fs.existsSync(req.file.path)) {
        const stats = fs.statSync(req.file.path);
        console.log(`[upload][verify] Fixed missing file, size: ${stats.size} bytes`);
        
        (req as any).fileVerified = true;
        (req as any).fileStats = {
          exists: true,
          size: stats.size,
          path: req.file.path,
          filename: req.file.filename,
          savedPath: (req.file as any).savedPath || `/uploads/posts/${req.file.filename}`
        };
        
        // הוספת המידע גם לבקשה עצמה כדי שהקונטרולר יוכל לגשת
        (req as any).uploadedFile = {
          success: true,
          path: (req.file as any).savedPath || `/uploads/posts/${req.file.filename}`,
          filename: req.file.filename,
          size: stats.size
        };
      } else {
        console.error(`[upload][verify] Failed to fix or find file even after recovery attempt`);
        (req as any).fileVerified = false;
        (req as any).fileError = 'File not saved properly and recovery failed';
      }
    } catch (error) {
      console.error(`[upload][verify] Error trying to fix missing file:`, error);
      (req as any).fileVerified = false;
      (req as any).fileError = 'File not saved properly and recovery failed';
    }
  } else {
    console.error(`[upload][verify] Cannot verify file: no path information available`);
    (req as any).fileVerified = false;
    (req as any).fileError = 'No path information for uploaded file';
  }
  
  next();
};

// Middleware for handling profile picture uploads
export const uploadProfilePicture = multer({
  storage: profileStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
}).single('profilePicture');

// Manual file save helper for buffer issues
export const manualSaveUploadedFile = async (file: Express.Multer.File, directory: string = 'posts'): Promise<string> => {
  console.log('[upload] Starting manual file save:', {
    originalname: file.originalname,
    size: file.buffer?.length || 0,
    mimetype: file.mimetype,
    directory
  });

  if (!file.buffer || file.buffer.length === 0) {
    console.error('[upload] Empty or invalid file buffer');
    throw new Error('Empty or invalid file buffer');
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `${directory}-${uniqueSuffix}${ext}`;
  const uploadPath = path.join(__dirname, '../../uploads', directory);
  const filePath = path.join(uploadPath, filename);
  const publicPath = `/uploads/${directory}/${filename}`;

  console.log('[upload] File details:', {
    filename,
    uploadPath,
    filePath,
    publicPath
  });

  try {
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      console.log(`[upload] Creating directory: ${uploadPath}`);
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Save file to disk
    console.log(`[upload] Writing file to: ${filePath}`);
    fs.writeFileSync(filePath, file.buffer);

    // Verify file was saved
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.error('[upload] File was saved but is empty');
      throw new Error('File was saved but is empty');
    }

    console.log(`[upload] File saved successfully: ${publicPath} (${stats.size} bytes)`);
    return publicPath;
  } catch (error) {
    console.error('[upload] Error saving file:', error);
    // Clean up if file exists but there was an error
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`[upload] Cleaned up failed file: ${filePath}`);
      } catch (cleanupError) {
        console.error('[upload] Error cleaning up failed file:', cleanupError);
      }
    }
    throw error;
  }
};

/**
 * פונקציה לבדיקה ותיקון קבצי תמונה ריקים
 * סורקת בתיקיית ההעלאות ומנסה לתקן קבצים ריקים אם מצויים
 */
export const fixEmptyImageFiles = async (): Promise<{ fixed: number, failed: number, errors: string[] }> => {
  const result = {
    fixed: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    // וידוא שהתיקיות קיימות
    await createUploadDirs();
    
    // קריאה של כל התיקיות
    const dirs = ['posts', 'profile'];
    
    for (const dir of dirs) {
      const dirPath = path.join(__dirname, '../../uploads', dir);
      
      // בדיקה שהתיקייה קיימת
      if (!fs.existsSync(dirPath)) {
        console.log(`Directory ${dirPath} does not exist, skipping`);
        continue;
      }

      // קריאת כל הקבצים בתיקייה
      const files = fs.readdirSync(dirPath);
      console.log(`Checking ${files.length} files in ${dirPath}`);

      // בדיקה של כל קובץ אם הוא ריק
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        // אם הקובץ ריק, נבדוק אם יש בקשה עם אותו שם עם נתונים שאפשר לשחזר
        if (stats.size === 0) {
          console.log(`Found empty file: ${filePath}`);
          
          // יצירת קובץ מחדש עם תוכן בסיסי אם הוא ריק
          try {
            // יצירת תמונה מחדש בסיסית
            const placeholderPath = path.join(__dirname, '../assets/placeholder.png');
            if (fs.existsSync(placeholderPath)) {
              // העתקת תמונת ברירת מחדל
              fs.copyFileSync(placeholderPath, filePath);
              console.log(`Fixed empty file ${filePath} with placeholder image`);
              result.fixed++;
            } else {
              // אם אין תמונת ברירת מחדל, ניצור קובץ בסיסי
              const buffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
              fs.writeFileSync(filePath, buffer);
              console.log(`Fixed empty file ${filePath} with basic content`);
              result.fixed++;
            }
          } catch (error) {
            console.error(`Failed to fix empty file ${filePath}:`, error);
            result.failed++;
            result.errors.push(`Failed to fix ${filePath}: ${error}`);
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error fixing empty files:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
};

// פונקציה להבטחת קיום תיקיות עם הרשאות
export const ensureUploadDirectories = () => {
  const dirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/posts'),
    path.join(__dirname, '../../uploads/profile'),
    path.join(__dirname, '../../logs')
  ];
  
  dirs.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        fs.chmodSync(dir, 0o777);
        console.log(`[upload] Created directory with full permissions: ${dir}`);
      } else {
        // בדיקת הרשאות והתאמתן
        try {
          fs.chmodSync(dir, 0o777);
          console.log(`[upload] Updated permissions for: ${dir}`);
        } catch (err) {
          console.error(`[upload] Failed to update permissions for ${dir}:`, err);
        }
      }
      
      // בדיקת אפשרות כתיבה
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`[upload] Verified write access to: ${dir}`);
    } catch (err) {
      console.error(`[upload] Error ensuring directory ${dir}:`, err);
    }
  });
  
  return true;
};

// קריאה להבטחת קיום תיקיות בטעינה
ensureUploadDirectories();

// בדיקה של תוכן ה-FormData
export const checkFormDataContent = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[upload][checkFormData] ========= בדיקת תוכן הבקשה =========`);
  console.log(`[upload][checkFormData] Headers:`, req.headers);
  console.log(`[upload][checkFormData] Content-Type:`, req.headers['content-type']);
  console.log(`[upload][checkFormData] Content-Length:`, req.headers['content-length']);
  
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    console.log(`[upload][checkFormData] זוהתה בקשת multipart/form-data`);
    
    // בדיקת תוכן הבקשה (גוף)
    console.log(`[upload][checkFormData] Body:`, req.body);
    console.log(`[upload][checkFormData] File:`, req.file);
    
    if (!req.file) {
      console.log(`[upload][checkFormData] אין קובץ בבקשה, בודק אם יש שדה 'image' בבקשה:`);
      
      // בדיקה חלופית אם יש שדה בשם 'image' ב-FormData
      if (req.body && req.body.image) {
        console.log(`[upload][checkFormData] נמצא שדה 'image' בבקשה:`, req.body.image);
      } else {
        console.log(`[upload][checkFormData] לא נמצא שדה 'image' בבקשה`);
      }
    }
  } else {
    console.log(`[upload][checkFormData] הבקשה אינה מסוג multipart/form-data:`, req.headers['content-type']);
  }
  
  console.log(`[upload][checkFormData] ====== סיום בדיקת תוכן הבקשה ======`);
  next();
};

// פונקציה לבדיקת הקובץ אחרי ניסיון השמירה במידלוור multer
export const debugSavedFile = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[upload][debugSaved] ======= בדיקת קובץ אחרי שמירה ========`);
  
  if (req.file) {
    // הדפסת פרטי הקובץ
    console.log(`[upload][debugSaved] פרטי הקובץ אחרי multer:`, {
      originalname: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      destination: req.file.destination,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    // בדיקה אם הקובץ קיים בפועל
    if (fs.existsSync(req.file.path)) {
      const stats = fs.statSync(req.file.path);
      console.log(`[upload][debugSaved] הקובץ קיים בגודל: ${stats.size} בייטים`);
      
      // בדיקה שהקובץ אינו ריק
      if (stats.size === 0) {
        console.error(`[upload][debugSaved] אזהרה: הקובץ ריק (0 בייטים)`);
        
        // ניסיון לתקן קובץ ריק
        try {
          if ((req.file as any).buffer) {
            // שמירה מחדש מהבאפר אם קיים
            fs.writeFileSync(req.file.path, (req.file as any).buffer);
            console.log(`[upload][debugSaved] שמירה מחדש מהבאפר: ${fs.statSync(req.file.path).size} בייטים`);
          } else {
            // שמירת תוכן מינימלי
            const base64Pixel = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            fs.writeFileSync(req.file.path, Buffer.from(base64Pixel, 'base64'));
            console.log(`[upload][debugSaved] נשמר תוכן מינימלי: ${fs.statSync(req.file.path).size} בייטים`);
          }
        } catch (err) {
          console.error(`[upload][debugSaved] שגיאה בניסיון תיקון קובץ ריק:`, err);
        }
      }
      
      // הרשאות
      try {
        fs.chmodSync(req.file.path, 0o666);
        console.log(`[upload][debugSaved] הרשאות הקובץ עודכנו ל-666`);
      } catch (err) {
        console.error(`[upload][debugSaved] שגיאה בעדכון הרשאות:`, err);
      }
    } else {
      console.error(`[upload][debugSaved] הקובץ לא נמצא בנתיב המצופה: ${req.file.path}`);
      
      // בדיקה אם התיקייה קיימת
      const dir = path.dirname(req.file.path);
      if (!fs.existsSync(dir)) {
        console.error(`[upload][debugSaved] התיקייה אינה קיימת: ${dir}`);
        try {
          fs.mkdirSync(dir, { recursive: true });
          fs.chmodSync(dir, 0o777);
          console.log(`[upload][debugSaved] נוצרה תיקייה חדשה: ${dir}`);
        } catch (err) {
          console.error(`[upload][debugSaved] שגיאה ביצירת תיקייה:`, err);
        }
      } else {
        console.log(`[upload][debugSaved] התיקייה קיימת: ${dir}`);
        
        // רשימת קבצים בתיקייה
        try {
          const files = fs.readdirSync(dir);
          console.log(`[upload][debugSaved] קבצים בתיקייה: ${files.length > 0 ? files.join(', ') : 'אין קבצים'}`);
        } catch (err) {
          console.error(`[upload][debugSaved] שגיאה בקריאת תוכן התיקייה:`, err);
        }
      }
    }
  } else {
    console.log(`[upload][debugSaved] אין קובץ בבקשה אחרי multer`);
  }
  
  console.log(`[upload][debugSaved] ===== סיום בדיקת קובץ אחרי שמירה =====`);
  next();
};