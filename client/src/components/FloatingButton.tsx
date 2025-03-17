import React from 'react';
import { Link } from 'react-router-dom';
import * as FaIcons from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './FloatingButton.css';

const FloatingButton: React.FC = () => {
  const { state } = useAuth();
  
  // הצג את הכפתור רק למשתמשים מחוברים
  if (!state.isAuthenticated) {
    return null;
  }
  
  return (
    <Link 
      to="/create-post" 
      className="floating-button"
      aria-label="צור פוסט חדש"
      title="צור פוסט חדש"
    >
      <span className="floating-button-icon">
        {FaIcons.FaPlus({})}
      </span>
    </Link>
  );
};

export default FloatingButton; 