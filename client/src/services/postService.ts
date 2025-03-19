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

  // לוג הפוסט לפני עיבוד
  console.log('[postService] Processing post data:', { 
    id: post.id || post._id, 
    image: post.image,
    imgUrl: post.imgUrl
  });

  // וידוא שיש שדה id (במקום _id אם אין id)
  if (!post.id && post._id) {
    post.id = post._id;
  }
  
  // טיפול בנתיבי תמונה
  try {
    // בדיקה אם יש לנו מידע על תמונה באחד מהשדות
    const hasImage = !!post.image;
    const hasImgUrl = !!post.imgUrl;
    const hasImageUrl = !!(post as any).imageUrl;

    // אם אין בכלל תמונה, אין צורך להמשיך
    if (!hasImage && !hasImgUrl && !hasImageUrl) {
      console.log('[postService] No image data found for post');
      return;
    }

    // איסוף כל נתיבי התמונה האפשריים
    const imagePaths = [
      post.image,
      post.imgUrl,
      (post as any).imageUrl
    ].filter(Boolean); // סינון ערכים ריקים

    console.log('[postService] Available image paths:', imagePaths);
    
    // בחירת הנתיב הטוב ביותר (עדיפות לנתיב שמתחיל ב-/uploads/)
    let bestPath = imagePaths.find(path => path && path.includes('/uploads/')) || imagePaths[0];
    
    if (bestPath) {
      // תיקון פורמט הנתיב אם צריך
      if (!bestPath.startsWith('/') && !bestPath.startsWith('http')) {
        bestPath = '/' + bestPath;
        console.log(`[postService] Fixed image path format, added leading slash: ${bestPath}`);
      }
      
      // וידוא שנתיב תקין יש בשני השדות
      post.image = bestPath;
      post.imgUrl = bestPath;
      
      console.log(`[postService] Synchronized image paths to: ${bestPath}`);
    } else {
      console.warn('[postService] Could not determine valid image path for post');
    }
  } catch (error) {
    console.error('[postService] Error processing image paths:', error);
  }
  
  // וידוא שיש אובייקט user תקין
  if (!post.user || typeof post.user !== 'object') {
    console.warn('[postService] Post has invalid or missing user data');
    post.user = { id: 'unknown', username: 'משתמש לא ידוע' };
  } else if (post.user._id && !post.user.id) {
    post.user.id = post.user._id;
  }
};

// Get all posts with pagination
export const getPosts = async (page: number = 1, limit: number = 10): Promise<ApiResponse<Post[]>> => {
  const response = await api.get(`/posts?page=${page}&limit=${limit}`);
  
  // Process the response to ensure image URLs are correctly formatted
  const responseData = response.data;
  
  // Process posts array if it exists
  if (responseData.posts && Array.isArray(responseData.posts)) {
    responseData.posts.forEach((post: any) => {
      processPostUserData(post);
    });
  } else if (responseData.data && Array.isArray(responseData.data)) {
    responseData.data.forEach((post: any) => {
      processPostUserData(post);
    });
  }
  
  return response.data;
};

