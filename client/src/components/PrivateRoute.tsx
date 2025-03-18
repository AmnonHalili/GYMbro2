import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { authState } = useAuth();
  const { isAuthenticated, loading } = authState;
  const location = useLocation();
  const navigate = useNavigate();

  // בדיקת טוקן נוספת כדי לוודא שהמשתמש באמת מחובר
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    
    // אם אין טוקן בכלל, הפנה ישירות ללוגין
    if (!token && !loading) {
      console.warn('[PrivateRoute] No token found, redirecting to login');
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [loading, location, navigate]);

  // אם עדיין בטעינה, הצג אינדיקטור טעינה
  if (loading) {
    return <div className="loading">טוען...</div>;
  }

  // אם המשתמש לא מחובר, הפנה ללוגין
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // אם המשתמש מחובר, החזר את התוכן המוגן
  return <>{children}</>;
};

export default PrivateRoute; 