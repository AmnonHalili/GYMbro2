import api from './api';
import { User } from '../types';

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