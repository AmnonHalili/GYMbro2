import React, { createContext, useReducer, useContext, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { User, LoginCredentials, RegisterCredentials } from '../types';
import api from '../services/api';

// Types
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface AuthContextProps {
  authState: AuthState;
  loadUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  googleLogin: (googleToken: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshToken: () => Promise<boolean>;
}

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
};

// Create context
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Action types
type AuthAction =
  | { type: 'USER_LOADED'; payload: User }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAIL'; payload: string }
  | { type: 'REGISTER_SUCCESS'; payload: User }
  | { type: 'REGISTER_FAIL'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'UPDATE_USER_INFO'; payload: User };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
      };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
        error: null,
      };
    case 'AUTH_ERROR':
    case 'LOGIN_FAIL':
    case 'REGISTER_FAIL':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER_INFO':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, dispatch] = useReducer(authReducer, initialState);

  // בדיקה ראשונית אם יש טוקן בלוקל סטורג' בעת טעינת האפליקציה
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      console.log('Initial auth check:', { 
        hasAccessToken: !!accessToken, 
        accessTokenLength: accessToken ? accessToken.length : 0,
        hasRefreshToken: !!refreshToken,
        refreshTokenLength: refreshToken ? refreshToken.length : 0
      });
      
      if (!accessToken) {
        console.log('No access token found in localStorage - normal for new or logged out users');
        dispatch({ 
          type: 'AUTH_ERROR', 
          payload: ''
        });
        return;
      }
      
      // אם יש טוקן, ננסה לטעון את המשתמש
      try {
        await loadUser();
      } catch (error) {
        console.error('Failed to load user during initial auth check:', error);
      }
    };
    
    initAuth();
  }, []);

  // Load user (by existing token)
  const loadUser = async (): Promise<void> => {
    try {
      console.log('Loading user with existing token...');
      const accessToken = localStorage.getItem('accessToken');
      
      if (!accessToken) {
        console.log('No access token available when attempting to load user - normal during login/register flow');
        dispatch({ 
          type: 'AUTH_ERROR', 
          payload: ''
        });
        return;
      }
      
      const user = await authService.getCurrentUser();
      console.log('User loaded successfully:', user.username);
      dispatch({ type: 'USER_LOADED', payload: user });
    } catch (error: any) {
      console.error('Error loading user:', error.message || 'Unknown error');
      
      // ניקוי טוקנים במקרה של שגיאת אימות
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('Authentication error while loading user, clearing tokens');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.response?.data?.message || error.message || 'Error loading user',
      });
    }
  };

  // Login
  const login = async (email: string, password: string): Promise<void> => {
    try {
      console.log('Logging in with:', { 
        email: email, 
        passwordLength: password ? password.length : 0
      });
      
      // ניקוי טוקנים קודמים לפני התחברות
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      const { user, accessToken, refreshToken } = await authService.login({ email, password });
      
      if (!accessToken) {
        throw new Error('Login successful but no access token received');
      }
      
      console.log('Login successful, tokens received');
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message || 'Unknown login error');
      
      // וידוא ניקוי טוקנים במקרה של שגיאה
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      dispatch({
        type: 'LOGIN_FAIL',
        payload: error.response?.data?.message || error.message || 'Login failed',
      });
    }
  };

  // Register
  const register = async (username: string, email: string, password: string): Promise<void> => {
    try {
      console.log('Registering new user:', { email: email, username: username });
      
      // ניקוי טוקנים קודמים לפני הרשמה
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      const { user, accessToken, refreshToken } = await authService.register({ username, email, password });
      
      if (!accessToken) {
        throw new Error('Registration successful but no access token received');
      }
      
      console.log('Registration successful, tokens received');
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      dispatch({ type: 'REGISTER_SUCCESS', payload: user });
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      
      dispatch({
        type: 'REGISTER_FAIL',
        payload: error.response?.data?.message || error.message || 'Registration failed',
      });
    }
  };

  // Google Login
  const googleLogin = async (googleToken: string): Promise<void> => {
    try {
      console.log('Google login with token:', googleToken ? `${googleToken.substring(0, 10)}...` : 'null');
      
      if (!googleToken) {
        throw new Error('No Google token provided');
      }
      
      // ניקוי טוקנים קודמים לפני התחברות עם גוגל
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      const { user, accessToken, refreshToken } = await authService.googleLogin(googleToken);
      
      if (!accessToken) {
        throw new Error('Google login successful but no access token received');
      }
      
      console.log('Google login successful, tokens received');
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error: any) {
      console.error('Google login error:', error.response?.data || error.message);
      
      dispatch({
        type: 'LOGIN_FAIL',
        payload: error.response?.data?.message || error.message || 'Google login failed',
      });
    }
  };

  // עדכון פרטי המשתמש בקונטקסט לאחר עדכון פרופיל
  const updateUser = (user: User): void => {
    console.log('Updating user info in context:', user);
    // עדכון העתק של user כדי לא לשנות את ה-state ישירות
    const updatedUser = { ...user };
    
    // וודא שכאשר תמונת הפרופיל היא null זה מועבר כראוי
    if (updatedUser.profilePicture === null || updatedUser.profilePicture === 'default') {
      updatedUser.profilePicture = null;
      console.log('User profile picture set to null');
    }
    
    dispatch({ type: 'UPDATE_USER_INFO', payload: updatedUser });
  };

  // Logout
  const logout = (): void => {
    console.log('Logging out user');
    
    // Call logout from authService to handle any cleanup
    authService.logout();
    
    // וידוא ניקוי טוקנים
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    dispatch({ type: 'LOGOUT' });
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      console.log('Refreshing token...');
      const accessToken = localStorage.getItem('accessToken');
      const refreshTokenStr = localStorage.getItem('refreshToken');
      
      if (!accessToken || !refreshTokenStr) {
        console.log('No access token or refresh token available when attempting to refresh token');
        return false;
      }
      
      const refreshed = await authService.refreshToken(refreshTokenStr);
      
      if (!refreshed) {
        throw new Error('Token refresh failed');
      }
      
      console.log('Token refreshed successfully');
      return true;
    } catch (error: any) {
      console.error('Error refreshing token:', error.message);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        loadUser,
        login,
        register,
        googleLogin,
        logout,
        updateUser,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};