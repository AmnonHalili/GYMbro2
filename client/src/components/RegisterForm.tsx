import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUser, 
  FaEnvelope, 
  FaLock, 
  FaCheck, 
  FaExclamationCircle,
  FaUserPlus,
  FaDumbbell,
  FaRunning,
  FaBicycle,
  FaHeartbeat
} from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import '../styles/Auth.css';

interface RegisterFormProps {
  onSubmit: (username: string, email: string, password: string) => Promise<void>;
  onGoogleLogin: (credential: string) => Promise<void>;
  error: string | null;
  isSubmitting: boolean;
  googleClientId: string;
}

interface PasswordStrength {
  score: number; // 0-4
  message: string;
  color: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onGoogleLogin,
  error,
  isSubmitting,
  googleClientId
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    message: 'חלשה מאוד',
    color: '#ff4d4d'
  });
  
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);

  // בדיקת תקינות שם משתמש
  const validateUsername = (value: string): boolean => {
    if (value.length < 3) {
      setUsernameError('שם המשתמש חייב להכיל לפחות 3 תווים');
      return false;
    }
    if (value.length > 20) {
      setUsernameError('שם המשתמש לא יכול להכיל יותר מ-20 תווים');
      return false;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
      setUsernameError('שם המשתמש יכול להכיל רק אותיות באנגלית, מספרים וסימנים . _ -');
      return false;
    }
    
    setUsernameError(null);
    return true;
  };

  // בדיקת תקינות אימייל
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('כתובת האימייל אינה תקינה');
      return false;
    }
    
    setEmailError(null);
    return true;
  };

  // בדיקת תקינות סיסמה
  const validatePassword = (value: string): boolean => {
    if (value.length < 8) {
      setPasswordError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return false;
    }
    if (!/[A-Z]/.test(value)) {
      setPasswordError('הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית');
      return false;
    }
    if (!/[0-9]/.test(value)) {
      setPasswordError('הסיסמה חייבת להכיל לפחות ספרה אחת');
      return false;
    }
    
    setPasswordError(null);
    return true;
  };

  // בדיקת התאמה בין סיסמאות
  const validateConfirmPassword = (value: string): boolean => {
    if (value !== password) {
      setConfirmPasswordError('הסיסמאות אינן תואמות');
      return false;
    }
    
    setConfirmPasswordError(null);
    return true;
  };

  // בדיקת קבלת תנאי השימוש
  const validateTerms = (): boolean => {
    if (!acceptTerms) {
      setTermsError('יש לאשר את תנאי השימוש כדי להמשיך');
      return false;
    }
    
    setTermsError(null);
    return true;
  };

  // חישוב חוזק הסיסמה
  useEffect(() => {
    if (password) {
      let score = 0;
      
      // בסיס - 8 תווים
      if (password.length >= 8) score++;
      
      // אורך מלא - 12 תווים
      if (password.length >= 12) score++;
      
      // מגוון - אותיות גדולות, קטנות, מספרים
      if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) score++;
      
      // תווים מיוחדים
      if (/[^A-Za-z0-9]/.test(password)) score++;
      
      const strengthMap: { [key: number]: PasswordStrength } = {
        0: { score: 0, message: 'חלשה מאוד', color: '#ff4d4d' },
        1: { score: 1, message: 'חלשה', color: '#ffa64d' },
        2: { score: 2, message: 'בינונית', color: '#ffff4d' },
        3: { score: 3, message: 'חזקה', color: '#4dff4d' },
        4: { score: 4, message: 'חזקה מאוד', color: '#00b300' }
      };
      
      setPasswordStrength(strengthMap[score]);
      
      // בדיקת תקינות הסיסמה
      validatePassword(password);
      
      // בדיקת התאמה בין סיסמאות
      if (confirmPassword) {
        validateConfirmPassword(confirmPassword);
      }
    } else {
      setPasswordStrength({ score: 0, message: 'חלשה מאוד', color: '#ff4d4d' });
      setPasswordError(null);
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // בדיקת תקינות כל השדות
    const isUsernameValid = validateUsername(username);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    const isTermsValid = validateTerms();
    
    // אם כל השדות תקינים, שלח את הטופס
    if (isUsernameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isTermsValid) {
      await onSubmit(username, email, password);
    }
  };

  const handleGoogleLogin = async (response: any) => {
    if (response?.credential) {
      await onGoogleLogin(response.credential);
    }
  };

  return (
    <div className="auth-page">
      {/* Fitness themed background icons */}
      <div className="fitness-icon dumbbell">{FaDumbbell({})}</div>
      <div className="fitness-icon running">{FaRunning({})}</div>
      <div className="fitness-icon bicycle">{FaBicycle({})}</div>
      <div className="fitness-icon heartbeat">{FaHeartbeat({})}</div>
      
      <div className="auth-card register-card animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">
            {FaDumbbell({})}
          </div>
          <h1 className="auth-title">הצטרף ל-GYMbro</h1>
          <p className="auth-subtitle">התחל את מסע הכושר שלך עכשיו</p>
        </div>
        
        <div className="auth-body">
          {error && (
            <div className="auth-alert">
              {FaExclamationCircle({})}
              <span>{error}</span>
            </div>
          )}
          
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                {FaUser({})} שם משתמש
              </label>
              <div className="input-container">
                <input
                  type="text"
                  id="username"
                  className={`form-control ${usernameError ? 'input-error' : ''}`}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (e.target.value) validateUsername(e.target.value);
                  }}
                  onBlur={(e) => validateUsername(e.target.value)}
                  placeholder="הכנס שם משתמש"
                  required
                  disabled={isSubmitting}
                />
                {FaUser({ className: "input-icon" })}
              </div>
              {usernameError && <div className="error-message">{usernameError}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                {FaEnvelope({})} כתובת אימייל
              </label>
              <div className="input-container">
                <input
                  type="email"
                  id="email"
                  className={`form-control ${emailError ? 'input-error' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value) validateEmail(e.target.value);
                  }}
                  onBlur={(e) => validateEmail(e.target.value)}
                  placeholder="הכנס את האימייל שלך"
                  required
                  disabled={isSubmitting}
                />
                {FaEnvelope({ className: "input-icon" })}
              </div>
              {emailError && <div className="error-message">{emailError}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                {FaLock({})} סיסמה
              </label>
              <div className="input-container">
                <input
                  type="password"
                  id="password"
                  className={`form-control ${passwordError ? 'input-error' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הכנס סיסמה"
                  required
                  disabled={isSubmitting}
                />
                {FaLock({ className: "input-icon" })}
              </div>
              
              {/* Password strength meter */}
              {password && (
                <div className="password-strength">
                  <div className="strength-meter">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div 
                        key={index} 
                        className="strength-segment"
                        style={{ 
                          backgroundColor: index < passwordStrength.score + 1 ? passwordStrength.color : '#e0e0e0'
                        }}
                      />
                    ))}
                  </div>
                  <div className="strength-text" style={{ color: passwordStrength.color }}>
                    {passwordStrength.message}
                  </div>
                </div>
              )}
              
              {passwordError && <div className="error-message">{passwordError}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                {FaLock({})} אימות סיסמה
              </label>
              <div className="input-container">
                <input
                  type="password"
                  id="confirmPassword"
                  className={`form-control ${confirmPasswordError ? 'input-error' : ''}`}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (e.target.value) validateConfirmPassword(e.target.value);
                  }}
                  onBlur={(e) => validateConfirmPassword(e.target.value)}
                  placeholder="הכנס את הסיסמה שוב"
                  required
                  disabled={isSubmitting}
                />
                {FaLock({ className: "input-icon" })}
              </div>
              {confirmPasswordError && <div className="error-message">{confirmPasswordError}</div>}
            </div>
            
            <div className="form-group checkbox-group">
              <label className={`checkbox-label ${termsError ? 'checkbox-error' : ''}`}>
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => {
                    setAcceptTerms(e.target.checked);
                    if (e.target.checked) setTermsError(null);
                  }}
                  disabled={isSubmitting}
                />
                <span className="checkbox-custom">{FaCheck({ className: "checkbox-icon" })}</span>
                <span>
                  אני מסכים/ה ל<Link to="/terms" className="terms-link">תנאי השימוש</Link> של GYMbro
                </span>
              </label>
              {termsError && <div className="error-message terms-error">{termsError}</div>}
            </div>
            
            <button 
              type="submit" 
              className={`btn-primary ${isSubmitting ? 'btn-loading' : ''}`}
              disabled={isSubmitting}
            >
              {!isSubmitting && (
                <>
                  הירשם {FaUserPlus({})}
                </>
              )}
            </button>
          </form>
          
          <div className="auth-divider">
            <span className="auth-divider-text">או</span>
          </div>
          
          <div className="google-button-container">
            {googleClientId ? (
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => {
                  console.error('Google Login Failed');
                }}
                text="signup_with"
                shape="rectangular"
                locale="he"
                size="large"
                width="280"
                useOneTap={false}
              />
            ) : (
              <div className="google-button-disabled">
                <button 
                  className="btn-google-disabled"
                  disabled={true}
                  title="הרשמה באמצעות Google לא זמינה כרגע"
                >
                  הרשמה באמצעות Google לא זמינה
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="auth-footer">
          <p className="auth-footer-text">
            כבר יש לך חשבון?{' '}
            <Link to="/login" className="auth-footer-link">
              התחבר כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm; 