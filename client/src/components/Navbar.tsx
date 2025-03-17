import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaDumbbell, FaUser, FaSignOutAlt, FaSignInAlt, FaUserPlus } from 'react-icons/fa';

const Navbar: React.FC = () => {
  const { state, logout } = useAuth();
  const { isAuthenticated, user } = state;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container container">
        <Link to="/" className="logo">
          {FaDumbbell({ className: "logo-icon" })}
          <span>GYMbro</span>
        </Link>

        <nav className="nav-menu">
          {isAuthenticated ? (
            <>
              <NavLink 
                to="/" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                פיד
              </NavLink>
              <NavLink 
                to="/create-post" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                פוסט חדש
              </NavLink>
              <NavLink 
                to="/workout-planner" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                תכנון אימונים
              </NavLink>
              <NavLink 
                to="/nutrition-advice" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                ייעוץ תזונה
              </NavLink>
              <NavLink 
                to="/nutritional-calculator" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                מחשבון ערכים תזונתיים
              </NavLink>
              <NavLink 
                to={user?.id ? `/profile/${user.id}` : '/profile'} 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                {FaUser({ className: "me-1" })} {user?.username || 'פרופיל'}
              </NavLink>
              <button onClick={handleLogout} className="nav-link btn-link">
                {FaSignOutAlt({ className: "me-1" })} התנתק
              </button>
            </>
          ) : (
            <>
              <NavLink 
                to="/login" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                {FaSignInAlt({ className: "me-1" })} התחבר
              </NavLink>
              <NavLink 
                to="/register" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                {FaUserPlus({ className: "me-1" })} הרשם
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar; 