import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaEnvelope, FaLock, FaUserPlus, FaSignInAlt } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { state, register, googleLogin, clearError } = useAuth();
  const { isAuthenticated, error } = state;
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }

    return () => {
      clearError();
    };
  }, [isAuthenticated, navigate, clearError]);

  // Check if passwords match
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError('הסיסמאות אינן תואמות');
    } else {
      setPasswordError(null);
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setPasswordError('הסיסמאות אינן תואמות');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ username, email, password });
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Login Success Handler
  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    try {
      // פענוח הטוקן שהתקבל מגוגל
      const decoded: any = jwtDecode(credentialResponse.credential);
      console.log('Google login successful, decoded token:', decoded);
      
      // קריאה לפונקציית ההתחברות עם גוגל
      await googleLogin({
        token: credentialResponse.credential,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        googleId: decoded.sub
      });
      
      // מעבר לדף הבית אחרי ההתחברות
      if (state.accessToken) {
        navigate('/');
      }
    } catch (error) {
      console.error('Google login processing error:', error);
    }
  };

  // הגדר סקריפט Google
  useEffect(() => {
    // בדוק שהחלון קיים (מניעת בעיות SSR)
    if (typeof window === 'undefined' || !window.document || !GOOGLE_CLIENT_ID) return;
    
    // בדוק אם הסקריפט כבר נטען
    if (document.getElementById('google-client-script')) return;
    
    // טען את סקריפט Google
    const script = document.createElement('script');
    script.id = 'google-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    // נקה בעת הסרת הקומפוננטה
    return () => {
      const scriptTag = document.getElementById('google-client-script');
      if (scriptTag) {
        document.body.removeChild(scriptTag);
      }
    };
  }, []);

  // הגדר מאזין אירועים להתחברות Google
  useEffect(() => {
    // פונקציה שתופעל כאשר Google מחזיר תוצאה
    const googleLoginHandler = async (event: any) => {
      const response = event.detail;
      if (response && response.credential) {
        await handleGoogleLoginSuccess(response);
      }
    };

    // הוסף מאזין אירועים
    const pageElement = document.querySelector('div.auth-page');
    if (pageElement) {
      pageElement.addEventListener('googleLoginSuccess', googleLoginHandler);
    }

    // הסר מאזין אירועים בעת ניקוי
    return () => {
      if (pageElement) {
        pageElement.removeEventListener('googleLoginSuccess', googleLoginHandler);
      }
    };
  }, []);

  return (
    <div className="auth-page animate-fade-in">
      <div className="auth-card">
        <div className="auth-logo">
          {FaUserPlus({ className: "auth-icon" })}
          <h2 className="auth-title">הרשמה</h2>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <div className="input-icon-wrapper">
              {FaUser({ className: "input-icon" })}
              <input
                type="text"
                id="username"
                className="form-control"
                placeholder="שם משתמש"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-icon-wrapper">
              {FaEnvelope({ className: "input-icon" })}
              <input
                type="email"
                id="email"
                className="form-control"
                placeholder="דוא״ל"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-icon-wrapper">
              {FaLock({ className: "input-icon" })}
              <input
                type="password"
                id="password"
                className="form-control"
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-icon-wrapper">
              {FaLock({ className: "input-icon" })}
              <input
                type="password"
                id="confirmPassword"
                className="form-control"
                placeholder="אימות סיסמה"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {passwordError && <small className="text-danger">{passwordError}</small>}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !!passwordError}
          >
            {isSubmitting ? 'נרשם...' : 'הירשם'} {FaUserPlus({})}
          </button>
        </form>

        {/* Google Login */}
        {GOOGLE_CLIENT_ID && (
          <div className="google-login-container">
            <div className="or-divider">
              <span>או</span>
            </div>
            
            <div className="google-btn-wrapper" id="google-login-button">
              <div id="g_id_onload"
                data-client_id={GOOGLE_CLIENT_ID}
                data-callback="handleGoogleSignIn">
              </div>
              <div className="g_id_signin"
                data-type="standard"
                data-theme="filled_blue"
                data-size="large"
                data-text="signup_with"
                data-shape="rectangular"
                data-locale="he"
                data-width="100%">
              </div>
            </div>
          </div>
        )}
        
        <div className="auth-links">
          <Link to="/login" className="auth-link">
            {FaSignInAlt({})} כבר יש לך חשבון? התחבר עכשיו
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register; 