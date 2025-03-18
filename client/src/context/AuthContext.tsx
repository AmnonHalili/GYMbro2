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

interface AuthContextProps {
  authState: AuthState;
  loadUser: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  googleLogin: (googleToken: string) => Promise<void>;
  logout: () => void;
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
  | { type: 'CLEAR_ERRORS' };

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
        console.warn('No access token found in localStorage');
        dispatch({ type: 'AUTH_ERROR', payload: 'No token found' });
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
        console.warn('No access token available when attempting to load user');
        dispatch({ type: 'AUTH_ERROR', payload: 'No token found' });
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
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      console.log('Logging in with:', { 
        email: credentials.email, 
        passwordLength: credentials.password ? credentials.password.length : 0
      });
      
      // ניקוי טוקנים קודמים לפני התחברות
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      const { user, accessToken, refreshToken } = await authService.login(credentials);
      
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
  const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      console.log('Registering new user:', { email: credentials.email, username: credentials.username });
      
      // ניקוי טוקנים קודמים לפני הרשמה
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      const { user, accessToken, refreshToken } = await authService.register(credentials);
      
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

  return (
    <AuthContext.Provider
      value={{
        authState,
        loadUser,
        login,
        register,
        googleLogin,
        logout,
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