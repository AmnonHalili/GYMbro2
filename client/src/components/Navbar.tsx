import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as FaIcons from 'react-icons/fa';
import AnonymousAvatar from './AnonymousAvatar';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
  const { authState, logout } = useAuth();
  const { isAuthenticated, user } = authState;
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container container">
        <Link to="/" className="logo">
          {FaIcons.FaDumbbell({ className: "logo-icon" })}
          <span>GYMbro</span>
        </Link>

        <nav className="nav-menu">
          {isAuthenticated ? (
            <>
              <NavLink 
                to="/" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                בית
              </NavLink>
              <NavLink 
                to="/create-post" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span>{FaIcons.FaPlus({})}</span> פוסט חדש
              </NavLink>
              <NavLink 
                to="/workout-planner" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                תוכניות אימון
              </NavLink>
              <NavLink 
                to="/nutrition-advice" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                תזונה
              </NavLink>
              <NavLink 
                to="/nutritional-calculator" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                מחשבון תזונה
              </NavLink>
              <NavLink 
                to={user?.id ? `/profile/${user.id}` : '/profile'} 
                className={({ isActive }) => isActive ? 'nav-link active profile-link' : 'nav-link profile-link'}
              >
                <div className="navbar-avatar-container">
                  {user?.profilePicture && !imageError ? (
                    <img 
                      src={user.profilePicture} 
                      alt="תמונת פרופיל" 
                      className="navbar-avatar"
                      onError={(e) => {
                        console.log('תמונת פרופיל בנאבבר נכשלה בטעינה:', user.profilePicture);
                        setImageError(true);
                      }}
                    />
                  ) : (
                    <AnonymousAvatar size="xs" className="navbar-avatar" />
                  )}
                </div>
                <span className="username-text">{user?.username || 'פרופיל'}</span>
              </NavLink>
              <button onClick={handleLogout} className="nav-link btn-link">
                {FaIcons.FaSignOutAlt({ className: "me-1" })} התנתק
              </button>
            </>
          ) : (
            <>
              <NavLink 
                to="/login" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                {FaIcons.FaSignInAlt({ className: "me-1" })} התחברות
              </NavLink>
              <NavLink 
                to="/register" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                {FaIcons.FaUserPlus({ className: "me-1" })} הרשמה
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar; 