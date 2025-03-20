import { Request, Response } from 'express';
import Post from '../models/Post';
import fs from 'fs';
import path from 'path';
import { IUser } from '../models/User';
import mongoose from 'mongoose';

// הרחבת הטיפוס File של מולטר כדי לכלול את השדה publicPath שאנחנו מוסיפים
declare module 'express-serve-static-core' {
  interface Multer {
    File: Express.Multer.File & {
      publicPath?: string;
    };
  }
}

// פונקציה לתיקון נתיב תמונה - מוודאת שנתיב התמונה תקין
function fixImagePath(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  
  // וידוא שהנתיב מתחיל ב-/
  let fixedPath = imagePath;
  if (!fixedPath.startsWith('/')) {
    fixedPath = '/' + fixedPath;
  }
  
  // החלפת \ ב-/ (למקרה של Windows)
  fixedPath = fixedPath.replace(/\\/g, '/');
  
  return fixedPath;
}

// הוספת טיפוס עבור האובייקט req.file המורחב
interface RequestWithFile extends Request {
  file?: Express.Multer.File & {
    publicPath?: string;
  };
  fileData?: {
    image?: string;
    [key: string]: any;
  };
  // הוספת השדות הישירים שמשתמשים בהם בקוד
  image?: string;
  imgUrl?: string;
}

// הגדרת הטיפוס המורחב של Request שכולל את המשתמש
interface RequestWithUser extends Request {
  user?: IUser;
}

// Get all posts (feed) with pagination
export const getAllPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = req.query.userId as string;
    
    const skip = (page - 1) * limit;
    
    // Build filter based on query parameters
    const filter: any = {};
    if (userId) {
      filter.user = userId;
    }
    
    // Find posts with optional filtering
    const posts = await Post.find(filter)
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalPosts = await Post.countDocuments(filter);
    
    res.status(200).json({
      posts,
      totalPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      hasMore: skip + posts.length < totalPosts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Server error while fetching posts' });
  }
};

// Get posts by user ID
export const getPostsByUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const skip = (page - 1) * limit;
    
    // Find posts by the specified user
    const posts = await Post.find({ user: userId })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalPosts = await Post.countDocuments({ user: userId });
    
    res.status(200).json({
      posts,
      totalPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      hasMore: skip + posts.length < totalPosts
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Server error while fetching user posts' });
  }
};

// Get trending posts (most liked)
export const getTrendingPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Find posts sorted by likes count
    const posts = await Post.find()
      .populate('user', 'username profilePicture')
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit);
    
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.status(500).json({ message: 'Server error while fetching trending posts' });
  }
};

// Get a single post by ID
export const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findById(postId).populate('user', 'username profilePicture');
    
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    res.status(200).json({ post });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Server error while fetching post' });
  }
};

