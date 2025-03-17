import api from './api';
import { LoginCredentials, RegisterCredentials, User, GoogleLoginCredentials } from '../types';

// Register a new user
export const register = async (credentials: RegisterCredentials): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
}> => {
  const response = await api.post('/auth/register', credentials);
  return response.data;
};

// Login user
export const login = async (credentials: LoginCredentials): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
}> => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

// Google Login
export const googleLogin = async (credentials: GoogleLoginCredentials): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
}> => {
  const response = await api.post('/auth/google', credentials);
  return response.data;
};

// Get current user
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/users/me');
  return response.data;
};

// Update user profile
export const updateProfile = async (formData: FormData): Promise<{
  user: User;
  message: string;
}> => {
  const response = await api.put('/users/me', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Logout user (client-side only)
export const logout = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('accessToken');
}; 