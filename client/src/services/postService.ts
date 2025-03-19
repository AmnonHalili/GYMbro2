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

// Create a new post
export const createPost = async (formData: FormData, maxRetries: number = 3): Promise<any> => {
  try {
    // בדיקת אימות לפני קריאה לשרת
    ensureValidToken();
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('אתה לא מחובר. אנא התחבר כדי ליצור פוסט חדש.');
    }
    
    let retries = 0;
    let lastError;
    
    console.log('[postService] Starting post creation with valid token');
    
    // הדפסת כל התוכן של ה-formData לדיבאג
    console.log('[postService] FormData content check:');
    const entries = Array.from(formData.entries());
    
    // בדיקת תכולה
    let hasImage = false;
    let hasContent = false;
    let imageFile: File | null = null;
    
    // שמירת העתק של האובייקט FormData המקורי למקרה של כישלון
    const originalFormData = new FormData();
    
    for (const pair of entries) {
      if (pair[0] === 'image' && pair[1] instanceof File) {
        hasImage = true;
        imageFile = pair[1] as File;
        console.log(`[postService] ${pair[0]}: ${imageFile.name}, Size: ${imageFile.size} bytes, Type: ${imageFile.type}, Last Modified: ${new Date(imageFile.lastModified).toISOString()}`);
        
        // שמירת העתק של הקובץ באובייקט הגיבוי
        originalFormData.append('image', imageFile);
        
        // בדיקה מקיפה של תקינות הקובץ
        if (imageFile.size === 0) {
          console.error('[postService] ERROR: Image file is empty (0 bytes). Removing invalid file.');
          // הסרת הקובץ הלא תקין מה-FormData
          formData.delete('image');
          hasImage = false;
          throw new Error('קובץ התמונה ריק. אנא בחר קובץ תקין.');
        }
        
        if (!imageFile.type.startsWith('image/')) {
          console.error('[postService] ERROR: File is not an image type, actual type:', imageFile.type);
          formData.delete('image');
          hasImage = false;
          throw new Error('הקובץ שנבחר אינו תמונה. אנא בחר קובץ תמונה תקין (JPEG, PNG, GIF, WebP).');
        }
      } else if (pair[0] === 'content') {
        hasContent = true;
        console.log(`[postService] ${pair[0]}: ${String(pair[1]).substring(0, 50)}...`);
        originalFormData.append('content', pair[1] as string);
      } else {
        console.log(`[postService] ${pair[0]}: ${pair[1]}`);
        originalFormData.append(pair[0], pair[1] as string);
      }
    }
    
    if (!hasContent) {
      console.error('[postService] ERROR: FormData is missing required content field');
      throw new Error('תוכן הפוסט חסר. אנא הזן תוכן לפני שליחה.');
    }
    
    // וידוא שאם יש תמונה, היא תקינה
    if (hasImage && imageFile) {
      try {
        console.log(`[postService] Validating image file: ${imageFile.name}`);
        // יצירת עותק חדש של ה-FormData כדי לוודא שהתמונה תקינה
        const imageClone = new File(
          [await imageFile.arrayBuffer()], 
          imageFile.name, 
          { type: imageFile.type }
        );
        
        // וידוא שהעותק אינו ריק
        if (imageClone.size === 0) {
          console.error('[postService] ERROR: Created image clone is empty, original image may be corrupted');
          throw new Error('בעיה בקריאת קובץ התמונה. נא לבחור תמונה אחרת.');
        } else {
          console.log(`[postService] Image clone successful, size: ${imageClone.size} bytes`);
          
          // החלפת הקובץ המקורי בעותק המוודא
          formData.delete('image');
          formData.append('image', imageClone);
        }
      } catch (cloneErr) {
        console.error('[postService] Error cloning image file:', cloneErr);
        // ממשיכים עם הקובץ המקורי במקרה של שגיאה
      }
    }
    
    while (retries < maxRetries) {
      try {
        console.log(`[postService] Attempting to create post, attempt ${retries + 1}/${maxRetries}`);
        
        // הגדרת headers עבור הקריאה לשרת
        const headers: Record<string, string> = { 
          'Authorization': `Bearer ${token}`
        };
        
        console.log('[postService] Sending request with Authorization header');
        
        // שליחת הבקשה לשרת עם FormData - Axios יטפל בהגדרת Content-Type וה-boundary אוטומטית
        const response = await api.post('/posts', formData, { 
          headers,
          // הגדלת timeout עבור העלאת קבצים
          timeout: 60000,
          // הוספת onUploadProgress לקבלת מידע על התקדמות ההעלאה
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            console.log(`[postService] Upload progress: ${percentCompleted}%`);
          }
        });
        
        console.log('[postService] Post creation successful:', response.data);
        
        // קבלת הפוסט מהתשובה ועיבוד התמונה אם קיימת
        if (response.data && response.data.post) {
          const post = response.data.post;
          
          // עיבוד שדות הפוסט כדי לוודא שהכל תקין
          processPostUserData(post);
          
          // בדיקה שהתמונה הוגדרה נכון
          const imageProcessed = post.image && typeof post.image === 'string';
          
          console.log('[postService] Processed post data:', {
            id: post.id || post._id,
            imagePath: post.image,
            imageProcessed
          });
          
          // בדיקה שהתמונה אכן נשמרה
          if (hasImage && !post.image) {
            console.warn('[postService] WARNING: Image was sent but not saved in post');
            
            // ניסיון לבדוק את מצב התמונה בשרת באמצעות נקודת ה-API לבדיקת תמונות
            if (post.id && imageFile) {
              try {
                // הפרדת שם הקובץ מהנתיב המלא אם צריך
                const filename = imageFile.name.includes('/') 
                  ? imageFile.name.split('/').pop() 
                  : imageFile.name;
                
                if (filename) {
                  // בדיקה אם התמונה קיימת בשרת
                  const imageCheckResponse = await api.get(`/api/check-image/posts/${filename}`);
                  console.log('[postService] Image check response:', imageCheckResponse.data);
                  
                  if (imageCheckResponse.data && imageCheckResponse.data.exists) {
                    console.log('[postService] Image exists on server but not linked to post');
                    // עדכון הפוסט עם נתיב התמונה שמצאנו
                    await api.put(`/posts/${post.id}`, { 
                      content: post.content,
                      image: imageCheckResponse.data.path 
                    }, { headers });
                    
                    console.log('[postService] Post updated with image path');
                    post.image = imageCheckResponse.data.path;
                  }
                }
              } catch (imageCheckErr) {
                console.error('[postService] Error checking image status:', imageCheckErr);
              }
            }
          }
          
          return {
            ...response.data,
            post
          };
        }
        
        // אם הגענו לכאן, הכל הצליח אבל אין פוסט בתשובה - מחזירים את התשובה המקורית
        return response.data;
      } catch (error: any) {
        console.error(`[postService] Error creating post (attempt ${retries + 1}/${maxRetries}):`, error);
        lastError = error;
        
        // אם השגיאה היא אימות, לא ננסה שוב
        if (error.response?.status === 401) {
          console.error('[postService] Authentication error in createPost');
          throw new Error('פג תוקף החיבור. אנא התחבר מחדש ונסה שוב.');
        }
        
        // אם השגיאה היא שגיאת קלט, לא ננסה שוב
        if (error.response?.status === 400) {
          console.error('[postService] Bad request error:', error.response.data);
          throw new Error(error.response.data?.message || 'שגיאה בנתונים שהוזנו. אנא בדוק את הנתונים ונסה שוב.');
        }
        
        // בעיות רשת או שרת, ננסה שוב
        if (!error.response || error.code === 'ECONNABORTED' || error.response?.status >= 500) {
          retries++;
          console.log(`[postService] Network or server error, retrying (${retries}/${maxRetries})...`);
          
          // המתנה לפני ניסיון נוסף
          const delay = 1000 * retries;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // אם זה הניסיון האחרון, ננסה לשלוח את הגיבוי
          if (retries === maxRetries - 1 && hasImage) {
            console.log('[postService] Last retry, using backup FormData');
            formData = originalFormData;
          }
        } else {
          // שגיאה אחרת - לא ננסה שוב
          console.error('[postService] Other error, not retrying:', error.response?.data);
          throw error;
        }
      }
    }
    
    console.error(`[postService] Failed to create post after ${maxRetries} attempts`);
    throw lastError || new Error('נכשל ביצירת הפוסט לאחר מספר ניסיונות. אנא נסה שוב מאוחר יותר.');
  } catch (err: any) {
    // המרת שגיאות לפורמט אחיד
    const errorMessage = 
      err.response?.data?.message || 
      err.message || 
      'שגיאה לא ידועה ביצירת הפוסט';
    
    console.error('[postService] Create post error:', errorMessage);
    throw new Error(errorMessage);
  }
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
    
    // לא מציינים Content-Type מפורש - נתן ל-Axios להגדיר אותו אוטומטית
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