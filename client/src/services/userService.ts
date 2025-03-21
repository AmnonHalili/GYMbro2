import api from './api';
import { User, ApiResponse } from '../types';

// פונקציית עזר לבדיקה ולחידוש טוקן לפני פעולות חשובות
const ensureValidToken = (): boolean => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.error('[userService] No access token found in localStorage');
    throw new Error('אתה לא מחובר. אנא התחבר כדי להמשיך.');
  }
  
  // בדיקה בסיסית שהטוקן הוא לפחות באורך סביר
  if (token.length < 10) {
    console.error('[userService] Invalid token format (too short)');
    localStorage.removeItem('accessToken'); // מחיקת טוקן לא תקין
    throw new Error('טוקן אימות לא תקין. אנא התחבר מחדש.');
  }
  
  return true;
};

// Get user by username
export const getUserByUsername = async (username: string): Promise<User> => {
  const response = await api.get(`/users/username/${username}`);
  return response.data;
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User> => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

// Update user profile
export const updateProfile = async (formData: FormData): Promise<{
  user: User;
  message: string;
}> => {
  console.log('שולח בקשת עדכון פרופיל לשרת...');
  
  // לוג של תוכן הפורם-דאטה לצורך דיבוג
  const formDataEntries = Array.from(formData.entries());
  formDataEntries.forEach(([key, value]) => {
    if (value instanceof File) {
      console.log(`[FormData] ${key}: File - ${value.name} (${value.type})`);
    } else {
      console.log(`[FormData] ${key}: ${value}`);
    }
  });
  
  const response = await api.put('/users/profile', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  console.log('תשובה מהשרת לעדכון פרופיל:', response.data);

  // וידוא שהתשובה מכילה את פרטי המשתמש המעודכנים
  if (!response.data.user) {
    console.warn('תשובת השרת לעדכון פרופיל לא מכילה נתוני משתמש מעודכנים', response.data);
  }
  
  // וידוא שאם יש סימון להסרת תמונת פרופיל, זה משתקף בתוצאה
  if (formData.get('removeProfilePicture') === 'true' && response.data.user) {
    response.data.user.profilePicture = null;
    console.log('הוסרה תמונת פרופיל - עדכון תגובת השרת בהתאם');
  }

  return response.data;
};

// Update profile picture
export const updateProfilePicture = async (formData: FormData): Promise<{
  user: User;
  profilePicture: string;
  message: string;
}> => {
  console.log('שולח בקשת עדכון תמונת פרופיל לשרת...');
  const response = await api.put('/users/profile-picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  console.log('תשובה מהשרת לעדכון תמונת פרופיל:', response.data);

  // וידוא שהתשובה מכילה את פרטי המשתמש המעודכנים
  if (!response.data.user) {
    console.warn('תשובת השרת לעדכון תמונת פרופיל לא מכילה נתוני משתמש מעודכנים', response.data);

    // יצירת אובייקט משתמש עם נתוני תמונת הפרופיל המעודכנת אם חסר
    if (!response.data.user && response.data.profilePicture) {
      response.data.user = {
        ...response.data,
        profilePicture: response.data.profilePicture
      };
    }
  }

  return response.data;
}; 