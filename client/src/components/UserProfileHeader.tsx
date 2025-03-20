import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getImageUrl } from '../services/api';
import { User } from '../types';

interface UserProfileHeaderProps {
  user: User;
  isCurrentUser: boolean;
  postsCount: number;
}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({ 
  user, 
  isCurrentUser, 
  postsCount 
}) => {
  const navigate = useNavigate();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isDefaultImage, setIsDefaultImage] = useState(true);
  
  useEffect(() => {
    if (user && user.profilePicture) {
      // בדיקה אם התמונה היא URL מלא
      if (user.profilePicture.startsWith('http')) {
        setProfileImageUrl(user.profilePicture);
      } else {
        // שימוש בפונקציית getImageUrl במקום api.getImageUrl
        setProfileImageUrl(getImageUrl(user.profilePicture));
      }
      setIsDefaultImage(false);
    } else {
      // שימוש בתמונת ברירת מחדל
      setProfileImageUrl(getImageUrl('/uploads/profile/default.jpg'));
      setIsDefaultImage(true);
    }
  }, [user]);
  
  const handleProfileImageError = () => {
    console.log('Profile image loading error, trying fallback path');
    
    const altPath = user?.username 
      ? `/uploads/profile/${user.username}.jpg` 
      : '/uploads/profile/default.jpg';
      
    console.log('Trying alternative profile image path:', altPath);
    setProfileImageUrl(getImageUrl(altPath));
  };
  
  return (
    <div className="user-profile-header">
      <div className="profile-header-container">
        <div className="profile-image-container">
          {profileImageUrl && !imageError ? (
            <img 
              src={profileImageUrl} 
              alt={`תמונת הפרופיל של ${user.username}`} 
              className="profile-image"
              onError={handleProfileImageError}
            />
          ) : (
            <div className="profile-image-placeholder">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="profile-details">
          <h2>{user.username}</h2>
          <div className="profile-stats">
            <div className="stat">
              <span className="count">{postsCount}</span>
              <span className="label">פוסטים</span>
            </div>
            {/* כאן ניתן להוסיף סטטיסטיקות נוספות בעתיד */}
          </div>
          
          {isCurrentUser && (
            <div className="profile-actions">
              <button 
                onClick={() => navigate('/profile/edit')}
                className="edit-profile-btn"
              >
                ערוך פרופיל
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader; 