import api from './api';
import { LoginCredentials, RegisterCredentials, User } from '../types';

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// פונקציית עזר לבדיקת תקינות התשובה מהשרת
const validateAuthResponse = (response: any): AuthResponse => {
  if (!response) {
    throw new Error('Empty response received from server');
  }
  
  if (!response.user) {
    throw new Error('Response missing user data');
  }
  
  if (!response.accessToken) {
    throw new Error('Response missing access token');
  }
  
  // refreshToken אינו הכרחי
  return {
    user: response.user,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken || ''  // אם אין refreshToken, משתמשים במחרוזת ריקה
  };
};

// כל פונקציות האימות מייצאות באותו מבנה: { user, accessToken, refreshToken }
export const authService = {
  // הרשמה
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    console.log('Registering user with credentials:', {
      email: credentials.email,
      username: credentials.username,
      passwordLength: credentials.password ? credentials.password.length : 0
    });
    
    try {
      const response = await api.post<AuthResponse>('/auth/register', credentials);
      console.log('Registration successful, received response:', {
        hasUser: !!response.data.user,
        hasAccessToken: !!response.data.accessToken,
        hasRefreshToken: !!response.data.refreshToken
      });
      
      return validateAuthResponse(response.data);
    } catch (error: any) {
      console.error('Registration error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      throw error;
    }
  },
  
  // התחברות
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('Logging in with credentials:', {
      email: credentials.email,
      passwordLength: credentials.password ? credentials.password.length : 0
    });
    
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      console.log('Login successful, received response:', {
        hasUser: !!response.data.user,
        hasAccessToken: !!response.data.accessToken,
        hasRefreshToken: !!response.data.refreshToken,
        userId: response.data.user?.id
      });
      
      return validateAuthResponse(response.data);
    } catch (error: any) {
      console.error('Login error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      throw error;
    }
  },
  
  // התחברות באמצעות Google
  async googleLogin(googleToken: string): Promise<AuthResponse> {
    console.log('Attempting Google login with token length:', googleToken ? googleToken.length : 0);
    
    try {
      // שליחת הטוקן בלבד לשרת - השרת יפענח את המידע מהטוקן
      const response = await api.post<AuthResponse>('/auth/google', { token: googleToken });
      
      console.log('Google login successful, received response:', {
        hasUser: !!response.data.user,
        hasAccessToken: !!response.data.accessToken,
        hasRefreshToken: !!response.data.refreshToken,
        userId: response.data.user?.id
      });
      
      return validateAuthResponse(response.data);
    } catch (error: any) {
      console.error('Google login error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      throw error;
    }
  },
  
  // קבלת נתוני המשתמש עם הטוקן הנוכחי
  async getCurrentUser(): Promise<User> {
    console.log('Getting current user with token');
    try {
      const response = await api.get<{ user: User }>('/users/me');
      
      if (!response.data.user) {
        throw new Error('Response missing user data');
      }
      
      console.log('Current user fetched successfully:', {
        userId: response.data.user.id,
        username: response.data.user.username
      });
      
      return response.data.user;
    } catch (error: any) {
      console.error('Error getting current user:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      throw error;
    }
  },
  
  // רענון טוקן
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    console.log('Refreshing token');
    try {
      const response = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh-token',
        { refreshToken }
      );
      
      if (!response.data.accessToken) {
        throw new Error('Response missing access token');
      }
      
      console.log('Token refreshed successfully');
      return response.data;
    } catch (error: any) {
      console.error('Error refreshing token:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      throw error;
    }
  },
  
  // התנתקות
  logout(): void {
    console.log('Logging out');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};