import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Helper to ensure file is writable/saveable
const ensureFileCanBeSaved = (filePath: string): boolean => {
  try {
    const dir = path.dirname(filePath);
    
    // Try to create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Check write permissions by writing a test file
    const testFile = path.join(dir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (err) {
    console.error(`Error while checking if file can be saved to ${filePath}:`, err);
    return false;
  }
};

// Ensure upload directories exist with improved error handling
const createUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/profile'),
    path.join(__dirname, '../../uploads/posts')
  ];

  dirs.forEach(dir => {
    try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
        console.log(`Created upload directory: ${dir}`);
      } else {
        // Check write permissions
        const testFile = path.join(dir, '.write-test');
        fs.writeFileSync(testFile, 'test content to verify disk space and permissions');
        const testStats = fs.statSync(testFile);
        if (testStats.size === 0) {
          console.error(`CRITICAL ERROR: Test file was created but has 0 bytes in ${dir}. Possible disk issue.`);
        } else {
          console.log(`Upload directory exists and is writable: ${dir} (test file size: ${testStats.size} bytes)`);
        }
        fs.unlinkSync(testFile);
      }
    } catch (err) {
      console.error(`CRITICAL ERROR: Cannot create or write to directory: ${dir}`, err);
      // We could throw an error here to stop the server
    }
  });
  
  // Show current files in posts directory
  try {
    const postsDir = path.join(__dirname, '../../uploads/posts');
    const files = fs.readdirSync(postsDir);
    console.log(`Found ${files.length} files in posts directory`);
    
    // Check if files are actually valid images
    if (files.length > 0) {
      const sampleFiles = files.slice(0, 5);
      console.log('Sample files:', sampleFiles);
      
      // Check that files have content
      sampleFiles.forEach(file => {
        const filePath = path.join(postsDir, file);
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          console.error(`WARNING: File ${file} exists but is empty (0 bytes)`);
        } else {
          console.log(`File ${file} is ${stats.size} bytes`);
        }
      });
    }
  } catch (err) {
    console.error('Error reading existing files:', err);
  }
};

// Initialize directories on server startup
createUploadDirs();

// Configure storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/profile');
    console.log(`Storing profile picture in: ${uploadPath}`);
    
    // Ensure directory exists and is writable
    if (!ensureFileCanBeSaved(path.join(uploadPath, 'test.jpg'))) {
      return cb(new Error(`Cannot write to directory: ${uploadPath}`), uploadPath);
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'profile-' + uniqueSuffix + path.extname(file.originalname);
    console.log(`Generated filename for profile picture: ${filename}`);
    cb(null, filename);
  }
});

// Configure storage for post images with improved error handling
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/posts');
    console.log(`Storing post image in: ${uploadPath}`);
    
    // Ensure directory exists and is writable
    if (!ensureFileCanBeSaved(path.join(uploadPath, 'test.jpg'))) {
      return cb(new Error(`Cannot write to directory: ${uploadPath}`), uploadPath);
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Get clean file extension
    let ext = path.extname(file.originalname).toLowerCase();
    // Default to .jpg if no extension
    if (!ext || ext === '.') ext = '.jpg';
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'post-' + uniqueSuffix + ext;
    console.log(`Generated filename for post image: ${filename} (from original: ${file.originalname})`);
    
    // Validate filename before returning
    if (!filename || filename === 'post-' || filename.indexOf('.') === -1) {
      console.error('Generated invalid filename!', {filename, original: file.originalname});
      return cb(new Error('Failed to generate valid filename'), 'error.jpg');
    }
    
    cb(null, filename);
  }
});

// File filter to allow only images with improved debugging
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log(`Validating file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size || 'unknown'} bytes`);
  
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!file.mimetype) {
    console.error(`Rejected file ${file.originalname}: missing mimetype`);
    return cb(new Error('Missing file type information'));
  }
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    console.log(`File type ${file.mimetype} is valid`);
    cb(null, true);
  } else {
    console.error(`Rejected file ${file.originalname}: invalid type ${file.mimetype}`);
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Create multer instances with proper configuration - adding limits
export const uploadProfilePicture = multer({
  storage: profileStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // המספר המירבי של קבצים שניתן להעלות בכל פעם
  }
}).single('profilePicture');

