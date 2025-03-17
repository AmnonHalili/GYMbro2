import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as postService from '../services/postService';
import * as FaIcons from 'react-icons/fa';

const CreatePost: React.FC = () => {
  const { state } = useAuth();
  const navigate = useNavigate();
  
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  
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
    
    try {
      const formData = new FormData();
      formData.append('content', content);
      
      if (image) {
        formData.append('image', image);
      }
      
      // שליחת הפוסט החדש לשרת
      const response = await postService.createPost(formData);
      
      // הדפסת מבנה התשובה לצורכי דיבוג
      console.log('Post creation response:', response);
      
      // מנסים לזהות את ה-ID בהתאם למבנה התשובה
      let postId: string | undefined;
      
      // בדיקת מבנה התשובה. לפי הלוגים, המבנה הוא {message: string, post: Post}
      if (response.post && typeof response.post === 'object') {
        // הפוסט נמצא בשדה post
        if ('id' in response.post) {
          postId = response.post.id;
        } else if ('_id' in response.post) {
          postId = response.post._id;
        }
      } else if (response.data && typeof response.data === 'object') {
        // מבנה ApiResponse<Post> סטנדרטי
        if ('id' in response.data) {
          postId = response.data.id;
        } else if ('_id' in response.data) {
          postId = response.data._id;
        }
      } 
      
      // אם לא מצאנו ID, ננסה לבדוק עוד אפשרויות
      if (!postId && typeof response === 'object') {
        // ייתכן שהמבנה שונה מהצפוי
        if ('id' in response) {
          postId = (response as any).id;
        } else if ('_id' in response) {
          postId = (response as any)._id;
        }
      }
      
      // ניקוי הטופס אחרי יצירת פוסט בכל מקרה
      setContent('');
      setCharacterCount(0);
      setImage(null);
      setImagePreview(null);
      
      if (postId) {
        // גישה חדשה - נווט קודם לדף הבית ורק אחר כך לדף הפוסט
        console.log('Post created with ID:', postId);
        
        // שמור את ה-ID בלוקל סטורג' כדי שנוכל לגשת אליו אחרי רענון הדף
        localStorage.setItem('lastCreatedPostId', postId);
        
        // נווט לדף הבית תחילה, כדי לוודא שהפוסט נטען למערכת
        console.log('Navigating to home page first...');
        navigate('/', { replace: true });
        
        // ואז אחרי 1.5 שניות, נווט לדף הפוסט
        setTimeout(() => {
          console.log('Now navigating to post page...');
          navigate(`/post/${postId}`);
        }, 1500);
      } else {
        // אם אין ID, פשוט חזור לעמוד הראשי
        console.log('Post created successfully, but no ID found in response. Returning to home page.');
        // רענון העמוד הראשי
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.message || 'אירעה שגיאה ביצירת הפוסט. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // אם המשתמש לא מחובר, הפנה לדף ההתחברות
  if (!state.isAuthenticated) {
    navigate('/login');
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
                    <span>{FaIcons.FaTrash({})}</span>
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
                    <span className="me-1">{FaIcons.FaImage({})}</span> בחר תמונה
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
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    שולח פוסט...
                  </>
                ) : 'פרסם פוסט'}
              </button>
              
              <button 
                type="button" 
                className="btn btn-outline-secondary" 
                onClick={() => navigate('/')}
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePost; 