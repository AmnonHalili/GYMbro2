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
  // יצירת תיקיית לוג אם לא קיימת
  const logPath = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
  }
  
  // פונקציית יומן שכותבת גם לקונסול וגם לקובץ
  const logFile = path.join(logPath, 'createPost.log');
  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(message);
  };
  
  log('==== CREATE POST START ====');
  try {
    // שימוש ב-type assertion לגישה לאובייקט המשתמש
    const user = (req as any).user;
    
    if (!user) {
      log('==== CREATE POST FAILED: No authenticated user ====');
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    const { content } = req.body;
    
    if (!content) {
      log('==== CREATE POST FAILED: Missing content ====');
      res.status(400).json({ message: 'Content is required' });
      return;
    }
    
    // לוג מפורט יותר של הבקשה והקובץ שהתקבל
    log(`[postController] Create post request received from user: ${user._id}`);
    log(`[postController] Content length: ${content.length}`);
    log(`[postController] File attached: ${req.file ? 'Yes' : 'No'}`);
    log(`[postController] Request fileData: ${req.fileData ? JSON.stringify(req.fileData) : 'None'}`);
    
    if (req.file) {
      log('[postController] File details:');
      log(`  - Filename: ${req.file.filename}`);
      log(`  - Original name: ${req.file.originalname}`);
      log(`  - Path: ${req.file.path}`);
      log(`  - Size: ${req.file.size} bytes`);
      log(`  - MIME type: ${req.file.mimetype}`);
      log(`  - Public path: ${req.file.publicPath || '(not set)'}`);
    }
    
    // בדיקה אם יש קובץ ואם הוא תקין
    let imagePath = null;
    
    // קודם כל, בדוק אם יש לנו מידע על תמונה מה-middleware במיקום החלופי
    if (req.fileData && req.fileData.image) {
      log(`[postController] Found fileData.image: ${req.fileData.image}`);
      imagePath = req.fileData.image;
    }
    // אחרת, אם יש קובץ רגיל שהועלה
    else if (req.file) {
      // שימוש בנתיב הציבורי שנקבע במידלוור, או בניית הנתיב לפי המבנה הסטנדרטי
      imagePath = req.file.publicPath || `/uploads/posts/${req.file.filename}`;
      log(`[postController] Image path set to: ${imagePath}`);
      
      // וידוא שהנתיב תמיד מתחיל ב-/uploads/
      if (!imagePath.startsWith('/uploads/')) {
        imagePath = `/uploads/posts/${path.basename(imagePath)}`;
        log(`[postController] Corrected image path to: ${imagePath}`);
      }
      
      // בדיקה נוספת שהקובץ אכן קיים בדיסק ובעל גודל > 0
      let fullPath = '';
      
      if (path.isAbsolute(req.file.path)) {
        fullPath = req.file.path;
      } else {
        fullPath = path.resolve(__dirname, '../../', imagePath.replace(/^\//, ''));
      }
      
      log(`[postController] Validating image at full path: ${fullPath}`);
      log(`[postController] Checking: File exists? ${fs.existsSync(fullPath)}`);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        log(`[postController] File stats: size = ${stats.size} bytes, created = ${stats.birthtime}`);
        
        if (stats.size === 0) {
          log('[postController] ERROR: File exists but has 0 bytes');
          imagePath = null; // נוותר על התמונה אם הקובץ ריק
          res.status(400).json({ message: 'התמונה שהועלתה ריקה. נא לנסות שוב.' });
          return;
        }
      } else {
        log(`[postController] ERROR: File does not exist on disk: ${fullPath}`);
        imagePath = null; // נוותר על התמונה אם הקובץ לא קיים
        res.status(400).json({ message: 'שגיאה בשמירת התמונה. הקובץ לא נשמר בשרת.' });
        return;
      }
    }
    
    log(`[postController] Final image path for database: ${imagePath}`);
    
    // תיקון: שימוש ב-imagePath רק אם הוא לא null
    const newPost = new Post({
      content,
      user: user._id,
      image: imagePath
    });
    
    log(`[postController] Post object created: ${JSON.stringify({
      content: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
      user: user._id,
      image: imagePath
    })}`);
    
    log('[postController] Saving post to database...');
    await newPost.save();
    log(`[postController] Post saved successfully, ID: ${newPost._id}`);
    
    // Populate user data for response
    log('[postController] Populating user data for response');
    await newPost.populate('user', 'username profilePicture');
    
    // לוג נוסף להצלחת היצירה
    log(`[postController] Post created successfully: ${JSON.stringify({
      id: newPost._id,
      content: newPost.content.substring(0, 30) + (newPost.content.length > 30 ? '...' : ''),
      imagePath: newPost.image,
      userId: (newPost.user as IUser)._id
    })}`);
    
    log('==== CREATE POST SUCCESS ====');
    
    res.status(201).json({
      message: 'Post created successfully',
      post: newPost
    });
  } catch (error) {
    log(`[postController] Error creating post: ${error}`);
    log('==== CREATE POST FAILED ====');
    res.status(500).json({ message: 'Server error while creating post' });
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
