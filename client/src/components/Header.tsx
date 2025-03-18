import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as FaIcons from 'react-icons/fa';
import './Header.css';

const Header: React.FC = () => {
  const { authState, logout } = useAuth();
  const { isAuthenticated, user } = authState;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <h1>GYMbro</h1>
        </Link>
        <div className="header-actions">
          {isAuthenticated && user ? (
            <div className="user-info">
              <Link to={`/profile/${user.id}`} className="user-profile-link">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.username} className="user-avatar" />
                ) : (
                  <div className="default-avatar">{user.username.charAt(0).toUpperCase()}</div>
                )}
                <span className="username">{user.username}</span>
              </Link>
              <button onClick={handleLogout} className="logout-button">התנתק</button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="login-link">התחברות</Link>
              <Link to="/register" className="register-link">הרשמה</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 