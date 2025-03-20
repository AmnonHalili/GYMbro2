import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as userService from '../services/userService';
import { getImageUrl } from '../services/api';
import { FaTrash, FaUpload } from 'react-icons/fa';
import AnonymousAvatar from '../components/AnonymousAvatar';

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
    setPreviewURL('default');
    
    // איפוס שדה הקובץ כדי לאפשר העלאת אותו קובץ שוב
    const fileInput = document.getElementById('profilePicture') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };
  
  // עדכון הפונקציה handleDefaultImageError למניעת לולאת אינסוף
  const handleDefaultImageError = () => {
    // מניעת לולאת שגיאות אינסופית על ידי הסרת מאזין האירוע
    const imgElement = document.getElementById('preview-image') as HTMLImageElement;
    if (imgElement) {
      // הסרת מאזין האירוע למניעת לולאה אינסופית
      imgElement.onerror = null;
      // הצגת אווטאר אנונימי במקום ניסיון נוסף לטעון תמונה
      setPreviewURL('default');
    }
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
        } else if ((previewURL === null || previewURL === 'default') && authState.user?.profilePicture) {
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
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>עריכת פרופיל</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">הפרופיל עודכן בהצלחה!</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{
          maxWidth: '400px',
          margin: '0 auto 20px auto'
        }}>
          <label htmlFor="username" style={{ textAlign: 'center', display: 'block', marginBottom: '5px' }}>שם משתמש</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={handleUsernameChange}
            className="form-control"
            required
            style={{
              borderRadius: '5px',
              padding: '8px',
              border: '1px solid #ddd'
            }}
          />
        </div>
        
        <div className="form-group" style={{
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <label style={{ textAlign: 'center', display: 'block', marginBottom: '5px' }}>תמונת פרופיל</label>
          
          {previewURL ? (
            <div className="profile-picture-preview">
              {previewURL === 'default' ? (
                <div style={{ 
                  maxWidth: '250px', 
                  maxHeight: '250px', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px auto',
                  borderRadius: '5px',
                  width: '200px',
                  height: '200px'
                }}>
                  <AnonymousAvatar size="lg" />
                </div>
              ) : (
                <img 
                  src={previewURL} 
                  alt="תצוגה מקדימה" 
                  style={{ 
                    maxWidth: '250px', 
                    maxHeight: '250px', 
                    objectFit: 'contain', 
                    display: 'block', 
                    margin: '0 auto 10px auto',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }} 
                  id="preview-image"
                  onError={handleDefaultImageError}
                />
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '10px',
                alignItems: 'center',
                height: '36px'
              }}>
                <button 
                  type="button" 
                  onClick={handleRemoveProfilePicture}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc3545',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '5px',
                    display: previewURL === 'default' ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '36px',
                    width: '36px'
                  }}
                  aria-label="הסר תמונה"
                >
                  {FaTrash({})}
                </button>
                
                <label htmlFor="profilePicture" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: '#28a745',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '5px',
                  height: '36px',
                  width: '36px'
                }}>
                  <input
                    type="file"
                    id="profilePicture"
                    onChange={handleProfilePictureChange}
                    style={{ display: 'none' }}
                    accept="image/*"
                  />
                  {FaUpload({})}
                </label>
              </div>
            </div>
          ) : (
            <div className="profile-picture-upload" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{ 
                marginBottom: '15px',
                width: '200px',
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AnonymousAvatar size="lg" />
              </div>
              
              <label htmlFor="profilePicture" style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#28a745',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '10px',
                gap: '5px'
              }}>
                {FaUpload({})}
                <span style={{ marginRight: '5px' }}>העלאת תמונה</span>
                <input
                  type="file"
                  id="profilePicture"
                  onChange={handleProfilePictureChange}
                  style={{ display: 'none' }}
                  accept="image/*"
                />
              </label>
              <small>ניתן להעלות תמונות מסוג JPG, PNG או GIF בגודל עד 5MB</small>
            </div>
          )}
        </div>
        
        <div className="form-actions" style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '20px',
          width: '100%',
          maxWidth: '300px',
          margin: '20px auto'
        }}>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#28a745',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100px',
              height: '36px',
              fontSize: '14px',
              boxSizing: 'border-box',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              lineHeight: '1',
              textAlign: 'center',
              margin: '0'
            }}
          >
            {isSubmitting ? 'שומר...' : 'שמור'}
          </button>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => navigate(`/profile/${authState.user?.id}`)}
            style={{
              padding: '8px 16px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#dc3545',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100px',
              height: '36px',
              fontSize: '14px',
              boxSizing: 'border-box',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              lineHeight: '1',
              textAlign: 'center',
              margin: '0'
            }}
          >
            בטל
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile; 