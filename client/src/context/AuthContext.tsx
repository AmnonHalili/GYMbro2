import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { AuthState, LoginCredentials, RegisterCredentials, User, GoogleLoginCredentials } from '../types';
import * as authService from '../services/authService';

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
};

// Action types
type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'GOOGLE_LOGIN_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'USER_LOADED'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
    case 'GOOGLE_LOGIN_SUCCESS':
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };
    case 'USER_LOADED':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        accessToken: null,
        refreshToken: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Create context
interface AuthContextProps {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  googleLogin: (credentials: GoogleLoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  clearError: () => void;
  loadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on initial render if token exists
  useEffect(() => {
    if (state.accessToken) {
      loadUser();
    } else {
      dispatch({ type: 'AUTH_ERROR', payload: 'No token found' });
    }
  }, []);

  // Load user
  const loadUser = async (): Promise<void> => {
    try {
      const user = await authService.getCurrentUser();
      dispatch({ type: 'USER_LOADED', payload: user });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: 'Failed to load user' });
    }
  };

  // Login user
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      // הדפס את הפרטים שנשלחים לשרת
      console.log('Sending login credentials:', credentials);
      
      const data = await authService.login(credentials);
      console.log('Login response received:', { 
        success: true, 
        hasUser: !!data.user, 
        hasAccessToken: !!data.accessToken,
        hasRefreshToken: !!data.refreshToken,
        userData: data.user
      });
      
      // עדכון ישיר של ה-local storage לפני הפעולה הא-סינכרונית של הדיספאץ'
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // פעולה סינכרונית - גורמת לעדכון מיידי של המצב
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || '',
        },
      });
      
      // נגרום לעדכון הדום מיד עם סיום ההתחברות
      setTimeout(() => {
        console.log('Authentication state updated after login, isAuthenticated:', true);
      }, 0);
    } catch (error: any) {
      // הדפס את השגיאה המלאה מהשרת
      console.error('Login error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.response?.data?.message
      });
      
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
    }
  };

  // Google Login
  const googleLogin = async (credentials: GoogleLoginCredentials): Promise<void> => {
    try {
      console.log('Sending Google login credentials:', {
        email: credentials.email,
        hasToken: !!credentials.token,
        googleId: credentials.googleId
      });
      
      const data = await authService.googleLogin(credentials);
      console.log('Google login response received:', { 
        success: true, 
        hasUser: !!data.user, 
        hasAccessToken: !!data.accessToken,
        hasRefreshToken: !!data.refreshToken,
        userData: data.user
      });
      
      // עדכון ישיר של ה-local storage לפני הפעולה הא-סינכרונית של הדיספאץ'
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // פעולה סינכרונית - גורמת לעדכון מיידי של המצב
      dispatch({
        type: 'GOOGLE_LOGIN_SUCCESS',
        payload: {
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || '',
        },
      });
      
      // נגרום לעדכון הדום מיד עם סיום ההתחברות
      setTimeout(() => {
        console.log('Authentication state updated after Google login, isAuthenticated:', true);
      }, 0);
    } catch (error: any) {
      console.error('Google login error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.response?.data?.message
      });
      
      const message = error.response?.data?.message || 'Google login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
    }
  };

  // Register user
  const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      const data = await authService.register(credentials);
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: {
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        },
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
    }
  };

  // Logout user
  const logout = (): void => {
    authService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  // Update user
  const updateUser = (user: User): void => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  // Clear error
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        googleLogin,
        register,
        logout,
        updateUser,
        clearError,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 