// Get posts by user ID
export const getUserPosts = async (userId: string, page: number = 1, limit: number = 10, maxRetries: number = 3): Promise<ApiResponse<Post[]>> => {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      console.log(`[postService] Attempting to fetch posts for user ${userId}, page ${page}, attempt ${retries + 1}/${maxRetries}`);
      const response = await api.get(`/posts?userId=${userId}&page=${page}&limit=${limit}`);
      
      // לוג מפורט של התשובה מהשרת לדיבאג
      console.log(`[postService] Server response for user posts:`, response.data);
      
      // עיבוד התשובה מהשרת ומיפוי לפורמט המוכר למערכת
      let processedResponse: ApiResponse<Post[]>;
      
      // Handle image URLs in each post to ensure they have proper format
      const processPosts = (posts: any[]) => {
        return posts.map(post => {
          processPostUserData(post);
          return post;
        });
      };
      
      // התשובה מהשרת מכילה שדה posts
      if (response.data && Array.isArray(response.data.posts)) {
        console.log(`[postService] Successfully fetched ${response.data.posts.length} posts for user ${userId}, page ${page}`);
        
        // Process post images
        const processedPosts = processPosts(response.data.posts);
        
        processedResponse = {
          data: processedPosts,
          pagination: response.data.pagination
        };
      }
      // פורמט חלופי - אם יש שדה data
      else if (response.data && Array.isArray(response.data.data)) {
        console.log(`[postService] Successfully fetched ${response.data.data.length} posts for user ${userId} using data format`);
        
        // Process post images
        const processedPosts = processPosts(response.data.data);
        
        processedResponse = {
          ...response.data,
          data: processedPosts
        };
      } 
      // פורמט חלופי - אם התשובה היא מערך ישירות
      else if (Array.isArray(response.data)) {
        console.log(`[postService] Successfully fetched ${response.data.length} posts for user ${userId} as direct array`);
        
        // Process post images
        const processedPosts = processPosts(response.data);
        
        processedResponse = {
          data: processedPosts,
          pagination: { 
            page, 
            limit, 
            total: processedPosts.length, 
            pages: 1 
          }
        };
      } 
      else {
        console.warn(`[postService] Invalid response format for user posts:`, response.data);
        throw new Error(`Invalid response format: expected posts array but got: ${JSON.stringify(response.data)}`);
      }
      
      // לוג התשובה המעובדת לדיבאג
      console.log('[postService] Processed response for client:', processedResponse);
      
      return processedResponse;
    } catch (error: any) {
      lastError = error;
      
      // הדפס את השגיאה המלאה לדיבאג
      console.error(`[postService] Error details:`, error);
      
      // בעיות רשת או שרת, ננסה שוב
      if (!error.response || error.code === 'ECONNABORTED' || error.response?.status >= 500) {
        console.log(`[postService] Network error or server error, retrying (${retries + 1}/${maxRetries})...`);
        retries++;
        
        // המתנה לפני ניסיון נוסף
        const delay = 500 * retries;
        console.log(`[postService] Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // שגיאה אחרת, כנראה בעיה בפרמטרים
        console.error(`[postService] Error fetching posts for user ${userId}:`, error.message);
        throw error;
      }
    }
  }
  
  // אם הגענו לכאן, כל הניסיונות נכשלו
  console.error(`[postService] Failed to fetch posts for user ${userId} after ${maxRetries} retries`);
  throw lastError;
};

// Get a single post by ID with retries
export const getPostById = async (postId: string, maxRetries: number = 5): Promise<ApiResponse<Post>> => {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      console.log(`[postService] Attempting to fetch post ${postId}, attempt ${retries + 1}/${maxRetries}`);
      
      // וידוא טוקן תקין
      try {
        ensureValidToken();
      } catch (tokenError) {
        console.warn('[postService] Token validation failed:', tokenError);
        // נמשיך בכל זאת, כיוון שנרצה להציג את הפוסט גם למשתמשים לא מחוברים
      }
      
      const response = await api.get(`/posts/${postId}`);
      console.log(`[postService] Successfully fetched post ${postId} on attempt ${retries + 1}`);
      console.log('[postService] API response status:', response.status);
      console.log('[postService] Response structure:', Object.keys(response.data));
      
      // Process response to ensure image URLs are properly formatted
      const responseData = response.data;
      let processedPost = null;
      
      // Check if post data exists and fix the image path if needed
      if (responseData.post) {
        const post = responseData.post;
        
        // Process post user data to ensure username is present
        processPostUserData(post);
        processedPost = post;
        
        // Log the post details after processing
        console.log(`[postService] Post details after processing:`, { 
          id: post.id || post._id,
          content: post.content?.substring(0, 30),
          imageUrl: post.image,
          user: post.user ? {
            id: post.user.id || post.user._id,
            username: post.user.username
          } : 'No user data'
        });
      } else if (responseData.data) {
        const post = responseData.data;
        
        // Process post user data to ensure username is present
        processPostUserData(post);
        processedPost = post;
        
        // Log the post details after processing
        console.log(`[postService] Post details (from data field) after processing:`, { 
          id: post.id || post._id,
          content: post.content?.substring(0, 30),
          imageUrl: post.image,
          user: post.user ? {
            id: post.user.id || post.user._id,
            username: post.user.username
          } : 'No user data'
        });
      } else if (typeof responseData === 'object' && responseData !== null) {
        // אם התגובה היא אובייקט הפוסט ישירות (ללא שדה data או post)
        processPostUserData(responseData);
        processedPost = responseData;
        
        console.log(`[postService] Post details (direct object) after processing:`, { 
          id: responseData.id || responseData._id,
          content: responseData.content?.substring(0, 30),
          imageUrl: responseData.image,
          user: responseData.user ? {
            id: responseData.user.id || responseData.user._id,
            username: responseData.user.username
          } : 'No user data'
        });
      }
      
      // וידוא שיש לנו פוסט מעובד ותקין
      if (!processedPost) {
        console.error('[postService] No valid post found in response:', responseData);
        throw new Error('No valid post data in response');
      }
      
      // יצירת אובייקט תשובה אחיד
      return {
        data: processedPost,
        message: 'Post fetched successfully'
      };
    } catch (error: any) {
      lastError = error;
      
      // אם הבעיה היא שהפוסט לא נמצא או תקלת רשת, ננסה שוב
      if (error.response?.status === 404 || error.code === 'ECONNABORTED' || !error.response) {
        console.log(`[postService] Post not found or network error, retrying (${retries + 1}/${maxRetries})...`);
        retries++;
        
        // המתנה לפני ניסיון נוסף (500ms * מספר הניסיון)
        const delay = 500 * retries;
        console.log(`[postService] Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // אם הבעיה אינה 404 או תקלת רשת, נזרוק את השגיאה מיד
        console.error(`[postService] Error fetching post ${postId}:`, error);
        throw error;
      }
    }
  }
  
  // אם הגענו לכאן, כל הניסיונות נכשלו
  console.error(`[postService] Failed to fetch post ${postId} after ${maxRetries} retries`);
  throw lastError;
};

