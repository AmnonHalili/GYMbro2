// User types
export interface User {
  id: string;
  _id?: string;
  username: string;
  email?: string;
  profilePicture?: string;
  googleId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface GoogleLoginCredentials {
  token: string;
  email: string;
  name: string;
  picture?: string;
  googleId: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

// Post types
export interface Post {
  id: string;
  _id?: string;
  content: string;
  image?: string;
  imgUrl?: string;
  user: User;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
  liked?: boolean;
}

export interface PostFormData {
  content: string;
  image?: File;
}

// Comment types
export interface Comment {
  id: string;
  content: string;
  user: User;
  post: string;
  createdAt: string;
  updatedAt?: string;
}

// Pagination
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// AI types
export interface WorkoutPlanRequest {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  daysPerWeek: number;
  equipment: 'none' | 'minimal' | 'home-gym' | 'gym';
  provider?: 'gemini' | 'openai';
}

export interface NutritionAdviceRequest {
  age: number;
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high';
  dietaryPreferences: 'balanced' | 'vegetarian' | 'vegan' | 'high_protein';
  healthGoals: 'lose' | 'maintain' | 'gain';
  existingConditions?: string;
  provider?: 'gemini' | 'openai';
}

export interface NutritionalValuesRequest {
  foodItems: string[];
  provider?: 'gemini' | 'openai';
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: Pagination;
  post?: Post;
  posts?: T[];
  liked?: boolean;
  likesCount?: number;
}

export interface ErrorResponse {
  message: string;
  errors?: any[];
} 