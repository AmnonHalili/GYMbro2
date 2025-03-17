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
  const response = await api.put('/users/me', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}; 