// עדכון הקונפיגורציה והשימוש במולטר עבור תמונות פוסטים
// מחיקת הגדרה ישנה של uploadPostImage (עכשיו השתמשנו בגרסה החדשה)
/* export const uploadPostImage = multer({
  storage: postStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // המספר המירבי של קבצים שניתן להעלות בכל פעם
  }
}).single('image'); */

// פונקציה נוספת לבעיות ב-buffer - נשתמש בה במידת הצורך
export const manualSaveUploadedFile = async (file: Express.Multer.File, directory: string = 'posts'): Promise<string> => {
  if (!file.buffer || file.buffer.length === 0) {
    throw new Error('הקובץ ריק או שלא הועבר נכון');
  }

  // יצירת שם קובץ ייחודי
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `${directory}-${uniqueSuffix}${ext}`;

  // נתיב לשמירת הקובץ
  const uploadPath = path.join(__dirname, '../../uploads', directory);
  const filePath = path.join(uploadPath, filename);

  // וידוא שהתיקייה קיימת
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  // שמירת הקובץ לדיסק
  fs.writeFileSync(filePath, file.buffer);

  // בדיקה שהקובץ נשמר
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw new Error('הקובץ נשמר אבל הוא ריק');
  }

  // החזרת הנתיב היחסי לקובץ
  return `/uploads/${directory}/${filename}`;
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

// משפר את הטיפול בשמירת התמונה בתהליך המולטר
// מטפל בשמירת התוכן באופן ישיר כדי לוודא שהוא נשמר נכון
const memoryStorage = multer.memoryStorage();

// יוצר מקצה משאבים למולטר שמשתמש באחסון בזיכרון במקום באחסון בדיסק
const upload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