// פונקציה ליצירת פוסט חדש (עם תמונה או בלי)
export const createPost = async (formData: FormData): Promise<Post> => {
  try {
    console.log('[postService] שולח בקשה ליצירת פוסט חדש');
    
    // הדפסת תוכן ה-FormData לדיבאג
    if (process.env.NODE_ENV !== 'production') {
      console.log('[postService] תוכן ה-FormData:');
      for (const pair of formData.entries()) {
      if (pair[0] === 'image' && pair[1] instanceof File) {
          console.log(`[postService] ${pair[0]}: קובץ בשם ${(pair[1] as File).name}, גודל: ${(pair[1] as File).size} בייטים`);
        } else {
          console.log(`[postService] ${pair[0]}: ${pair[1]}`);
        }
      }
    }
    
        const response = await api.post('/posts', formData, { 
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    
    console.log('[postService] פוסט נוצר בהצלחה:', response.data);
        return response.data;
  } catch (error) {
    console.error('[postService] שגיאה ביצירת פוסט:', error);
    throw new Error('שגיאה ביצירת פוסט: ' + 
      (error instanceof Error ? error.message : 'בעיה לא ידועה'));
  }
};

// פונקציה לעדכון פוסט קיים (עם תמונה או בלי)
export const updatePost = async (postId: string, formData: FormData): Promise<Post> => {
  try {
    console.log(`[postService] שולח בקשה לעדכון פוסט ${postId}`);
    
    // הדפסת תוכן ה-FormData לדיבאג
    if (process.env.NODE_ENV !== 'production') {
      console.log('[postService] תוכן ה-FormData:');
      for (const pair of formData.entries()) {
        if (pair[0] === 'image' && pair[1] instanceof File) {
          console.log(`[postService] ${pair[0]}: קובץ בשם ${(pair[1] as File).name}, גודל: ${(pair[1] as File).size} בייטים`);
        } else {
          console.log(`[postService] ${pair[0]}: ${pair[1]}`);
        }
      }
    }
    
    const response = await api.put(`/posts/${postId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    
    console.log('[postService] פוסט עודכן בהצלחה:', response.data);
    return response.data;
  } catch (error) {
    console.error('[postService] שגיאה בעדכון פוסט:', error);
    throw new Error('שגיאה בעדכון פוסט: ' + 
      (error instanceof Error ? error.message : 'בעיה לא ידועה'));
  }
};

// Delete a post
export const deletePost = async (postId: string): Promise<ApiResponse<null>> => {
  if (!ensureValidToken()) {
    throw new Error('No valid access token available');
  }
  
  try {
    console.log(`[postService] Deleting post ${postId}`);
    const response = await api.delete(`/posts/${postId}`);
    console.log(`[postService] Post ${postId} deleted successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`[postService] Error deleting post ${postId}:`, error);
    throw error;
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

/**
 * מפעיל את הפונקציה בשרת לתיקון נתיבי תמונות של פוסטים
 */
export const fixPostImages = async (): Promise<{
  total: number;
  fixed: number;
  failed: number;
  postIds: string[];
}> => {
  try {
    console.log('[postService] מתחיל תיקון נתיבי תמונות בפוסטים');
    const response = await api.post('/posts/fix-images');
    console.log('[postService] תוצאות תיקון נתיבי תמונות:', response.data);
    return response.data;
  } catch (error) {
    console.error('[postService] שגיאה בתיקון נתיבי תמונות:', error);
    throw error;
  }
}; 