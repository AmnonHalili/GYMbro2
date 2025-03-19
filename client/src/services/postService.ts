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

// Process post data to consistent format
export const processPostData = (post: any): void => {
  if (!post) return;
  
  // בדיקה וטיפול בשדה התמונה
  if (post.image) {
    // וידוא שיש http או התחלה עם / בנתיב התמונה
    if (!post.image.startsWith('http') && !post.image.startsWith('/')) {
      console.log(`[postService] Fixing image path, adding missing prefix: ${post.image}`);
      post.image = `/${post.image}`;
    }
    
    // הוספת URL מלא עבור תצוגת התמונה
    if (!post.imageUrl) {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      post.imageUrl = post.image.startsWith('http') 
        ? post.image 
        : `${baseUrl}${post.image}`;
      console.log(`[postService] Added imageUrl: ${post.imageUrl}`);
    }
  } else {
    // במקרה שאין תמונה, וודא שהשדות ריקים
    post.image = null;
    post.imageUrl = null;
    console.log(`[postService] Post has no image: ${post.id}`);
  }
  
  // Process user data
  processPostUserData(post);
};

// Get all posts with pagination
export const getPosts = async (page: number = 1, limit: number = 10): Promise<ApiResponse<Post[]>> => {
  if (!ensureValidToken()) {
    throw new Error('No valid access token available');
  }
  
  try {
    // console.log(`[postService] Getting posts page ${page}, limit ${limit}`);
    const response = await api.get(`/posts?page=${page}&limit=${limit}`);
    const responseData = response.data;
    
    // Process post data
    if (responseData.posts && Array.isArray(responseData.posts)) {
      console.log(`[postService] Processing ${responseData.posts.length} posts`);
      
      // עיבוד מקיף של הפוסטים - כולל טיפול בתמונות
      responseData.posts.forEach((post: any) => {
        // בדיקה וטיפול בתמונות - וידוא פורמט אחיד
        if (post.image) {
          // הוספת / בהתחלה אם חסר
          if (!post.image.startsWith('/') && !post.image.startsWith('http')) {
            post.image = `/${post.image}`;
          }
          
          // הוספת URL מלא לתמונה
          if (!post.imageUrl) {
            const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            post.imageUrl = post.image.startsWith('http') 
              ? post.image 
              : `${baseUrl}${post.image}`;
          }
        }
        
        // עיבוד שאר הנתונים של הפוסט
        processPostData(post);
      });
    } else if (responseData.data && Array.isArray(responseData.data)) {
      console.log(`[postService] Processing ${responseData.data.length} posts (from data field)`);
      responseData.data.forEach((post: any) => {
        processPostData(post);
      });
    }
    
    return {
      data: responseData.posts || responseData.data || [],
      pagination: {
        total: responseData.totalPosts || 0,
        page: responseData.currentPage || page,
        limit: limit,
        pages: responseData.totalPages || 1
      },
      message: 'Posts fetched successfully'
    };
  } catch (error: any) {
    console.error('[postService] Error fetching posts:', error);
    throw new Error(error.response?.data?.message || error.message || 'Error fetching posts');
  }
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
          processPostData(post);
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

// Get post by ID
export const getPostById = async (postId: string, maxRetries: number = 5): Promise<ApiResponse<Post>> => {
  if (!ensureValidToken()) {
    throw new Error('No valid access token available');
  }
  
  console.log(`[postService] Attempting to fetch post ${postId}, attempt 1/${maxRetries}`);
  
  let retries = 0;
  let lastError: any = null;
  
  while (retries < maxRetries) {
    try {
      const response = await api.get(`/posts/${postId}`);
      
      console.log(`[postService] Successfully fetched post ${postId} on attempt ${retries + 1}`);
      console.log(`[postService] API response status: ${response.status}`);
      
      // בדיקת המבנה של התשובה
      const responseKeys = Object.keys(response.data);
      console.log(`[postService] Response structure:`, responseKeys);
      
      // הוצאת הפוסט מהתשובה
      const post = response.data.post;
      
      // בדיקה וטיפול בשדה התמונה
      if (post.image) {
        // וידוא שמדובר בנתיב תקין (מתחיל ב-/ או http)
        if (!post.image.startsWith('http') && !post.image.startsWith('/')) {
          console.log(`[postService] Fixing image path in post ${postId}, adding missing prefix: ${post.image}`);
          post.image = `/${post.image}`;
        }
        
        // הוספת URL מלא עבור תצוגת התמונה אם לא קיים
        if (!post.imageUrl) {
          const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
          post.imageUrl = post.image.startsWith('http') 
            ? post.image 
            : `${baseUrl}${post.image}`;
          console.log(`[postService] Added imageUrl to post ${postId}: ${post.imageUrl}`);
        }
      } else {
        console.log(`[postService] Post has no image: ${postId}`);
        post.image = null;
        post.imageUrl = null;
      }
      
      // עיבוד שאר הנתונים של הפוסט
      processPostData(post);
      
      console.log(`[postService] Post details after processing:`, {
        id: post.id || post._id,
        content: post.content,
        imageUrl: post.imageUrl,
        user: post.user ? {
          id: post.user.id || post.user._id,
          username: post.user.username
        } : null
      });
      
      return {
        data: post,
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

// Create a new post
export const createPost = async (formData: FormData, maxRetries: number = 3): Promise<any> => {
  console.log('[postService] Starting post creation with valid token');
  
  // Log FormData content for debugging
  console.log('[postService] FormData content check:');
  Array.from(formData.entries()).forEach(([key, value]) => {
    if (key === 'content') {
      console.log('[postService] content:', value);
    } else if (key === 'image' && value instanceof File) {
      console.log('[postService] image:', value.name, 'Size:', value.size, 'bytes, Type:', value.type, 'Last Modified:', new Date(value.lastModified));
    } else if (key === 'userId') {
      console.log('[postService] userId:', value);
    }
  });
  
  // Validate image file if present
  const imageFile = formData.get('image') as File;
  if (imageFile) {
    console.log('[postService] Validating image file:', imageFile.name);
    
    // Check file size
    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error('Image file is too large. Maximum size is 5MB.');
    }
    
    // Check file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(imageFile.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }
    
    // Create a clone of the file for validation
    try {
      const fileClone = new File([imageFile], imageFile.name, {
        type: imageFile.type,
        lastModified: imageFile.lastModified
      });
      console.log('[postService] Image clone successful, size:', fileClone.size, 'bytes');
    } catch (error) {
      console.error('[postService] Error cloning file:', error);
      throw new Error('Error validating image file');
    }
  }
  
  let attempt = 1;
  let lastError;
  
  while (attempt <= maxRetries) {
    console.log(`[postService] Attempting to create post, attempt ${attempt}/${maxRetries}`);
    
    try {
      // Add Authorization header
      console.log('[postService] Sending request with Authorization header');
      const response = await api.post('/posts', formData);
      
      // Log upload progress
      console.log('[postService] Upload progress: 100%');
      
      // Check response
      if (response.data) {
        console.log('[postService] Post creation successful:', response.data);
        
        // Process post data
        const post = response.data.post;
        if (!post.image && imageFile) {
          console.log('[postService] Post has no image:', post.id);
          console.log('[postService] Processed post data:', {
            id: post.id,
            imagePath: post.image,
            imageProcessed: null
          });
          console.log('[postService] WARNING: Image was sent but not saved in post');
          
          // Try to verify image was saved
          try {
            // בדיקה אם התמונה נמצאת בשרת
            // שימוש בשם הקובץ המקורי במקום בשם המלא (שכולל את timestamp)
            const filename = encodeURIComponent(imageFile.name);
            console.log(`[postService] Checking if image exists: ${filename}`);
            
            // ניסיון קודם כל עם שם המקורי
            try {
              const checkResponse = await api.get(`check-image/posts/${filename}`);
              if (checkResponse.data && checkResponse.data.exists) {
                console.log('[postService] Image exists on server:', checkResponse.data);
                post.image = checkResponse.data.path;
                return response.data;
              }
            } catch (checkError) {
              console.log(`[postService] Image not found with exact name: ${filename}`);
            }
            
            // אם לא נמצא, ננסה לבדוק את כל הקבצים בתיקייה
            try {
              const debugResponse = await api.get('debug/list-images');
              console.log('[postService] Files in uploads directory:', debugResponse.data);
              
              // חיפוש קובץ שמכיל את שם הקובץ המקורי
              if (debugResponse.data && debugResponse.data.files) {
                const matchingFile = debugResponse.data.files.find((file: any) => 
                  file.name.includes(imageFile.name.replace(/\.[^/.]+$/, "")) // שם ללא סיומת
                );
                
                if (matchingFile) {
                  console.log('[postService] Found matching file:', matchingFile);
                  post.image = matchingFile.accessibleAt;
                  return response.data;
                }
              }
            } catch (listError) {
              console.log('[postService] Error listing image files:', listError);
            }
          } catch (error) {
            console.log('[postService] Error checking image status:', error);
          }
        }
        
        // Process user data
        processPostUserData(post);
        
        return response.data;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      lastError = error;
      console.error(`[postService] Error creating post (attempt ${attempt}/${maxRetries}):`, error);
      
      // Check if we should retry
      if (attempt < maxRetries && (!error.response || error.response.status >= 500)) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      // If we're here, we've either run out of retries or got a non-retryable error
      throw new Error(error.response?.data?.message || error.message || 'Error creating post');
    }
  }
  
  // If we're here, we've run out of retries
  throw lastError || new Error('Failed to create post after multiple attempts');
};

// Update a post
export const updatePost = async (postId: string, formData: FormData): Promise<ApiResponse<Post>> => {
  if (!ensureValidToken()) {
    throw new Error('No valid access token available');
  }
  
  try {
    console.log(`[postService] Updating post ${postId}`);
    
    // בדיקת תכולת ה-FormData לפני שליחה לשרת
    try {
      console.log('[postService] FormData content for update:');
      const entries = Array.from(formData.entries());
      
      // בדיקת תכולה
      let hasImage = false;
      let hasContent = false;
      let hasRemoveImage = false;
      
      for (const pair of entries) {
        if (pair[0] === 'image' && pair[1] instanceof File) {
          hasImage = true;
          console.log(`[postService] ${pair[0]}: ${(pair[1] as File).name}, Size: ${(pair[1] as File).size} bytes, Type: ${(pair[1] as File).type}`);
          
          // בדיקה שהקובץ לא ריק
          if ((pair[1] as File).size === 0) {
            console.error('[postService] WARNING: Image file is empty (0 bytes)');
          }
        } else if (pair[0] === 'content') {
          hasContent = true;
          console.log(`[postService] ${pair[0]}: ${String(pair[1]).substring(0, 50)}...`);
        } else if (pair[0] === 'removeImage') {
          hasRemoveImage = true;
          console.log(`[postService] ${pair[0]}: ${pair[1]}`);
        } else {
          console.log(`[postService] ${pair[0]}: ${pair[1]}`);
        }
      }
      
      // הודעות אזהרה
      if (!hasContent) {
        console.warn('[postService] WARNING: FormData is missing required content field');
      }
      
      if (!hasImage && !hasRemoveImage) {
        console.warn('[postService] NOTE: FormData has no image changes');
      }
    } catch (err) {
      console.error('[postService] Error inspecting FormData:', err);
    }
    
    // לא מציינים Content-Type מפורשת - נתן ל-Axios להגדיר אותו אוטומטית
    // כולל boundary הדרוש עבור FormData
    const token = localStorage.getItem('accessToken');
    
    // לוג לפני שליחת הבקשה
    console.log(`[postService] Sending PUT request to /posts/${postId} with FormData`);
    
    const response = await api.put(`/posts/${postId}`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000 // הגדלת timeout לבקשות עם קבצים
    });
    
    console.log(`[postService] Post ${postId} updated successfully:`, response.data);
    
    // עיבוד התשובה לפני החזרה
    let processedResponse = response.data;
    
    // בדיקה האם יש פוסט בתשובה שצריך לעבד
    if (response.data && (response.data.post || response.data.data)) {
      const post = response.data.post || response.data.data;
      if (post) {
        // עיבוד נתוני הפוסט כולל תיקון נתיב התמונה
        processPostUserData(post);
        
        // לוג נוסף אחרי עיבוד
        console.log(`[postService] Post processed after update:`, {
          id: post.id || post._id,
          imageUrl: post.image
        });
        
        processedResponse = {
          data: post,
          message: response.data.message || 'Post updated successfully'
        };
      }
    }
    
    return processedResponse;
  } catch (error: any) {
    console.error(`[postService] Error updating post ${postId}:`, error);
    // יותר מידע על השגיאה
    if (error.response) {
      console.error(`[postService] Server responded with status ${error.response.status}`);
      console.error(`[postService] Response data:`, error.response.data);
      console.error(`[postService] Response headers:`, error.response.headers);
    } else if (error.request) {
      console.error(`[postService] No response received from server:`, error.request);
    } else {
      console.error(`[postService] Error setting up request:`, error.message);
    }
    throw error;
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