// Create a new post - גרסה עם דיבאג מפורט
export const createPost = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    console.log('=== התחלת יצירת פוסט חדש עם דיבאג מפורט ===');
    console.log('נתוני בקשה:', {
      headers: req.headers['content-type'],
      body: req.body,
      user: req.user ? `${req.user.username} (${req.user._id})` : 'לא מחובר'
    });
    
    // בדיקת קובץ
    console.log('מידע על הקובץ:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file?.size || 0,
      mimetype: req.file.mimetype
    } : 'אין קובץ');
    
    // בדיקת אימות משתמש
    if (!req.user) {
      console.log('שגיאה: משתמש לא מחובר');
      res.status(401).json({ message: 'אינך מחובר' });
      return;
    }
    
    // בדיקת תוכן
    const { content } = req.body;
    if (!content) {
      console.log('שגיאה: חסר תוכן הפוסט');
      res.status(400).json({ message: 'תוכן הפוסט הוא שדה חובה' });
      return;
    }
    
    // מידע על התמונה (אם הועלתה)
    let imageUrl = null;
    
    // אם יש תמונה בבקשה, בדוק שהיא תקינה
    if (req.body.image) {
      console.log(`נמצא נתיב תמונה בבקשה: ${req.body.image}`);
      imageUrl = fixImagePath(req.body.image);
      console.log(`נתיב תמונה אחרי תיקון: ${imageUrl}`);
      
      // בדיקה שהקובץ קיים
      const uploadsPath = path.join(process.cwd(), 'uploads');
      const relativePath = imageUrl?.replace(/^\/uploads\//, '') || '';
      const fullPath = path.join(uploadsPath, relativePath);
      
      if (fs.existsSync(fullPath)) {
        console.log(`הקובץ נמצא בנתיב: ${fullPath}`);
        const stats = fs.statSync(fullPath);
        console.log(`גודל הקובץ: ${stats.size} בייטים`);
      } else {
        console.log(`אזהרה: הקובץ לא נמצא בנתיב ${fullPath}!`);
      }
      }
      
    // אם קיים גם קובץ מצורף, בדוק אותו
    if (req.file) {
      console.log(`תמונה הועלתה: ${req.file.filename}. בודק אם הקובץ קיים במערכת הקבצים...`);
      
      // בדיקה שהקובץ אכן נשמר במערכת הקבצים
      const fullPath = req.file.path;
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`הקובץ נמצא בנתיב ${fullPath}, גודל: ${stats.size} בייטים`);
        
        imageUrl = fixImagePath(`/uploads/posts/${req.file.filename}`);
        console.log(`נתיב תמונה שנשמר בדאטהבייס: ${imageUrl}`);
      } else {
        console.log(`שגיאה: הקובץ לא נמצא בנתיב ${fullPath}!`);
      }
    }

    // יצירת הפוסט במסד הנתונים
    const postData = {
      content,
      user: req.user._id,
      image: imageUrl
    };
    
    console.log('יוצר פוסט עם הנתונים:', postData);

    const post = new Post(postData);
    console.log('ניסיון לשמור את הפוסט במסד הנתונים...');
    const savedPost = await post.save();
    console.log(`פוסט נשמר בהצלחה עם מזהה: ${savedPost._id}`);
    
    try {
      // החזרת פרטי הפוסט המלאים
      console.log('מעשיר את הנתונים עם פרטי משתמש ולייקים...');
      const populatedPost = await Post.findById(savedPost._id)
        .populate('user', 'username profilePicture')
        .populate('likes', 'username');
      
      console.log(`פוסט נוצר בהצלחה, מזהה: ${savedPost._id}`);
      
      // הכנת אובייקט ללא מאפיינים מעגליים
      const populatedUser = populatedPost?.user as unknown as { 
        _id: mongoose.Types.ObjectId;
        username?: string;
        profilePicture?: string;
      };
      
      const safePost = {
        _id: populatedPost?._id?.toString(),
        id: populatedPost?._id?.toString(),
        content: populatedPost?.content,
        image: populatedPost?.image,
        user: {
          _id: populatedUser?._id?.toString(),
          id: populatedUser?._id?.toString(),
          username: populatedUser?.username,
          profilePicture: populatedUser?.profilePicture
        },
        createdAt: populatedPost?.createdAt,
        updatedAt: populatedPost?.updatedAt,
        likesCount: populatedPost?.likesCount || 0,
        commentsCount: populatedPost?.commentsCount || 0
      };
      
      console.log('שולח תשובה ללקוח:', JSON.stringify(safePost));
      res.status(201).json(safePost);
      return;
    } catch (populateError) {
      console.error('שגיאה בהעשרת פרטי הפוסט:', populateError);
      
      // במקרה של שגיאה, נחזיר את הפוסט הבסיסי
      const basicPost = {
        _id: savedPost._id.toString(),
        id: savedPost._id.toString(),
        content: savedPost.content,
        image: savedPost.image,
        user: savedPost.user.toString(),
        createdAt: savedPost.createdAt,
        updatedAt: savedPost.updatedAt
      };
      
      console.log('שולח תשובה בסיסית ללקוח:', JSON.stringify(basicPost));
      res.status(201).json(basicPost);
      return;
    }
  } catch (error) {
    console.error('!!! שגיאה חמורה ביצירת פוסט !!!', error);
    console.error('פרטי השגיאה:', error instanceof Error ? error.message : String(error));
    console.error('סוג השגיאה:', error instanceof Error ? error.name : 'לא ידוע');
    console.error('מקור השגיאה:', error instanceof Error && error.stack ? error.stack : 'לא ידוע');
    
    // בדיקה אם הפוסט כבר נשמר למרות השגיאה
    if (error instanceof Error && error.message.includes('already saved') && req.body.postId) {
      try {
        // החזרת פרטי הפוסט הבסיסיים
        const existingPost = await Post.findById(req.body.postId);
        if (existingPost) {
          res.status(201).json({
            _id: existingPost._id,
            id: existingPost._id,
            content: existingPost.content,
            image: existingPost.image
          });
          return;
        }
      } catch (findError) {
        console.error('שגיאה בחיפוש פוסט שכבר נשמר:', findError);
      }
    }
    
    res.status(500).json({ 
      message: 'שגיאת שרת ביצירת פוסט',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Update a post
export const updatePost = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    console.log('=== התחלת עדכון פוסט ===');
    console.log(`ID של הפוסט לעדכון: ${req.params.postId}`);
    console.log('מידע מהבקשה:', {
      body: req.body,
      file: req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        publicPath: req.body.image
      } : 'אין קובץ חדש',
      user: req.user
    });

    // בדיקת אימות משתמש
    if (!req.user) {
      console.error('אין משתמש בבקשה - חוסר אימות');
      res.status(401).json({ message: 'משתמש לא מורשה' });
      return;
    }

    // שליפת הפוסט
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      console.error(`פוסט עם ID ${req.params.postId} לא נמצא`);
      res.status(404).json({ message: 'פוסט לא נמצא' });
      return;
    }

    // בדיקת בעלות
    if (post.user.toString() !== req.user._id.toString()) {
      console.error(`המשתמש ${req.user._id} אינו בעל הפוסט ${post._id}`);
      res.status(403).json({ message: 'אתה לא מורשה לערוך פוסט זה' });
      return;
    }

    // עדכון פרטי הפוסט
    const { content, removeImage } = req.body;
    const oldImage = post.image;
    
    console.log('מצב תמונה קודם:', oldImage);
    console.log('נתוני עדכון:', {
      תוכן: content,
      הסרתתמונה: removeImage === 'true',
      תמונהחדשה: req.body.image || 'אין תמונה חדשה'
    });

    // עדכון תוכן אם התקבל
    if (content !== undefined) {
      post.content = content;
    }
    
    // טיפול בתמונה
    if (removeImage === 'true') {
      console.log('הסרת תמונה התבקשה');
      // מחיקת התמונה הישנה מהשרת אם קיימת
      if (oldImage) {
        try {
          const uploadsPath = path.join(process.cwd(), 'uploads');
          const relativePath = oldImage.replace(/^\/uploads\//, '');
          const oldImagePath = path.join(uploadsPath, relativePath);
          
          console.log(`מנסה למחוק תמונה ישנה בנתיב: ${oldImagePath}`);
          
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('תמונה ישנה נמחקה בהצלחה');
          } else {
            console.log('תמונה ישנה לא נמצאה במערכת הקבצים');
          }
        } catch (err) {
          console.error('שגיאה במחיקת התמונה הישנה:', err);
        }
      }
      
      post.image = null;
    } 
    // אם יש תמונה חדשה, עדכן את שדה התמונה
    else if (req.body.image) {
      console.log(`עדכון תמונה לנתיב חדש: ${req.body.image}`);
      
      // תיקון נתיב התמונה
      const newImagePath = fixImagePath(req.body.image);
      
      // מחיקת התמונה הישנה אם קיימת ושונה מהחדשה
      if (oldImage && oldImage !== newImagePath) {
        try {
          const uploadsPath = path.join(process.cwd(), 'uploads');
          const relativePath = oldImage.replace(/^\/uploads\//, '');
          const oldImagePath = path.join(uploadsPath, relativePath);
          
          console.log(`מנסה למחוק תמונה ישנה בנתיב: ${oldImagePath}`);
          
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('תמונה ישנה נמחקה בהצלחה');
          } else {
            console.log('תמונה ישנה לא נמצאה במערכת הקבצים');
          }
        } catch (err) {
          console.error('שגיאה במחיקת התמונה הישנה:', err);
        }
      }
      
      post.image = newImagePath;
    }
    // אם לא התבקשה הסרה ולא התקבלה תמונה חדשה, משאיר את התמונה הקיימת
    
    // שמירת העדכונים
    await post.save();
    console.log(`פוסט ${post._id} עודכן בהצלחה`);
    
    // שליפת הפוסט המעודכן עם פרטי משתמש
    const updatedPost = await Post.findById(post._id)
      .populate('user', 'username profilePicture')
      .populate('likes', 'username');
    
    console.log('פוסט מעודכן נשלח ללקוח:', {
      id: updatedPost?._id,
      content: updatedPost?.content,
      image: updatedPost?.image
    });
    
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('שגיאה בעדכון פוסט:', error);
    res.status(500).json({ 
      message: 'שגיאת שרת בעדכון פוסט', 
      error: (error as Error).message
    });
  }
};

