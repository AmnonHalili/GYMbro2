import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaEnvelope, 
  FaLock, 
  FaSignInAlt, 
  FaUserPlus, 
  FaExclamationCircle, 
  FaDumbbell,
  FaRunning,
  FaBicycle,
  FaHeartbeat
} from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import '../styles/Auth.css';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onGoogleLogin: (credential: string) => Promise<void>;
  error: string | null;
  isSubmitting: boolean;
  googleClientId: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onGoogleLogin,
  error,
  isSubmitting,
  googleClientId
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    await onSubmit(email, password);
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
      
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">
            {FaDumbbell({})}
          </div>
          <h1 className="auth-title">ברוכים הבאים ל-GYMbro</h1>
          <p className="auth-subtitle">התחבר כדי להמשיך לאימון שלך</p>
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
              <label htmlFor="email" className="form-label">
                {FaEnvelope({})} כתובת אימייל
              </label>
              <div className="input-container">
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="הכנס את האימייל שלך"
                  required
                  disabled={isSubmitting}
                />
                {FaEnvelope({ className: "input-icon" })}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                {FaLock({})} סיסמה
              </label>
              <div className="input-container">
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הכנס את הסיסמה שלך"
                  required
                  disabled={isSubmitting}
                />
                {FaLock({ className: "input-icon" })}
              </div>
              <Link to="/forgot-password" className="forgot-password-link">
                שכחת סיסמה?
              </Link>
            </div>
            
            <button 
              type="submit" 
              className={`btn-primary ${isSubmitting ? 'btn-loading' : ''}`}
              disabled={isSubmitting}
            >
              {!isSubmitting && (
                <>
                  התחבר {FaSignInAlt({})}
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
                text="continue_with"
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
                  title="התחברות באמצעות Google לא זמינה כרגע"
                >
                  התחברות באמצעות Google לא זמינה
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="auth-footer">
          <p className="auth-footer-text">
            אין לך חשבון עדיין?{' '}
            <Link to="/register" className="auth-footer-link">
              {FaUserPlus({})} הירשם עכשיו
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 