// מיידלוור שמקבל את הקובץ ודואג לשמור אותו ידנית לדיסק כדי להבטיח שגודלו אינו 0
export const uploadPostImage = (req: any, res: any, next: any) => {
  console.log('==== POST IMAGE UPLOAD START ====');
  
  // יצירת תיקיית כיוון ביניים אם לא קיימת
  const logPath = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
  }
  
  // כתיבה ליומן ייעודי
  const logFile = path.join(logPath, 'createPost.log');
  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(message);
  };
  
  log('==== POST IMAGE UPLOAD START ====');
  
  // שימוש במידלוור מולטר עם אחסון זיכרון לקבלת הקובץ
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      log(`Error in multer upload: ${err.message}`);
      return res.status(400).json({ message: 'שגיאה בהעלאת הקובץ: ' + err.message });
    }
    
    // אם אין קובץ, המשך לבקר (פוסט ללא תמונה)
    if (!req.file) {
      log('No file uploaded, continuing to controller');
      return next();
    }
    
    log(`File received in middleware: ${req.file.originalname}`);
    log(`File details: size: ${req.file.size} bytes, mimetype: ${req.file.mimetype}`);
    log(`Buffer exists: ${!!req.file.buffer}, Buffer length: ${req.file.buffer ? req.file.buffer.length : 0} bytes`);
    
    // וידוא שיש באפר ושגודלו אינו 0
    if (!req.file.buffer || req.file.buffer.length === 0) {
      log('Error: File buffer is empty or missing');
      return res.status(400).json({ message: 'התמונה שהועלתה ריקה או שגויה' });
    }
    
    // בדיקה שסוג הקובץ הוא תמונה תקינה
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      log(`Error: Invalid file type: ${req.file.mimetype}`);
      return res.status(400).json({ message: 'סוג הקובץ אינו נתמך. נא להעלות קובץ מסוג JPEG, PNG, GIF או WebP בלבד' });
    }
    
    // יצירת שם קובץ יחודי
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'post-' + uniqueSuffix + ext;
    log(`Generated unique filename: ${filename}`);
    
    // נתיב לשמירת הקובץ
    const uploadPath = path.join(__dirname, '../../uploads/posts');
    const filePath = path.join(uploadPath, filename);
    log(`Full path for saving file: ${filePath}`);
    
    // וידוא שהתיקייה קיימת
    if (!fs.existsSync(uploadPath)) {
      try {
        fs.mkdirSync(uploadPath, { recursive: true });
        log(`Created directory: ${uploadPath}`);
      } catch (dirErr) {
        log(`Error creating uploads directory: ${dirErr}`);
        return res.status(500).json({ message: 'שגיאה בשמירת התמונה - לא ניתן ליצור תיקייה' });
      }
    }
    
    try {
      log(`Attempting to write file to disk, buffer length: ${req.file.buffer.length} bytes`);
      // שמירת הקובץ לדיסק באופן ידני מהבאפר
      fs.writeFileSync(filePath, req.file.buffer);
      
      // בדיקה שהקובץ נשמר בגודל הנכון
      const stats = fs.statSync(filePath);
      log(`File saved to ${filePath} with size ${stats.size} bytes`);
      
      if (stats.size === 0) {
        log('Error: File was saved but size is 0 bytes, trying again with direct copy');
        
        // ניסיון נוסף עם העתקה ישירה של המידע
        const tmpFile = path.join(os.tmpdir(), `temp-${Date.now()}.bin`);
        log(`Creating temporary file at: ${tmpFile}`);
        fs.writeFileSync(tmpFile, req.file.buffer);
        const tmpStats = fs.statSync(tmpFile);
        log(`Temporary file created with size: ${tmpStats.size} bytes`);
        
        if (tmpStats.size > 0) {
          // אם ההעתקה לקובץ זמני הצליחה, ננסה להעתיק את הקובץ הזמני לנתיב הסופי
          log(`Copying from temp file to final destination: ${filePath}`);
          fs.copyFileSync(tmpFile, filePath);
          fs.unlinkSync(tmpFile); // מחיקת הקובץ הזמני
          log(`Temporary file deleted after copy`);
          
          const newStats = fs.statSync(filePath);
          if (newStats.size === 0) {
            log('Error: Second attempt failed, file still 0 bytes');
            return res.status(500).json({ message: 'שגיאה בשמירת התמונה - הקובץ נשמר בגודל 0 גם אחרי ניסיון נוסף' });
          }
          log(`Second attempt successful, file size now: ${newStats.size} bytes`);
        } else {
          // אם גם הקובץ הזמני נכשל, יש בעיה עם הבאפר עצמו
          log('Error: Temporary file also 0 bytes, buffer may be corrupted');
          return res.status(500).json({ message: 'שגיאה בשמירת התמונה - הקובץ שהועלה פגום' });
        }
      }
      
      // עדכון פרטי הקובץ כך שהבקר יוכל להשתמש בהם
      const publicPath = `/uploads/posts/${filename}`;
      
      req.file.filename = filename;
      req.file.path = filePath;
      req.file.destination = uploadPath;
      req.file.publicPath = publicPath;
      
      // הוספת תוכן הקובץ בתור אובייקט ישירות לבקשה כדי שהבקר ידע מהי התמונה
      // גם אם בבקשה יש בעיה כלשהי
      if (!req.fileData) {
        req.fileData = {};
      }
      req.fileData.image = publicPath; 
      
      log(`File metadata updated. Public path: ${publicPath}`);
      log('==== POST IMAGE UPLOAD SUCCESS ====');
      
      next();
    } catch (writeErr) {
      log(`Error writing file to disk: ${writeErr}`);
      log('==== POST IMAGE UPLOAD FAILED ====');
      return res.status(500).json({ message: 'שגיאה בשמירת התמונה לדיסק: ' + writeErr.message });
    }
  });
}; 