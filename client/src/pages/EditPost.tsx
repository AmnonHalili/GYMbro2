import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as postService from '../services/postService';
import * as FaIcons from 'react-icons/fa';

const EditPost: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const { authState } = useAuth();
  const navigate = useNavigate();
  
  const [content, setContent] = useState('');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  
  // הגבלת אורך התוכן
  const MAX_CONTENT_LENGTH = 500;
  
  // טעינת נתוני הפוסט בעת טעינת הדף
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      
      try {
        setLoading(true);
        console.log(`[EditPost] Fetching post with ID: ${postId}`);
        const response = await postService.getPostById(postId);
        
        // נבדוק שהתשובה קיימת ושיש בה שדה data או שהיא מכילה ישירות את הפוסט
        if (!response) {
          console.error('[EditPost] Response is empty or undefined');
          setError('לא התקבלה תשובה מהשרת');
          setLoading(false);
          return;
        }

        // ננסה למצוא את אובייקט הפוסט
        const post = response;
        console.log('[EditPost] Post data received:', post);
        
        if (!post || typeof post !== 'object') {
          setError('שגיאה בטעינת נתוני הפוסט');
          setLoading(false);
          return;
        }
        
        // לוודא שיש תוכן לפוסט
        if (!post.content) {
          console.error('[EditPost] Post has no content:', post);
          setError('הפוסט לא מכיל תוכן');
          setLoading(false);
          return;
        }

        // בדיקת הרשאות - נוודא שיש אובייקט משתמש בפוסט וגם שיש משתמש מחובר
        const postUserId = post.user?.id || post.user?._id;
        const currentUserId = authState.user?.id || authState.user?._id;

        console.log(`[EditPost] Checking permissions: Post user: ${postUserId}, Current user: ${currentUserId}`);
        
        if (!postUserId || !currentUserId) {
          console.error('[EditPost] Missing user data for permission check');
          setError('אין מספיק מידע כדי לאמת הרשאות');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // לוודא שהמשתמש הוא בעל הפוסט
        if (postUserId !== currentUserId) {
          console.error(`[EditPost] Permission denied - post user: ${postUserId}, current user: ${currentUserId}`);
          setError('אין לך הרשאה לערוך פוסט זה');
          setTimeout(() => navigate('/'), 2000);
          return;
        }
        
        // כל הבדיקות עברו, נעדכן את המצב עם נתוני הפוסט
        console.log('[EditPost] Setting post content:', post.content);
        setContent(post.content);
        setCharacterCount(post.content.length);
        
        if (post.image) {
          console.log('[EditPost] Setting post image:', post.image);
          // בדיקה אם התמונה היא אובייקט עם שדה path או מחרוזת
          const imagePath = typeof post.image === 'object' && post.image.path 
            ? post.image.path 
            : (post.image as string);
          
          setOriginalImage(imagePath);
          setImagePreview(imagePath);
        }
        
      } catch (error) {
        console.error('[EditPost] Error fetching post:', error);
        setError('אירעה שגיאה בטעינת הפוסט');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [postId, authState.user, navigate]);
  
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
    setOriginalImage(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postId) {
      setError('מזהה פוסט חסר');
      return;
    }
    
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
      
      // אם יש תמונה חדשה, נעלה אותה
      if (image) {
        formData.append('image', image);
      } else if (originalImage === null) {
        // אם המשתמש הסיר את התמונה המקורית, נשלח סימון למחיקת התמונה
        formData.append('removeImage', 'true');
      }
      
      // עדכון הפוסט בשרת
      await postService.updatePost(postId, formData);
      
      // ניווט לדף הפוסט לאחר העדכון
      navigate(`/post/${postId}`);
      
    } catch (error: any) {
      console.error('Error updating post:', error);
      setError(error.response?.data?.message || 'אירעה שגיאה בעדכון הפוסט. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // אם המשתמש לא מחובר, הפנה לדף ההתחברות
  if (!authState.isAuthenticated) {
    navigate('/login');
    return null;
  }
  
  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">טוען...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mt-4">
      <div className="card shadow">
        <div className="card-header bg-primary text-white">
          <h2 className="h5 mb-0">עריכת פוסט</h2>
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
                placeholder="ערוך את תוכן הפוסט שלך..."
                required
              />
              <div className={`d-flex justify-content-end mt-1 ${characterCount > MAX_CONTENT_LENGTH * 0.8 ? 'text-danger' : 'text-muted'}`}>
                {characterCount}/{MAX_CONTENT_LENGTH}
              </div>
            </div>
            
            <div className="mb-3">
              <label htmlFor="image" className="form-label d-block">תמונה (אופציונלי)</label>
              
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
            
            <div className="d-flex gap-2">
              <button 
                type="submit" 
                className="btn btn-primary flex-grow-1" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    מעדכן פוסט...
                  </>
                ) : 'עדכן פוסט'}
              </button>
              
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => navigate(`/post/${postId}`)}
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

export default EditPost; 