import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as postService from '../services/postService';

const CreatePost: React.FC = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  
  // בדיקת אימות בעת טעינת הקומפוננטה
  useEffect(() => {
    console.log('[CreatePost] Authentication state on mount:', { 
      isAuthenticated: authState.isAuthenticated,
      user: authState.user ? { id: authState.user.id, username: authState.user.username } : null
    });
    
    // בדיקה שיש טוקן בלוקל סטורג'
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('[CreatePost] No access token found in localStorage');
      setError('לא נמצא טוקן התחברות. אנא התחבר מחדש.');
      
      // הוספת הפניה ישירה ללוגין אם אין טוקן
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    }
    
    if (!authState.isAuthenticated) {
      console.warn('[CreatePost] User not authenticated, will redirect to login');
      // הוספת הפניה ישירה ללוגין אם משתמש לא מאומת
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    }
  }, [authState, navigate]);
  
  // הגבלת אורך התוכן
  const MAX_CONTENT_LENGTH = 500;
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= MAX_CONTENT_LENGTH) {
      setContent(newContent);
      setCharacterCount(newContent.length);
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      
      // בדיקה שהקובץ הוא תמונה
      if (!selectedFile.type.match('image.*')) {
        setError('יש להעלות קובץ תמונה בלבד');
        return;
      }
      
      // בדיקת גודל קובץ (מקסימום 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('גודל התמונה לא יכול לעלות על 5MB');
        return;
      }
      
      setImage(selectedFile);
      
      // יצירת תצוגה מקדימה של התמונה
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      
      setError(null);
    }
  };
  
  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // בדיקה שהמשתמש מחובר לפני שליחת הפוסט
    if (!authState.isAuthenticated || !authState.user) {
      setError('אתה לא מחובר. אנא התחבר לפני יצירת פוסט חדש.');
      navigate('/login', { replace: true });
      return;
    }
    
    // בדיקת תקינות תוכן הפוסט
    if (!content.trim()) {
      setError('יש להזין תוכן לפוסט');
      return;
    }
    
    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`תוכן הפוסט לא יכול לעלות על ${MAX_CONTENT_LENGTH} תווים`);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    // בדיקה מחדש שיש טוקן בלוקל סטורג'
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('[CreatePost] No access token found before submission');
      setError('לא נמצא טוקן התחברות. אנא התחבר מחדש.');
      setIsSubmitting(false);
      navigate('/login', { replace: true });
      return;
    }
    
    try {
      console.log('[CreatePost] Starting post creation...');
      const formData = new FormData();
      formData.append('content', content);
      
      if (image) {
        formData.append('image', image);
      }
      
      // הוספת שדה userId מפורש
      if (authState.user && authState.user.id) {
        formData.append('userId', authState.user.id);
      }
      
      console.log('[CreatePost] Form data prepared, sending to server');
      
      // שליחת הפוסט החדש לשרת
      const response = await postService.createPost(formData);
      
      // הדפסת מבנה התשובה לצורכי דיבוג
      console.log('[CreatePost] Post creation response:', response);
      
      // מנסים לזהות את ה-ID בהתאם למבנה התשובה
      let postId: string | undefined;
      
      // בדיקת מבנה התשובה המעודכן
      if (response.post && typeof response.post === 'object') {
        // הפוסט נמצא בשדה post
        postId = response.post.id || response.post._id;
        console.log('[CreatePost] Found post ID in response.post:', postId);
      } else if (response.data && typeof response.data === 'object') {
        // מבנה ApiResponse<Post> סטנדרטי
        postId = response.data.id || response.data._id;
        console.log('[CreatePost] Found post ID in response.data:', postId);
      } else if (typeof response === 'object') {
        // ייתכן שהמבנה שונה מהצפוי
        postId = (response as any).id || (response as any)._id;
        console.log('[CreatePost] Found post ID directly in response:', postId);
      }
      
      // ניקוי הטופס אחרי יצירת פוסט בכל מקרה
      setContent('');
      setCharacterCount(0);
      setImage(null);
      setImagePreview(null);
      
      if (postId) {
        // נווט ישירות לדף הפוסט
        console.log('[CreatePost] Post created successfully with ID:', postId);
        navigate(`/post/${postId}`, { replace: true });
      } else {
        console.log('[CreatePost] Post created but no ID found. Returning to home page.');
        navigate('/', { replace: true });
      }
      
    } catch (error: any) {
      console.error('[CreatePost] Error creating post:', error);
      console.error('[CreatePost] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // טיפול מיוחד בשגיאות אימות
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('פג תוקף ההתחברות. אנא התחבר מחדש.');
        navigate('/login', { replace: true });
      } else {
        setError(error.message || error.response?.data?.message || 'אירעה שגיאה ביצירת הפוסט. אנא נסה שוב.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // אם המשתמש לא מחובר, הפנה לדף ההתחברות
  if (!authState.isAuthenticated) {
    console.log('[CreatePost] User not authenticated, redirecting to login');
    navigate('/login', { replace: true });
    return null;
  }
  
  return (
    <div className="container mt-4">
      <div className="card shadow">
        <div className="card-header bg-primary text-white">
          <h2 className="h5 mb-0">יצירת פוסט חדש</h2>
        </div>
        
        <div className="card-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="content" className="form-label">תוכן הפוסט</label>
              <textarea
                id="content"
                className="form-control"
                rows={5}
                value={content}
                onChange={handleContentChange}
                placeholder="שתף את החוויות, הטיפים או ההישגים שלך..."
                required
              />
              <div className={`d-flex justify-content-end mt-1 ${characterCount > MAX_CONTENT_LENGTH * 0.8 ? 'text-danger' : 'text-muted'}`}>
                {characterCount}/{MAX_CONTENT_LENGTH}
              </div>
            </div>
            
            <div className="mb-3">
              <label htmlFor="image" className="form-label d-block">הוסף תמונה (אופציונלי)</label>
              
              {imagePreview ? (
                <div className="position-relative mb-3">
                  <img 
                    src={imagePreview} 
                    alt="תצוגה מקדימה" 
                    className="img-fluid rounded mb-2" 
                    style={{ maxHeight: '300px' }} 
                  />
                  <button 
                    type="button" 
                    className="btn btn-sm btn-danger position-absolute top-0 end-0"
                    onClick={removeImage}
                  >
                    🗑️
                  </button>
                </div>
              ) : (
                <div className="input-group">
                  <input
                    type="file"
                    id="image"
                    className="form-control"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <label className="input-group-text" htmlFor="image">
                    <span className="me-1">📷</span> בחר תמונה
                  </label>
                </div>
              )}
              <small className="text-muted d-block mt-1">
                ניתן להעלות תמונות מסוג JPG, PNG או GIF בגודל עד 5MB
              </small>
            </div>
            
            <div className="d-grid gap-2">
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting || !authState.isAuthenticated}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    שולח פוסט...
                  </>
                ) : (
                  'פרסם פוסט'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePost; 