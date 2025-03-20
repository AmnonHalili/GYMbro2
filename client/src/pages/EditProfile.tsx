import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as userService from '../services/userService';

const EditProfile: React.FC = () => {
  const { authState, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // טעינת נתוני המשתמש הנוכחי
  useEffect(() => {
    if (authState.user) {
      setUsername(authState.user.username);
      if (authState.user.profilePicture) {
        setPreviewURL(authState.user.profilePicture);
      }
    }
  }, [authState.user]);
  
  // טיפול בשינוי שם המשתמש
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };
  
  // טיפול בשינוי תמונת הפרופיל
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      
      // בדיקה שהקובץ הוא תמונה
      if (!file.type.match('image.*')) {
        setError('יש להעלות קובץ תמונה בלבד');
        return;
      }
      
      // בדיקת גודל קובץ (מקסימום 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('גודל התמונה לא יכול לעלות על 5MB');
        return;
      }
      
      setProfilePicture(file);
      
      // יצירת תצוגה מקדימה של התמונה
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewURL(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      setError(null);
    }
  };
  
  // הסרת תמונת הפרופיל
  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    setPreviewURL(null);
  };
  
  // שליחת הטופס
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('יש להזין שם משתמש');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // בדיקה אם רק התמונה משתנה או גם השם משתמש
      const isOnlyProfilePictureChange = username === authState.user?.username;
      
      let updatedUser = null;
      
      if (isOnlyProfilePictureChange && profilePicture) {
        // אם רק התמונה משתנה, נשתמש בנתיב ייעודי לעדכון תמונת פרופיל
        const pictureFormData = new FormData();
        pictureFormData.append('profilePicture', profilePicture);
        
        const response = await userService.updateProfilePicture(pictureFormData);
        console.log('תמונת פרופיל עודכנה בהצלחה:', response);
        updatedUser = response.user;
        
        setSuccess(true);
      } else {
        // עדכון פרופיל מלא (שם משתמש ו/או תמונה)
        const formData = new FormData();
        formData.append('username', username);
        
        if (profilePicture) {
          formData.append('profilePicture', profilePicture);
        } else if (previewURL === null && authState.user?.profilePicture) {
          // אם המשתמש הסיר את התמונה המקורית, נשלח סימון למחיקת התמונה
          formData.append('removeProfilePicture', 'true');
        }
        
        // עדכון פרופיל המשתמש
        const response = await userService.updateProfile(formData);
        console.log('פרופיל עודכן בהצלחה:', response);
        updatedUser = response.user;
        
        setSuccess(true);
      }
      
      // עדכון מידע המשתמש בקונטקסט
      if (updatedUser && updateUser) {
        console.log('מעדכן מידע משתמש בקונטקסט:', updatedUser);
        updateUser(updatedUser);
      } else {
        console.warn('לא ניתן לעדכן את נתוני המשתמש בקונטקסט');
      }
      
      // רענון מחדש של הדף כדי לראות את השינויים
      setTimeout(() => {
        // ניווט לדף הפרופיל לאחר העדכון
        window.location.href = `/profile/${authState.user?.id}`;
      }, 1500);
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'אירעה שגיאה בעדכון הפרופיל. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // אם המשתמש לא מחובר, הפנה לדף ההתחברות
  if (!authState.isAuthenticated) {
    navigate('/login');
    return null;
  }
  
  return (
    <div className="edit-profile">
      <h2>עריכת פרופיל</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">הפרופיל עודכן בהצלחה!</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">שם משתמש</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={handleUsernameChange}
            className="form-control"
            required
          />
        </div>
        
        <div className="form-group">
          <label>תמונת פרופיל</label>
          
          {previewURL ? (
            <div className="profile-picture-preview">
              <img src={previewURL} alt="תצוגה מקדימה" />
              <button 
                type="button" 
                onClick={handleRemoveProfilePicture}
                className="btn-remove"
              >
                הסר תמונה
              </button>
            </div>
          ) : (
            <div className="profile-picture-upload">
              <input
                type="file"
                id="profilePicture"
                onChange={handleProfilePictureChange}
                className="form-control"
                accept="image/*"
              />
              <small>ניתן להעלות תמונות מסוג JPG, PNG או GIF בגודל עד 5MB</small>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'שומר שינויים...' : 'שמור שינויים'}
          </button>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => navigate(`/profile/${authState.user?.id}`)}
          >
            בטל
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile; 