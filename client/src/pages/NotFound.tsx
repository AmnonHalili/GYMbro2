import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="not-found-container">
      <h1>404</h1>
      <h2>הדף שחיפשת לא נמצא</h2>
      <p>נראה שהגעת לכתובת שלא קיימת או שהדף הוסר.</p>
      <Link to="/" className="btn btn-primary">
        חזרה לדף הבית
      </Link>
    </div>
  );
};

export default NotFound; 