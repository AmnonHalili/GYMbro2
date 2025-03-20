import api, { setNavigate } from './api';
import { Post, Pagination, Comment, User, ApiResponse } from '../types';

// פונקציית עזר לבדיקה ולחידוש טוקן לפני פעולות חשובות
const ensureValidToken = (): boolean => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.error('[postService] No access token found in localStorage');
    throw new Error('אתה לא מחובר. אנא התחבר כדי להמשיך.');
  }
  
  // בדיקה בסיסית שהטוקן הוא לפחות באורך סביר
  if (token.length < 10) {
    console.error('[postService] Invalid token format (too short)');
    localStorage.removeItem('accessToken'); // מחיקת טוקן לא תקין
    throw new Error('טוקן אימות לא תקין. אנא התחבר מחדש.');
  }
  
  return true;
};

// Helper function to process post user data
const processPostUserData = (post: any): void => {
  if (!post) {
    console.error('[postService] Attempted to process null or undefined post');
    return;
  }

  // בדיקה ושיפור הטיפול בנתיב התמונה
  if (post.image) {
    console.log('[postService] Processing image path:', post.image);
    
    // אם זה URL מלא, השאר כמו שהוא
    if (post.image.startsWith('http')) {
      console.log('[postService] Image already has full URL, keeping as is:', post.image);
    }
    // אם זה נתיב יחסי
    else {
      // וידוא שהנתיב מתחיל עם / (לולאת סלאש)
      if (!post.image.startsWith('/')) {
        post.image = `/${post.image}`;
        console.log('[postService] Added leading slash to image path:', post.image);
      }
      
      // בדיקה נוספת: אם הנתיב מתחיל כבר ב-/uploads/posts, הוא תקין
      // אם לא, נוודא שיש בו את המסלול המלא
      if (!post.image.includes('/uploads/posts/')) {
        if (post.image.includes('/posts/')) {
          // אם יש /posts/ אבל חסר /uploads, נוסיף אותו
          const oldPath = post.image;
          post.image = post.image.replace('/posts/', '/uploads/posts/');
          console.log('[postService] Fixed image path from', oldPath, 'to', post.image);
        } else {
          // אם חסר המסלול הנכון לגמרי נוסיף אותו
          const oldPath = post.image;
          // מסיר / מהתחלה אם יש כדי למנוע /uploads//
          const cleanPath = post.image.startsWith('/') ? post.image.substring(1) : post.image;
          post.image = `/uploads/posts/${cleanPath}`;
          console.log('[postService] Fixed image path from', oldPath, 'to', post.image);
        }
      } else {
        console.log('[postService] Image path seems valid:', post.image);
      }
      
      // לוג סיכום: בדיקה שהנתיב תקין
      console.log('[postService] Final image path:', post.image);
      
      // בדיקה שהנתיב יוצר URL תקין
      try {
        // כדי לבדוק שהנתיב תקין, ננסה ליצור URL יחסי
        new URL(post.image, window.location.origin);
        console.log('[postService] Image URL valid: ', window.location.origin + post.image);
      } catch (error) {
        console.error('[postService] Invalid image URL:', error);
        // תיקון נתיב שגוי באופן אוטומטי
        post.image = `/uploads/posts/${post.image.split('/').pop()}`;
        console.log('[postService] Auto-corrected to:', post.image);
      }
    }
  } else {
    console.log('[postService] Post has no image:', post.id || post._id);
  }
  
  // המשך הטיפול בנתוני המשתמש כרגיל
  // Ensure user object is properly formatted
  if (post.user) {
    // Make sure user has an id (use _id if id doesn't exist)
    if (!post.user.id && post.user._id) {
      post.user.id = post.user._id;
    } else if (!post.user.id && !post.user._id) {
      // ייצור מזהה זמני אם אין מזהה כלל
      post.user.id = 'unknown-' + Math.random().toString(36).substring(2, 9);
      console.warn(`[postService] Post has user without id, created temporary id: ${post.user.id}`);
    }
    
    // Make sure username is available
    if (!post.user.username || typeof post.user.username !== 'string' || post.user.username.trim() === '') {
      console.warn(`[postService] Post has user without valid username:`, post.user);
      // Try to extract username from other fields if possible
      post.user.username = post.user.name || post.user.email || 'משתמש';
    }

    // Ensure profile picture is correctly formatted or set to null
    if (post.user.profilePicture && typeof post.user.profilePicture === 'string') {
      if (!post.user.profilePicture.startsWith('http') && !post.user.profilePicture.startsWith('/')) {
        post.user.profilePicture = `/${post.user.profilePicture}`;
      }
    } else {
      post.user.profilePicture = null;
    }
  } else {
    console.error(`[postService] Post has no user data:`, post);
    // Create a minimal user object to prevent errors
    post.user = {
      id: 'unknown-' + Math.random().toString(36).substring(2, 9),
      username: 'משתמש',
      profilePicture: null
    };
  }

  // Ensure other post fields exist to prevent UI errors
  if (typeof post.content !== 'string') {
    post.content = post.content?.toString() || '';
  }
  
  if (typeof post.likesCount !== 'number') {
    post.likesCount = parseInt(post.likesCount, 10) || 0;
  }
  
  if (typeof post.commentsCount !== 'number') {
    post.commentsCount = parseInt(post.commentsCount, 10) || 0;
  }
  
  // Make sure post has an id (use _id if id doesn't exist)
  if (!post.id && post._id) {
    post.id = post._id;
  }
};

