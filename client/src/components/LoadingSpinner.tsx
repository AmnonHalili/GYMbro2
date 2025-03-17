import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="spinner-container">
      <div className="spinner"></div>
      <p>טוען...</p>
    </div>
  );
};

export default LoadingSpinner; 