// Delete a post
export const deletePost = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    console.log('=== התחלת מחיקת פוסט ===');
    
    if (!req.user) {
      console.error('אין משתמש מחובר בבקשה');
      res.status(401).json({ message: 'משתמש לא מורשה' });
      return;
    }
    
    const { postId } = req.params;
    console.log(`ניסיון למחוק פוסט ${postId} על ידי משתמש ${req.user._id}`);
    
    // מציאת הפוסט
    const post = await Post.findById(postId);
    
    if (!post) {
      console.error(`פוסט עם ID ${postId} לא נמצא`);
      res.status(404).json({ message: 'פוסט לא נמצא' });
      return;
    }
    
    // בדיקת בעלות
    if (post.user.toString() !== req.user._id.toString()) {
      console.error(`המשתמש ${req.user._id} אינו הבעלים של פוסט ${postId}`);
      res.status(403).json({ message: 'אתה לא מורשה למחוק פוסט זה' });
      return;
    }
    
    // מחיקת התמונה אם קיימת
    if (post.image) {
      const imagePath = path.join(process.cwd(), post.image.replace(/^\//, ''));
      console.log(`בודק אם יש למחוק תמונה בנתיב: ${imagePath}`);
      
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`תמונה נמחקה בהצלחה: ${imagePath}`);
      } else {
        console.log(`לא נמצאה תמונה לפוסט בנתיב: ${imagePath}`);
      }
    }
    
    // מחיקת הפוסט
    await Post.findByIdAndDelete(postId);
    console.log(`פוסט ${postId} נמחק בהצלחה`);
    
    res.status(200).json({ 
      message: 'פוסט נמחק בהצלחה',
      postId
    });
  } catch (error) {
    console.error('שגיאה במחיקת פוסט:', error);
    res.status(500).json({ message: 'שגיאת שרת במחיקת פוסט', error: (error as Error).message });
  }
};