/**
 * פונקציית עזר לעיבוד פוסט מהשרת - יוצרת URL תמונה, מטפלת ב-ID תקין וכו'
 */
export const processPostData = (post: any): Post => {
  if (!post) {
    // יצירת אובייקט ריק שמתאים לטיפוס Post במקום להחזיר null
    return {
      id: '',
      content: '',
      user: { id: '', username: '' },
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    };
  }
  
  // יוצרים אובייקט פוסט עם id מנורמל ושאר השדות
  const processedPost: Post = {
    ...post,
    id: post._id || post.id, // וידוא שאכן יש id תקין
    likesCount: typeof post.likesCount === 'number' ? post.likesCount : 0,
    commentsCount: typeof post.commentsCount === 'number' ? post.commentsCount : 0
  };
  
  // טיפול בתמונות אם קיימות
  if (post.image) {
    console.log(`[processPostData] Processing image for post ${processedPost.id}: ${post.image}`);
    
    // יצירת URL תמונה מלא
    const baseUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
    
    // בדיקה אם התמונה היא אובייקט או מחרוזת
    const imagePath = typeof post.image === 'object' && post.image.path 
      ? post.image.path 
      : post.image;
    
    processedPost.imageUrl = `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
    console.log(`[processPostData] Set image URL to: ${processedPost.imageUrl}`);
    
    // הוספת נתיב מלא לתמונה עבור גישה ישירה
    processedPost.imageFullPath = `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
  } else {
    console.log(`[processPostData] Post has no image: ${processedPost.id}`);
  }
  
  return processedPost;
};

