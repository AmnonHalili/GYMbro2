import { Request, Response } from 'express';
import Post from '../models/Post';
import { IUser } from '../models/User';
import fs from 'fs';
import path from 'path';
import { manualSaveUploadedFile } from '../middleware/upload';

// הרחבת הטיפוס File של מולטר כדי לכלול את השדה publicPath שאנחנו מוסיפים
declare module 'express-serve-static-core' {
  interface Multer {
    File: Express.Multer.File & {
      publicPath?: string;
    };
  }
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

// Create a new post
export const createPost = async (req: RequestWithFile, res: Response): Promise<void> => {
  try {
    console.log('\n======= יצירת פוסט חדש - התחלה =======');
    
    const userId = ((req as any).user)?._id;
    console.log(`[postController] משתמש מזוהה: ${userId || 'לא מזוהה'}`);
    console.log(`[postController] גוף הבקשה:`, req.body || 'ריק');
    
    // מידע מפורט על הקובץ
    if (req.file) {
      console.log(`[postController] פרטי הקובץ המלאים:`, {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        destination: req.file.destination,
        mimetype: req.file.mimetype,
        size: req.file.size,
        savedPath: (req.file as any).savedPath,
        fullPath: (req.file as any).fullPath,
        imageUrl: (req.file as any).imageUrl,
        buffer: req.file.buffer ? 'Buffer exists' : 'No buffer'
      });

      // בדיקה נוספת שהקובץ קיים ותקין
      if (req.file.path) {
        try {
          if (fs.existsSync(req.file.path)) {
            const stats = fs.statSync(req.file.path);
            console.log(`[postController] אימות הקובץ: קיים בפועל בגודל ${stats.size} בייטים`);
            
            // בדיקה שהקובץ אינו ריק
            if (stats.size === 0) {
              console.error(`[postController] הקובץ קיים אך ריק (0 בייטים)!`);
              
              // ניסיון לתקן קובץ ריק
              if (req.file.buffer) {
                console.log(`[postController] מנסה לתקן קובץ ריק עם buffer שנשמר`);
                fs.writeFileSync(req.file.path, req.file.buffer);
                const newStats = fs.statSync(req.file.path);
                console.log(`[postController] תוצאת תיקון: ${newStats.size} בייטים`);
              }
            }
          } else {
            console.error(`[postController] הקובץ לא נמצא בנתיב: ${req.file.path}`);
          }
        } catch (fileErr) {
          console.error(`[postController] שגיאה בבדיקת הקובץ:`, fileErr);
        }
      }
    } else {
      console.log(`[postController] לא התקבל קובץ בבקשה`);
    }
    
    // בדיקת מידע על אימות הקובץ מהמידלוור
    const fileVerified = (req as any).fileVerified;
    const fileStats = (req as any).fileStats;
    const uploadedFile = (req as any).uploadedFile;
    
    if (fileVerified) {
      console.log(`[postController] הקובץ אומת בהצלחה במידלוור:`, fileStats);
    }
    
    if (uploadedFile) {
      console.log(`[postController] נתוני קובץ מאומת מהמידלוור:`, uploadedFile);
    }
    
    const generatedFilename = (req as any).generatedFilename;
    if (generatedFilename) {
      console.log(`[postController] שם קובץ שנוצר במידלוור: ${generatedFilename}`);
    }
    
    const user = (req as any).user;
    if (!user) {
      console.error(`[postController] לא נמצא משתמש מאומת`);
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { content } = req.body;
    if (!content) {
      console.error(`[postController] חסר תוכן בבקשה`);
      res.status(400).json({ message: 'Content is required' });
      return;
    }

    // טיפול בהעלאת תמונה ושמירת הנתיב
    let imagePath = null;
    
    // קביעת סדר עדיפויות לקבלת נתיב התמונה
    // 1. קודם מהמידלוור המאמת
    if (fileVerified && fileStats) {
      imagePath = fileStats.savedPath;
      console.log(`[postController] נתיב התמונה מהמידלוור המאמת: ${imagePath}`);
    }
    // 2. מהמידלוור של multer
    else if (req.file) {
      // 2.1 נתיב מועדף - מידע נוסף שהוספנו 
      if ((req.file as any).savedPath) {
        imagePath = (req.file as any).savedPath;
        console.log(`[postController] נתיב התמונה מה-savedPath: ${imagePath}`);
      }
      // 2.2 בניית נתיב משם הקובץ
      else if (req.file.filename) {
        imagePath = `/uploads/posts/${req.file.filename}`;
        console.log(`[postController] נתיב התמונה נבנה מה-filename: ${imagePath}`);
      }
      // 2.3 חילוץ נתיב יחסי
      else if (req.file.path) {
        // הסרת חלק הנתיב המוחלט והשארת החלק היחסי
        try {
          const uploadsIndex = req.file.path.indexOf('uploads');
          if (uploadsIndex !== -1) {
            imagePath = `/${req.file.path.substring(uploadsIndex)}`;
            console.log(`[postController] נתיב התמונה חולץ מהנתיב: ${imagePath}`);
          } else {
            console.error(`[postController] לא ניתן לחלץ נתיב יחסי, משתמש בנתיב מלא`);
            imagePath = `/uploads/posts/${path.basename(req.file.path)}`;
          }
        } catch (pathErr) {
          console.error(`[postController] שגיאה בחילוץ נתיב:`, pathErr);
          imagePath = `/uploads/posts/${path.basename(req.file.path || '')}`;
        }
      }
      // 3. מידע שנוצר בצורה אחרת
      else if (generatedFilename) {
        imagePath = `/uploads/posts/${generatedFilename}`;
        console.log(`[postController] נתיב התמונה נבנה משם הקובץ שנוצר במידלוור: ${imagePath}`);
      }
    }
    // אם אין קובץ, אין תמונה
    else {
      console.log(`[postController] לא התקבל קובץ תמונה בבקשה`);
    }
    
    // סיכום לפני בדיקות סופיות
    console.log(`[postController] סיכום ביניים - נתיב תמונה: ${imagePath || 'לא נמצא'}`);
    
    // בדיקה אחרונה של תקינות הנתיב והקובץ בטרם שמירת הפוסט
    if (imagePath) {
      try {
        const fullPath = path.join(__dirname, '../..', imagePath);
        const exists = fs.existsSync(fullPath);
        console.log(`[postController] בדיקת קיום הקובץ בנתיב מלא: ${fullPath}, קיים: ${exists}`);
        
        if (!exists) {
          console.warn(`[postController] הקובץ לא נמצא בנתיב המצופה. בודק באפשרויות נוספות...`);
          
          // אפשרות ראשונה: בעיה בנתיב - ננסה לבנות נתיב חלופי
          if (req.file && req.file.filename) {
            const altPath = path.join(__dirname, '../../uploads/posts', req.file.filename);
            if (fs.existsSync(altPath)) {
              console.log(`[postController] נמצא בנתיב חלופי: ${altPath}`);
              imagePath = `/uploads/posts/${req.file.filename}`;
            } else {
              // אפשרות שנייה: חיפוש קבצים באותה תיקייה
              const postsDir = path.join(__dirname, '../../uploads/posts');
              if (fs.existsSync(postsDir)) {
                const files = fs.readdirSync(postsDir);
                console.log(`[postController] רשימת קבצים בתיקייה:`, files);
                
                // חיפוש התאמה חלקית בשם הקובץ
                if (req.file && req.file.originalname) {
                  const baseFilename = path.basename(req.file.originalname, path.extname(req.file.originalname));
                  console.log(`[postController] מחפש התאמה לשם בסיס: ${baseFilename}`);
                  
                  const matchingFile = files.find(file => 
                    file.includes(baseFilename) || 
                    (req.file && file.includes(req.file.filename || ''))
                  );
                  
                  if (matchingFile) {
                    console.log(`[postController] נמצא קובץ מתאים: ${matchingFile}`);
                    imagePath = `/uploads/posts/${matchingFile}`;
                  } else {
                    console.error(`[postController] לא נמצאו קבצים מתאימים`);
                    imagePath = null;
                  }
                } else {
                  // אין לנו מידע מספיק לחיפוש
                  console.error(`[postController] אין מספיק מידע לחיפוש קובץ מתאים`);
                  imagePath = null;
                }
              } else {
                console.error(`[postController] תיקיית posts לא קיימת`);
                imagePath = null;
              }
            }
          } else {
            console.error(`[postController] אין מספיק מידע לבניית נתיב חלופי`);
            imagePath = null;
          }
        } else {
          // הקובץ קיים, בדיקה שאינו ריק
          const stats = fs.statSync(fullPath);
          if (stats.size === 0) {
            console.warn(`[postController] הקובץ קיים אך ריק. מנסה לתקן...`);
            
            // ניסיון לתקן קובץ ריק
            try {
              if (req.file && req.file.buffer) {
                fs.writeFileSync(fullPath, req.file.buffer);
                console.log(`[postController] תיקון קובץ ריק מהבאפר`);
              } else {
                // שמירת תוכן מינימלי
                const base64Pixel = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                fs.writeFileSync(fullPath, Buffer.from(base64Pixel, 'base64'));
                console.log(`[postController] תיקון קובץ ריק עם תוכן מינימלי`);
              }
              
              // בדיקה שהתיקון הצליח
              const newStats = fs.statSync(fullPath);
              if (newStats.size === 0) {
                console.error(`[postController] תיקון הקובץ נכשל, מאפס נתיב תמונה`);
                imagePath = null;
              } else {
                console.log(`[postController] הקובץ תוקן בהצלחה, גודל חדש: ${newStats.size} בייטים`);
              }
            } catch (fixErr) {
              console.error(`[postController] שגיאה בתיקון קובץ ריק:`, fixErr);
              imagePath = null;
            }
          } else {
            console.log(`[postController] הקובץ נמצא ותקין, גודל: ${stats.size} בייטים`);
          }
        }
      } catch (err) {
        console.error(`[postController] שגיאה בבדיקת קיום הקובץ:`, err);
        imagePath = null;
      }
    }
    
    // סיכום לפני שמירה
    console.log(`[postController] נתיב תמונה סופי: ${imagePath || 'לא נמצא תקין'}`);
    
    // שמירת הפוסט במסד הנתונים
    console.log(`[postController] יוצר פוסט חדש:`, {
      user: user._id,
      content: content,
      image: imagePath
    });
    
    const newPost = new Post({
      content,
      user: user._id,
      image: imagePath
    });
    
    await newPost.save();
    console.log(`[postController] הפוסט נשמר בהצלחה עם ID: ${newPost._id}`);
    
    // בדיקה שהתמונה אכן נשמרה בפוסט
    const savedPost = await Post.findById(newPost._id);
    console.log(`[postController] בדיקת הפוסט ששמור במסד הנתונים:`, {
      id: savedPost?._id,
      content: savedPost?.content,
      image: savedPost?.image
    });

    // הוספת מידע על המשתמש לתשובה
    await newPost.populate('user', 'username profilePicture');
    
    // בניית URL מלא לתמונה
    let imageUrl = null;
    if (imagePath) {
      const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
      // וידוא שאין כפל / בחיבור ה-URL
      const cleanImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      imageUrl = `${serverUrl}${cleanImagePath}`;
      console.log(`[postController] URL מלא לתמונה: ${imageUrl}`);
    }

    // שליחת תשובה מפורטת
    const response = {
      message: 'Post created successfully',
      post: {
        id: newPost._id,
        content: newPost.content,
        image: imagePath,
        imageUrl: imageUrl,
        user: {
          id: (newPost.user as IUser)._id,
          username: (newPost.user as IUser).username,
          profilePicture: (newPost.user as IUser).profilePicture
        },
        likesCount: 0,
        commentsCount: 0,
        createdAt: newPost.createdAt
      }
    };
    
    console.log(`[postController] שולח תשובה: Post created successfully (ID: ${newPost._id})`);
    console.log('======= יצירת פוסט חדש - סיום =======\n');
    
    res.status(201).json(response);
  } catch (error) {
    console.error(`[postController] שגיאה ביצירת פוסט:`, error);
    res.status(500).json({ message: 'Error creating post' });
  }
};

// Update a post
export const updatePost = async (req: RequestWithFile, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    
    // לוג בקשה לעדכון פוסט
    console.log(`[postController] Received request to update post ${id} by user ${userId}`);
    console.log(`[postController] Request body:`, req.body);
    console.log(`[postController] File:`, req.file);
    
    if (!userId) {
      console.error(`[postController] No user ID found in request`);
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Find the post to check ownership
    const post = await Post.findById(id);
    
    if (!post) {
      console.error(`[postController] Post ${id} not found`);
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Check if the user is the post owner
    const postUserId = post.user.toString();
    console.log(`[postController] Post user ID: ${postUserId}, Current user ID: ${userId}`);
    
    if (postUserId !== userId.toString()) {
      console.error(`[postController] User ${userId} attempted to update post ${id} owned by ${postUserId}`);
      res.status(403).json({ message: 'You can only update your own posts' });
      return;
    }

    // Get the content from the request body
    const { content } = req.body;
    if (!content || content.trim() === '') {
      console.error(`[postController] Post update rejected: empty content`);
      res.status(400).json({ message: 'Post content is required' });
      return;
    }

    // Update post data
    const updateData: any = { content };

    // Handle image update (add, remove, or keep existing)
    if (req.file) {
      // Log file data for debugging
      console.log(`[postController] New image upload:`, {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      
      // Add new image - וידוא שיש / בהתחלה
      const imagePath = `/uploads/posts/${req.file.filename}`;
      updateData.image = imagePath;
      
      console.log(`[postController] Image path set to: "${imagePath}"`);
      
      // בדיקה שהנתיב תקין ומתחיל ב-/
      if (!imagePath.startsWith('/')) {
        console.error(`[postController] ERROR: Image path does not start with /: "${imagePath}"`);
      }
      
      // If there was an old image, try to delete it (don't break if fails)
      if (post.image) {
        const oldImagePath = path.join(__dirname, '../../', post.image);
        try {
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log(`[postController] Deleted old image: ${oldImagePath}`);
          }
        } catch (err) {
          console.error(`[postController] Error deleting old image ${oldImagePath}:`, err);
          // Continue even if file delete fails
        }
      }
    } else if (req.body.removeImage === 'true') {
      // User wants to remove the image without adding a new one
      console.log(`[postController] Removing image from post ${id}`);
      updateData.image = null;
      
      // Delete the image file if it exists
      if (post.image) {
        const oldImagePath = path.join(__dirname, '../../', post.image);
        try {
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log(`[postController] Deleted removed image: ${oldImagePath}`);
          }
        } catch (err) {
          console.error(`[postController] Error deleting removed image ${oldImagePath}:`, err);
          // Continue even if file delete fails
        }
      }
    }
    // Otherwise, keep the existing image
    
    // Log the update data
    console.log(`[postController] Updating post ${id} with data:`, updateData);

    // Update the post
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('user');
    
    if (!updatedPost) {
      console.error(`[postController] Could not update post ${id} - not found after update check`);
      res.status(404).json({ message: 'Post not found after update' });
      return;
    }

    console.log(`[postController] Post ${id} updated successfully`);
    
    // הסרת שדות רגישים מאובייקט המשתמש
    // @ts-ignore: קריאה ל-toObject על אובייקט לא ידוע
    const userObject = updatedPost.user.toObject ? updatedPost.user.toObject() : updatedPost.user;
    if (userObject) {
      // @ts-ignore: שדות דינמיים
      delete userObject.password;
      // @ts-ignore: שדות דינמיים
      delete userObject.refreshToken;
    }
    
    // Send back the updated post with user data
    res.status(200).json({
      post: {
        ...updatedPost.toObject(),
        user: userObject
      },
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('[postController] Error updating post:', error);
    res.status(500).json({ message: 'Server error while updating post' });
  }
};

// Delete a post
export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    // שימוש ב-type assertion לגישה לאובייקט המשתמש
    const user = (req as any).user;
    const { postId } = req.params;
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    // Check if the user is the post owner
    if (post.user.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'User not authorized to delete this post' });
      return;
    }
    
    // Delete image if exists
    if (post.image) {
      const imagePath = path.join(__dirname, '../../', post.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Delete the post
    await Post.findByIdAndDelete(postId);
    
    res.status(200).json({ 
      message: 'Post deleted successfully',
      postId
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Server error while deleting post' });
  }
};
