import api from './api';
import { Post, Pagination, Comment, User, ApiResponse } from '../types';

// Get all posts with pagination
export const getPosts = async (page: number = 1, limit: number = 10): Promise<ApiResponse<Post[]>> => {
  const response = await api.get(`/posts?page=${page}&limit=${limit}`);
  return response.data;
};

// Get posts by user ID
export const getUserPosts = async (userId: string, page: number = 1, limit: number = 10, maxRetries: number = 3): Promise<ApiResponse<Post[]>> => {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      console.log(`Attempting to fetch posts for user ${userId}, page ${page}, attempt ${retries + 1}/${maxRetries}`);
      const response = await api.get(`/posts?userId=${userId}&page=${page}&limit=${limit}`);
      
      // לוג מפורט של התשובה מהשרת לדיבאג
      console.log(`Server response for user posts:`, response.data);
      
      // עיבוד התשובה מהשרת ומיפוי לפורמט המוכר למערכת
      let processedResponse: ApiResponse<Post[]>;
      
      // התשובה מהשרת מכילה שדה posts
      if (response.data && Array.isArray(response.data.posts)) {
        console.log(`Successfully fetched ${response.data.posts.length} posts for user ${userId}, page ${page}`);
        
        processedResponse = {
          data: response.data.posts,
          pagination: response.data.pagination
        };
      }
      // פורמט חלופי - אם יש שדה data
      else if (response.data && Array.isArray(response.data.data)) {
        console.log(`Successfully fetched ${response.data.data.length} posts for user ${userId} using data format`);
        processedResponse = response.data;
      } 
      // פורמט חלופי - אם התשובה היא מערך ישירות
      else if (Array.isArray(response.data)) {
        console.log(`Successfully fetched ${response.data.length} posts for user ${userId} as direct array`);
        processedResponse = {
          data: response.data,
          pagination: { 
            page, 
            limit, 
            total: response.data.length, 
            pages: 1 
          }
        };
      } 
      else {
        console.warn(`Invalid response format for user posts:`, response.data);
        throw new Error(`Invalid response format: expected posts array but got: ${JSON.stringify(response.data)}`);
      }
      
      // לוג התשובה המעובדת לדיבאג
      console.log('Processed response for client:', processedResponse);
      
      return processedResponse;
    } catch (error: any) {
      lastError = error;
      
      // הדפס את השגיאה המלאה לדיבאג
      console.error(`Error details:`, error);
      
      // בעיות רשת או שרת, ננסה שוב
      if (!error.response || error.code === 'ECONNABORTED' || error.response?.status >= 500) {
        console.log(`Network error or server error, retrying (${retries + 1}/${maxRetries})...`);
        retries++;
        
        // המתנה לפני ניסיון נוסף
        const delay = 500 * retries;
        console.log(`Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // שגיאה אחרת, כנראה בעיה בפרמטרים
        console.error(`Error fetching posts for user ${userId}:`, error.message);
        throw error;
      }
    }
  }
  
  // אם הגענו לכאן, כל הניסיונות נכשלו
  console.error(`Failed to fetch posts for user ${userId} after ${maxRetries} retries`);
  throw lastError;
};

// Get a single post by ID with retries
export const getPostById = async (postId: string, maxRetries: number = 5): Promise<ApiResponse<Post>> => {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      console.log(`Attempting to fetch post ${postId}, attempt ${retries + 1}/${maxRetries}`);
      const response = await api.get(`/posts/${postId}`);
      console.log(`Successfully fetched post ${postId} on attempt ${retries + 1}`);
      return response.data;
    } catch (error: any) {
      lastError = error;
      
      // אם הבעיה היא שהפוסט לא נמצא או תקלת רשת, ננסה שוב
      if (error.response?.status === 404 || error.code === 'ECONNABORTED' || !error.response) {
        console.log(`Post not found or network error, retrying (${retries + 1}/${maxRetries})...`);
        retries++;
        
        // המתנה לפני ניסיון נוסף (500ms * מספר הניסיון)
        const delay = 500 * retries;
        console.log(`Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // אם הבעיה אינה 404 או תקלת רשת, נזרוק את השגיאה מיד
        console.error(`Error fetching post ${postId}:`, error);
        throw error;
      }
    }
  }
  
  // אם הגענו לכאן, כל הניסיונות נכשלו
  console.error(`Failed to fetch post ${postId} after ${maxRetries} retries`);
  throw lastError;
};

// Create a new post
export const createPost = async (formData: FormData): Promise<any> => {
  const response = await api.post('/posts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  // להחזיר את התשובה המלאה כדי שנוכל לבדוק היכן נמצא ה-ID
  console.log('Raw server response:', response);
  return response.data;
};

// Update a post
export const updatePost = async (postId: string, formData: FormData): Promise<ApiResponse<Post>> => {
  const response = await api.put(`/posts/${postId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Delete a post
export const deletePost = async (postId: string): Promise<ApiResponse<null>> => {
  const response = await api.delete(`/posts/${postId}`);
  return response.data;
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
  const response = await api.get(`/comments/post/${postId}`, {
    params: { page, limit },
  });
  return response.data;
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
    const response = await api.post(`/comments/post/${postId}`, { content });
    console.log('Raw comment creation response:', response);
    
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
  } catch (error) {
    console.error('Error creating comment:', error);
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
  const response = await api.put(`/comments/${commentId}`, { content });
  return response.data;
};

// Delete a comment
export const deleteComment = async (commentId: string): Promise<{
  message: string;
  postId?: string;
  commentsCount?: number;
}> => {
  const response = await api.delete(`/comments/${commentId}`);
  return response.data;
};

// Toggle like on a post
export const toggleLike = async (postId: string): Promise<ApiResponse<{ liked: boolean; likesCount: number }>> => {
  const response = await api.post(`/likes/post/${postId}`);
  console.log('Like toggle response:', response);
  return response.data;
};

// Check if user liked a post
export const checkLikeStatus = async (postId: string): Promise<{
  liked: boolean;
  likesCount: number;
}> => {
  const response = await api.get(`/likes/post/${postId}/check`);
  return response.data;
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
  const response = await api.get(`/likes/post/${postId}/users`, {
    params: { page, limit },
  });
  return response.data;
}; 