// Helper function to process post image paths
const processPostImage = (post: any): void => {
  if (!post) {
    console.error('ניסיון לעבד פוסט ריק');
    return;
  }

  // וידוא שיש שדה id (במקום _id אם אין id)
  if (!post.id && post._id) {
    post.id = post._id;
  }
  
  // טיפול בנתיבי תמונה
  if (post.image) {
    // טיפול במקרה שהתמונה היא אובייקט
    let imagePath: string;
    if (typeof post.image === 'object' && post.image.path) {
      imagePath = post.image.path;
      console.log(`התמונה היא אובייקט עם שדה path: ${imagePath}`);
    } else if (typeof post.image === 'string') {
      imagePath = post.image;
    } else {
      console.error('פורמט לא תקין של תמונה:', post.image);
      return;
    }
    
    // אם הנתיב לא מתחיל ב-http או /, נוסיף / בהתחלה
    if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
      imagePath = `/${imagePath}`;
      console.log(`תיקון נתיב תמונה: ${imagePath}`);
    }
    
    // הוספת שדה imageUrl עם URL מלא של התמונה
    const baseUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
    post.imageUrl = imagePath.startsWith('http') 
      ? imagePath 
      : `${baseUrl}${imagePath}`;
    console.log(`[processPostImage] Set image URL to: ${post.imageUrl}`);
    
    // הוספת שדה imageFullPath עם URL מלא של התמונה
    post.imageFullPath = post.imageUrl;
    console.log(`[processPostImage] Set image full path to: ${post.imageFullPath}`);
  }
  
  // וידוא שיש אובייקט user תקין
  if (!post.user || typeof post.user !== 'object') {
    console.warn('פוסט חסר נתוני משתמש');
    post.user = { id: 'unknown', username: 'משתמש לא ידוע' };
  } else if (post.user._id && !post.user.id) {
    post.user.id = post.user._id;
  }
};

