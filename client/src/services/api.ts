import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ErrorResponse } from '../types';

// הגדרה מותאמת לאובייקט התצורה של axios כדי לאפשר שדות נוספים
interface CustomRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _skipRedirect?: boolean;
}

// הגדרת הנתב שישמש להפניה ללוגין
let navigate: any = null;

// פונקציה להגדרת הנתב מקומפוננטות הראוטר
export const setNavigate = (navigateFunction: any) => {
  navigate = navigateFunction;
};

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in cross-site requests
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    
    // בדיקה מורחבת של תקינות הטוקן
    if (token && typeof token === 'string' && token.length > 10 && config.headers) {
      // וידוא שטוקן JWT תקין (מבנה של 3 חלקים מופרדים בנקודות)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.warn('Invalid JWT token format (should have 3 parts), not adding to request');
      } else {
        config.headers.Authorization = `Bearer ${token}`;
        console.log(`Adding auth token to request (masked): Bearer ${token.substring(0, 5)}...`);
      }
    } else if (token) {
      console.warn('Invalid token format found in localStorage, not adding to request');
    }
    
    // הוספת לוגים לניפוי באגים בתקשורת API
    const logData = {
      url: config.url,
      method: config.method?.toUpperCase(),
      params: config.params,
      hasData: !!config.data,
      hasAuthHeader: !!config.headers?.Authorization
    };
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, logData);
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// פונקציה מבוקרת להפניה לדף התחברות
const redirectToLogin = () => {
  console.log('Redirecting to login page');
  
  // מחיקת טוקנים
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  // אם יש לנו פונקציית ניתוב, נשתמש בה במקום ניתוב ישיר
  if (navigate) {
    console.log('Using React Router navigate for redirection');
    navigate('/login', { replace: true });
  } else {
    // גיבוי - שימוש בניתוב גלובלי רק אם אין לנו navigate
    console.log('Fallback: Using window.location for redirection');
    
    // שימוש בהפניה יחסית במקום מוחלטת כדי לשמור על הקונטקסט
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
};

// Response interceptor for handling errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // הוספת לוגים לתשובות מוצלחות
    console.log(`API Response Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data
    });
    return response;
  },
  async (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as CustomRequestConfig;
    
    // לוגים מפורטים לניפוי שגיאות
    console.error('API Error:', {
      url: originalRequest.url,
      method: originalRequest.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // טיפול בבעיות חיבור - אין תגובה מהשרת
    if (!error.response) {
      console.error('Network error - no response from server:', error.message);
      return Promise.reject(error);
    }
    
    // AI API endpoints - לא להפנות ללוגין עבור שגיאות בקריאות ל-AI
    const isAiEndpoint = originalRequest.url?.includes('/ai/');
    if (isAiEndpoint && (error.response?.status === 401 || error.response?.status === 403)) {
      console.log('AI endpoint authentication failed, returning error without redirect');
      return Promise.reject(error);
    }
    
    // שיפור טיפול באימות שנכשל (401, 403)
    if (error.response?.status === 401 || error.response?.status === 403) {
      // בדיקה אם זה ניסיון לגשת לנתיב הרשמה או ההתחברות - לא ננסה לרענן
      const isAuthPath = originalRequest.url?.includes('/auth/');
      if (isAuthPath) {
        console.log('Auth endpoint failed, not attempting token refresh');
        return Promise.reject(error);
      }
      
      // אם זה ניסיון חוזר, או אם זה נתיב מדף שלא צריך להפנות ללוגין
      if (originalRequest._retry || originalRequest._skipRedirect) {
        console.warn('Retry already attempted or redirect skipped, returning error');
        return Promise.reject(error);
      }
      
      // נסיון לרענן טוקן
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.length < 1) {
          console.warn('No valid refresh token available');
          // בדיקה אם להפנות ללוגין במקרה זה
          if (!originalRequest._skipRedirect) {
            console.log('Clearing tokens and redirecting to login');
            redirectToLogin();
          }
          return Promise.reject(error);
        }
        
        console.log('Attempting to refresh token');
        // Call refresh token endpoint
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        );
        
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        if (!accessToken) {
          throw new Error('Refresh token response missing access token');
        }
        
        console.log('Token refreshed successfully');
        
        // Update tokens in localStorage
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        // Update Authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token error:', refreshError);
        
        // נכשל רענון טוקן - בדיקה אם להפנות ללוגין או לא
        if (!originalRequest._skipRedirect) {
          console.warn('Refresh failed, redirecting to login');
          redirectToLogin();
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// פונקציה שימושית לקריאה לשרת עם אפשרות למנוע ניתוק אוטומטי
export const callApiWithoutRedirect = async <T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: any
): Promise<T> => {
  const config: CustomRequestConfig = {
    url,
    method,
    data,
    _skipRedirect: true // סימון כדי למנוע ניתוק אוטומטי
  };
  
  const response = await api.request<T>(config);
  return response.data;
};

/**
 * פונקציה שמנרמלת נתיבי תמונה לפורמט אחיד
 * עם שימוש בנתיב API ייעודי להחזרת תמונות
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  // אם אין נתיב תמונה, להחזיר ריק
  if (!imagePath) {
    console.log('[api] getImageUrl called with null or empty path');
    return '';
  }

  // לוג מצב התחלתי
  console.log(`[api] Processing image path: "${imagePath}"`);

  // אם כבר URL מלא, להחזיר כמו שהוא
  if (imagePath.startsWith('http')) {
    console.log(`[api] Using existing full URL: ${imagePath}`);
    return imagePath;
  }
  
  // ניקוי ובדיקת נתיב התמונה
  let cleanPath = imagePath.trim();
  
  // טיפול בתווים מיוחדים
  cleanPath = cleanPath.replace(/\\/g, '/');
  
  // וידוא שהנתיב מתחיל עם סלאש
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
    console.log(`[api] Added leading slash: "${cleanPath}"`);
  }

  // טיפול בנתיבי uploads
  if (cleanPath.includes('/uploads/')) {
    // בדיקה שהנתיב תקין - אמור להיות בפורמט /uploads/{TYPE}/{FILENAME}
    const pathParts = cleanPath.split('/uploads/');
    if (pathParts.length > 1) {
      // הסרת פרמטרים לא רצויים מהנתיב
      const filePath = pathParts[1].split('?')[0];
      
      // בדיקה האם חסר חלק מהנתיב (למשל אם יש uploads/file.jpg במקום uploads/posts/file.jpg)
      if (!filePath.includes('/') && (
          !filePath.startsWith('posts/') && 
          !filePath.startsWith('profile/')
      )) {
        // ננסה לזהות את סוג הקובץ לפי שם הקובץ
        const fixedPath = filePath.startsWith('post-') 
          ? `/uploads/posts/${filePath}` 
          : filePath.startsWith('profile-') 
            ? `/uploads/profile/${filePath}` 
            : `/uploads/posts/${filePath}`;
            
        console.log(`[api] Fixed uploads path structure: "${fixedPath}"`);
        cleanPath = fixedPath;
      }
    }
  }

  // בניית URL שלם
  try {
    const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
    const fullUrl = new URL(cleanPath, baseUrl);
    console.log(`[api] Built full URL: ${fullUrl.toString()}`);
    return fullUrl.toString();
  } catch (error) {
    console.error(`[api] Error building URL: ${error}`);
    // החזרת נתיב יחסי כמוצא אחרון
    return cleanPath;
  }
}

/**
 * מפעיל את תהליך תיקון קבצי התמונות הריקים
 */
export const fixEmptyImages = async (): Promise<{
  fixed: number;
  failed: number;
  errors: string[];
}> => {
  try {
    console.log('Requesting server to fix empty image files');
    const response = await api.post('/fix-empty-images');
    return response.data;
  } catch (error) {
    console.error('Error fixing empty images:', error);
    return {
      fixed: 0,
      failed: 0,
      errors: [String(error)]
    };
  }
};

export default api; 