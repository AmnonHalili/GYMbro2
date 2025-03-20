import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';
import RegisterForm from '../components/RegisterForm';

// Google OAuth Client ID מה-.env או קבוע
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

interface GoogleCredential {
  email: string;
  name: string;
  picture: string;
  sub: string;
}

const Register: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { authState, register, googleLogin } = useAuth();
  const { isAuthenticated, error: authError } = authState;
  const navigate = useNavigate();
  const location = useLocation();
  
  const error = localError || authError;
  
  // אם המשתמש כבר מחובר, הפנה לדף הבית
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from);
    }
  }, [isAuthenticated, navigate, location]);
  
  // טיפול בשליחת טופס הרשמה
  const handleSubmit = async (username: string, email: string, password: string) => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await register(username, email, password);
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // טיפול בהתחברות באמצעות גוגל
  const handleGoogleLogin = async (credential: string) => {
    if (credential) {
      try {
        setIsSubmitting(true);
        setLocalError(''); // ניקוי שגיאות קודמות
        
        // פיענוח הטוקן מגוגל (רק לצורכי לוג)
        try {
          const decoded = jwtDecode<GoogleCredential>(credential);
          console.log('Google login token decoded:', {
            email: decoded.email,
            hasName: !!decoded.name,
            hasId: !!decoded.sub
          });
        } catch (decodeError) {
          console.error('Failed to decode Google token on client:', decodeError);
          // נמשיך בכל זאת - השרת יפענח את הטוקן
        }
        
        // קריאה לפונקציית ההתחברות עם גוגל
        await googleLogin(credential);
        
        // מעבר לדף הבית אחרי ההתחברות
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
        navigate(from);
      } catch (error: any) {
        console.error('Google login error in component:', error);
        setLocalError(error.response?.data?.message || 
          'התחברות באמצעות Google נכשלה. אנא נסה שוב מאוחר יותר או הירשם באמצעות אימייל וסיסמה.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      console.error('No credential provided from Google');
      setLocalError('לא התקבלה תגובה מ-Google. אנא נסה שוב או הירשם באמצעות אימייל וסיסמה.');
    }
  };

  return (
    <RegisterForm
      onSubmit={handleSubmit}
      onGoogleLogin={handleGoogleLogin}
      error={error}
      isSubmitting={isSubmitting}
      googleClientId={GOOGLE_CLIENT_ID}
    />
  );
};

export default Register; 