// עדכון נתיבי תמונות בפוסטים קיימים - פונקציה זמנית
export const fixPostImages = async (req: Request, res: Response): Promise<void> => {
  console.log('=== התחלת תיקון נתיבי תמונות בפוסטים ===');
  
  try {
    // וידוא שהמשתמש מחובר עם הרשאות מתאימות
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    console.log(`בקשה לתיקון תמונות מהמשתמש: ${user.username} (${user._id})`);
    
    // יצירת פונקציות עזר במקום אלו שהיו קודם
    function fixImagePath(imagePath: string): string {
      if (!imagePath) return '';
      
      // וידוא שהנתיב מתחיל ב- /uploads/
      if (!imagePath.startsWith('/uploads/')) {
        const fileName = imagePath.split('/').pop() || '';
        return `/uploads/posts/${fileName}`;
      }
      
      return imagePath;
    }
    
    // מציאת כל הפוסטים עם תמונות
    const posts = await Post.find({ image: { $ne: null } });
    
    console.log(`נמצאו ${posts.length} פוסטים עם תמונות לבדיקה`);
    
    // נתונים סטטיסטיים
    const stats = {
      examined: 0,
      fixed: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // עבור על כל הפוסטים ובדוק/תקן את נתיבי התמונות
    for (const post of posts) {
      stats.examined++;
      
      // בדיקה שיש נתיב תמונה
      if (!post.image) {
        continue;
      }
      
      console.log(`בדיקת פוסט ${post._id}, נתיב תמונה נוכחי: ${post.image}`);
      
      try {
        // בדיקה אם יש צורך בתיקון נתיב התמונה
        const imagePath = post.image;
        
        // ניקוי נתיב התמונה
        const fixedPath = fixImagePath(imagePath);
        
        if (fixedPath !== imagePath) {
          console.log(`נתיב תמונה לא תקין נמצא, מנקה מ-${imagePath} ל-${fixedPath}`);
          
          // עדכון נתיב התמונה בפוסט
          post.image = fixedPath;
          
          // שמירת השינויים
          await post.save();
          
          console.log(`נתיב התמונה תוקן בהצלחה לפוסט ${post._id}`);
          stats.fixed++;
        } else {
          console.log(`נתיב התמונה תקין לפוסט ${post._id}`);
        }
      } catch (error) {
        stats.failed++;
        const errorMessage = `שגיאה בתיקון נתיב תמונה לפוסט ${post._id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        stats.errors.push(errorMessage);
      }
    }
    
    console.log('=== סיום תיקון נתיבי תמונות בפוסטים ===');
    console.log(`סיכום: נבדקו ${stats.examined}, תוקנו ${stats.fixed}, נכשלו ${stats.failed}`);
    
    res.status(200).json({
      message: `Fixed ${stats.fixed} post image paths out of ${stats.examined} examined`,
      stats
    });
    
  } catch (error) {
    console.error('שגיאה כללית בתיקון נתיבי תמונות:', error);
    res.status(500).json({
      message: 'Error fixing post image paths',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
