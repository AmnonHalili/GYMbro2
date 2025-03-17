import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as FaIcons from 'react-icons/fa';

const Header: React.FC = () => {
  const { state, logout } = useAuth();
  const { isAuthenticated, user } = state;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="container">
        <div className="logo">
          <Link to="/">GYMbro</Link>
        </div>
        <nav className="nav">
          {isAuthenticated ? (
            <>
              <Link to="/">בית</Link>
              <Link to="/create-post" className="create-post-btn">
                <span>{FaIcons.FaPlus({})}</span> פוסט חדש
              </Link>
              <Link to="/profile">פרופיל</Link>
              <Link to="/workout-planner">תוכניות אימון</Link>
              <Link to="/nutrition-advice">תזונה</Link>
              <Link to="/nutritional-calculator">מחשבון תזונה</Link>
              <button onClick={handleLogout} className="logout-btn">התנתק</button>
            </>
          ) : (
            <>
              <Link to="/login">התחברות</Link>
              <Link to="/register">הרשמה</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header; 