// קבלת כל הפוסטים עם דפדוף
export const getPosts = async (page: number = 1, limit: number = 10): Promise<{
  posts: Post[];
  pagination: Pagination;
}> => {
  try {
    const response = await api.get(`/posts?page=${page}&limit=${limit}`);
    
    // עיבוד התשובה ועדכון פורמט התמונה
    if (response.data.posts && Array.isArray(response.data.posts)) {
      response.data.posts.forEach((post: any) => {
        processPostData(post);
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return { posts: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 } };
  }
};

// קבלת פוסטים לפי משתמש
export const getUserPosts = async (userId: string, page: number = 1, limit: number = 10): Promise<{
  posts: Post[];
  pagination: Pagination;
}> => {
  try {
    const response = await api.get(`/posts/user/${userId}?page=${page}&limit=${limit}`);
    
    // עיבוד התמונות בכל פוסט
    if (response.data.posts && Array.isArray(response.data.posts)) {
      response.data.posts.forEach((post: any) => {
        processPostImage(post);
      });
    }
    
    return response.data;
  } catch (error) {
    console.error(`שגיאה בטעינת פוסטים של משתמש ${userId}:`, error);
        throw error;
  }
};

// קבלת פוסט בודד לפי מזהה
export const getPostById = async (postId: string): Promise<Post> => {
    try {
      const response = await api.get(`/posts/${postId}`);
      
    if (response.data) {
      // עיבוד נתיבי תמונה בפוסט
      const post = response.data.post || response.data;
      processPostData(post);
      return post;
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching post ${postId}:`, error);
    throw error;
  }
};

// יצירת פוסט חדש (עם תמונה אופציונלית)
export const createPost = async (content: string | FormData, image?: File): Promise<Post> => {
  try {
    let response;
    
    if (content instanceof FormData) {
      // אם התוכן הוא כבר FormData, השתמש בו ישירות
      response = await api.post('/posts', content, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      // אחרת, צור FormData חדש
      const formData = new FormData();
      formData.append('content', content);
      
      if (image) {
        formData.append('image', image);
      }
      
      response = await api.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    
    // עדכון נתיב התמונה אם קיים
    if (response.data && response.data.post) {
      processPostData(response.data.post);
      return response.data.post;
    } else if (response.data) {
      processPostData(response.data);
                  return response.data;
                }
        
        return response.data;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

// עדכון פוסט קיים
export const updatePost = async (postId: string, content: string | FormData, image?: File): Promise<Post> => {
  try {
    let response;
    
    if (content instanceof FormData) {
      // אם התוכן הוא כבר FormData, השתמש בו ישירות
      response = await api.put(`/posts/${postId}`, content, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
        } else {
      // אחרת, צור FormData חדש
      const formData = new FormData();
      formData.append('content', content);
      
      if (image) {
        formData.append('image', image);
      }
      
      response = await api.put(`/posts/${postId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    
    // עדכון נתיב התמונה אם קיים
    if (response.data && response.data.post) {
      processPostData(response.data.post);
      return response.data.post;
    } else if (response.data) {
      processPostData(response.data);
      return response.data;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

// מחיקת פוסט
export const deletePost = async (postId: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/posts/${postId}`);
    return response.data;
  } catch (error) {
    console.error(`שגיאה במחיקת פוסט ${postId}:`, error);
    throw error;
  }
};

// קבלת תגובות לפוסט מסוים
export const getPostComments = async (postId: string, page: number = 1, limit: number = 10): Promise<{
  comments: Comment[];
  pagination: Pagination;
}> => {
  try {
    const response = await api.get(`/posts/${postId}/comments?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error(`שגיאה בטעינת תגובות לפוסט ${postId}:`, error);
    throw error;
  }
};

// הוספת לייק לפוסט
export const likePost = async (postId: string): Promise<{ message: string; post: Post }> => {
  try {
    const response = await api.post(`/posts/${postId}/like`);
    
    // עיבוד נתיבי תמונה בפוסט
    if (response.data.post) {
      processPostImage(response.data.post);
    }
    
    return response.data;
  } catch (error) {
    console.error(`שגיאה בהוספת לייק לפוסט ${postId}:`, error);
    throw error;
  }
};

// הסרת לייק מפוסט
export const unlikePost = async (postId: string): Promise<{ message: string; post: Post }> => {
  try {
    const response = await api.delete(`/posts/${postId}/like`);
    
    // עיבוד נתיבי תמונה בפוסט
    if (response.data.post) {
      processPostImage(response.data.post);
    }
    
    return response.data;
  } catch (error) {
    console.error(`שגיאה בהסרת לייק מפוסט ${postId}:`, error);
    throw error;
  }
};

// בדיקה האם המשתמש הנוכחי לייק את הפוסט
export const hasLikedPost = async (postId: string): Promise<boolean> => {
  try {
    const response = await api.get(`/posts/${postId}/like`);
    return response.data.liked;
  } catch (error) {
    console.error(`שגיאה בבדיקת לייק לפוסט ${postId}:`, error);
    return false;
  }
};

// Get comments for a post
export const getCommentsByPost = async (
  postId: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  comments: Comment[];
  pagination: Pagination;
}> => {
  try {
    console.log(`[postService] Fetching comments for post ${postId}`);
    const response = await api.get(`/comments/post/${postId}`, {
      params: { page, limit },
    });
    console.log(`[postService] Retrieved ${response.data.comments?.length || 0} comments for post ${postId}`);
    return response.data;
  } catch (error: any) {
    console.error(`[postService] Error fetching comments for post ${postId}:`, error);
    throw error;
  }
};

// Create a comment on a post
export const createComment = async (
  postId: string,
  content: string
): Promise<{
  comment?: Comment;
  message?: string;
  commentsCount?: number;
}> => {
  try {
    // בדיקת אימות לפני קריאה לשרת
    ensureValidToken();
    
    console.log(`[postService] Creating comment on post ${postId}`);
    const token = localStorage.getItem('accessToken');
    
    // הוספת כותרת Authorization מפורשת לוידוא אימות תקין
    const headers: Record<string, string> = { 
      'Authorization': `Bearer ${token}`
    };
    
    const response = await api.post(`/comments/post/${postId}`, { content }, { headers });
    console.log('[postService] Comment creation response:', response.data);
    
    // טיפול בהחזרת התשובה מהשרת
    if (response.data) {
      // אם השרת מחזיר את התגובה ישירות בתור אובייקט
      if (response.data.id && response.data.content) {
        return {
          comment: {
            id: response.data.id,
            content: response.data.content,
            user: response.data.user || {},
            post: postId,
            createdAt: response.data.createdAt || new Date().toISOString()
          },
          commentsCount: response.data.commentsCount,
          message: 'Comment created successfully'
        };
      }
      // אם השרת מחזיר את התגובה בתוך שדה comment
      else if (response.data.comment) {
        return {
          ...response.data,
          commentsCount: response.data.commentsCount
        };
      }
      // אם השרת מחזיר הודעה בלבד, נחזיר אובייקט חלקי
      else if (response.data.message) {
        return {
          message: response.data.message,
          commentsCount: response.data.commentsCount
        };
      }
    }
    
    // אם אין לנו מבנה מוכר, נחזיר את התשובה כמו שהיא
    return response.data;
  } catch (error: any) {
    console.error('[postService] Error creating comment:', error);
    
    // טיפול ספציפי בשגיאות אימות
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('[postService] Authentication error in createComment');
      throw new Error('פג תוקף החיבור, אנא התחבר מחדש כדי להוסיף תגובה');
    }
    
    throw error;
  }
};

// Update a comment
export const updateComment = async (
  commentId: string,
  content: string
): Promise<{
  comment: Comment;
  postId: string;
  commentsCount: number;
  message: string;
}> => {
  if (!ensureValidToken()) {
    throw new Error('No valid access token available');
  }
  
  try {
    console.log(`[postService] Updating comment ${commentId}`);
    const response = await api.put(`/comments/${commentId}`, { content });
    console.log(`[postService] Comment ${commentId} updated successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`[postService] Error updating comment ${commentId}:`, error);
    throw error;
  }
};

// Delete a comment
export const deleteComment = async (commentId: string): Promise<{
  message: string;
  postId?: string;
  commentsCount?: number;
}> => {
  if (!ensureValidToken()) {
    throw new Error('No valid access token available');
  }
  
  try {
    console.log(`[postService] Deleting comment ${commentId}`);
    const response = await api.delete(`/comments/${commentId}`);
    console.log(`[postService] Comment ${commentId} deleted successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`[postService] Error deleting comment ${commentId}:`, error);
    throw error;
  }
};

// Toggle like on a post
export const toggleLike = async (postId: string): Promise<ApiResponse<{ liked: boolean; likesCount: number }>> => {
  try {
    // בדיקת אימות לפני קריאה לשרת
    ensureValidToken();
    
    console.log(`[postService] Toggling like on post ${postId}`);
    const token = localStorage.getItem('accessToken');
    
    // הוספת כותרת Authorization מפורשת לוידוא אימות תקין
    const headers: Record<string, string> = { 
      'Authorization': `Bearer ${token}`
    };
    
    const response = await api.post(`/likes/post/${postId}`, {}, { headers });
    
    console.log(`[postService] Like toggled on post ${postId}:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`[postService] Error toggling like on post ${postId}:`, error);
    
    // טיפול ספציפי בשגיאות אימות
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('[postService] Authentication error in toggleLike');
      throw new Error('פג תוקף החיבור, אנא התחבר מחדש כדי לסמן לייק');
    }
    
    throw error;
  }
};

// Check if user has liked a post
export const checkLikeStatus = async (postId: string): Promise<{
  liked: boolean;
  likesCount: number;
}> => {
  try {
    console.log(`[postService] Checking like status for post ${postId}`);
    const response = await api.get(`/likes/post/${postId}/status`);
    console.log(`[postService] Like status for post ${postId}:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`[postService] Error checking like status for post ${postId}:`, error);
    throw error;
  }
};

// Get users who liked a post
export const getLikesByPost = async (
  postId: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  users: User[];
  pagination: Pagination;
}> => {
  try {
    console.log(`[postService] Fetching likes for post ${postId}`);
    const response = await api.get(`/likes/post/${postId}`, {
      params: { page, limit },
    });
    console.log(`[postService] Retrieved ${response.data.users?.length || 0} likes for post ${postId}`);
    return response.data;
  } catch (error: any) {
    console.error(`[postService] Error fetching likes for post ${postId}:`, error);
    throw error;
  }
}; 