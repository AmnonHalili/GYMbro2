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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError(null);
      setImage(null);
      setImagePreview(null);
      return;
    }
    
    console.log(`[CreatePost] File selected: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);
    
    // בדיקה שהקובץ אינו ריק
    if (file.size === 0) {
      setError('קובץ התמונה ריק. אנא בחר תמונה תקינה.');
      setImage(null);
      setImagePreview(null);
      // ניקוי שדה הקובץ
      e.target.value = '';
      return;
    }
    
    // בדיקת סוג התמונה
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('סוג הקובץ אינו נתמך. אנא בחר תמונה מסוג JPEG, PNG, GIF או WebP.');
      setImage(null);
      setImagePreview(null);
      // ניקוי שדה הקובץ
      e.target.value = '';
      return;
    }
    
    // בדיקת גודל קובץ מקסימלי
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      setError(`גודל הקובץ חורג מהמותר. גודל מקסימלי הוא ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      setImage(null);
      setImagePreview(null);
      // ניקוי שדה הקובץ
      e.target.value = '';
      return;
    }
    
    // קריאת תוכן הקובץ לוידוא שהוא תקין לפני הצגתו
    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error('[CreatePost] Error reading file:', reader.error);
      setError('שגיאה בקריאת הקובץ. אנא נסה קובץ אחר.');
      setImage(null);
      setImagePreview(null);
      // ניקוי שדה הקובץ
      e.target.value = '';
    };
    
    reader.onabort = () => {
      console.error('[CreatePost] File reading aborted');
      setError('קריאת הקובץ הופסקה. אנא נסה שוב.');
    };
    
    reader.onloadend = () => {
      // בדיקה שיש תוצאת קריאה
      if (typeof reader.result !== 'string' || reader.result.length === 0) {
        console.error('[CreatePost] File read result is empty or invalid');
        setError('לא ניתן לקרוא את תוכן הקובץ. אנא נסה קובץ אחר.');
        setImage(null);
        setImagePreview(null);
        return;
      }
      
      // בדיקה שהתמונה מוצגת כראוי
      const img = new Image();
      img.onload = () => {
        // התמונה נטענה בהצלחה - משמע קובץ תקין
        console.log(`[CreatePost] Image loaded successfully: ${img.width}x${img.height}`);
        // שמירת התמונה במצב המקומי
        setImage(file);
        setImagePreview(reader.result as string);
        setError(null);
      };
      
      img.onerror = () => {
        console.error('[CreatePost] Error loading image');
        setError('קובץ התמונה שנבחר אינו תקין. אנא בחר תמונה אחרת.');
        setImage(null);
        setImagePreview(null);
        // ניקוי שדה הקובץ
        e.target.value = '';
      };
      
      // טעינת התמונה לבדיקה
      img.src = reader.result as string;
    };
    
    // בדיקה נוספת לפני קריאת הקובץ
    if (file.size > 0) {
      reader.readAsDataURL(file);
    } else {
      console.error('[CreatePost] Attempted to read an empty file');
      setError('קובץ התמונה ריק. אנא בחר תמונה תקינה.');
      // ניקוי שדה הקובץ
      e.target.value = '';
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
    
    // בדיקה נוספת שהתמונה שנבחרה תקינה (אם קיימת)
    if (image) {
      if (image.size === 0) {
        setError('התמונה שנבחרה אינה תקינה. אנא בחר תמונה אחרת או הסר אותה.');
        return;
      }
      
      // בדיקת סוג קובץ
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(image.type)) {
        setError('סוג התמונה אינו נתמך. אנא בחר תמונה מסוג JPEG, PNG, GIF או WebP.');
        return;
      }
      
      // בדיקת גודל מקסימלי
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (image.size > MAX_FILE_SIZE) {
        setError(`גודל התמונה חורג מהמותר. גודל מקסימלי הוא ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
        return;
      }
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
      
      // יצירת FormData ושימוש בו לשליחת מידע הפוסט והקובץ
      const formData = new FormData();
      
      // הוספת תוכן הפוסט
      formData.append('content', content);
      
      // הוספת התמונה רק אם היא קיימת ותקינה
      if (image && image.size > 0) {
        console.log('[CreatePost] Adding image to form data:', image.name, 'Size:', image.size, 'Type:', image.type);
        
        try {
          // ניסיון ליצור עותק של הקובץ כדי לוודא שהוא תקין
          const imageBuffer = await image.arrayBuffer();
          if (imageBuffer.byteLength === 0) {
            throw new Error('Buffer is empty');
          }
          
          // יצירת קובץ חדש מהבאפר
          const imageClone = new File([imageBuffer], image.name, { type: image.type });
          console.log('[CreatePost] Created image clone:', imageClone.name, 'Size:', imageClone.size);
          
          if (imageClone.size === 0) {
            throw new Error('Cloned file is empty');
          }
          
          // הוספת העותק לטופס
          formData.append('image', imageClone);
        } catch (err) {
          console.warn('[CreatePost] Failed to clone image, using original:', err);
          formData.append('image', image);
        }
        
        // לוג עם מידע נוסף על התמונה
        console.log('[CreatePost] Image last modified:', new Date(image.lastModified).toISOString());
      } else if (image) {
        console.warn('[CreatePost] Image exists but may be invalid:', image.name, 'Size:', image.size);
        // בדיקה נוספת עם הודעת שגיאה אם התמונה ריקה או לא תקינה
        if (image.size === 0) {
          setError('התמונה שנבחרה ריקה. נא לבחור תמונה תקינה או להסיר אותה.');
          setIsSubmitting(false);
          return;
        }
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
      
      // בדיקת מבנה התשובה
      if (typeof response === 'object') {
        // טיפול באובייקט בפורמט מפולמורפי
        const postData = response as any; // המרה ל-any כדי להתמודד עם מבנה משתנה
        
        if (postData._id) {
          // מקרה שבו השרת מחזיר את הפוסט ישירות
          postId = postData._id;
          console.log('[CreatePost] Found post ID directly in response:', postId);
        } else if (postData.id) {
          postId = postData.id;
          console.log('[CreatePost] Found post ID (id) directly in response:', postId);
        } else if (postData.post?._id) {
          // מקרה שבו השרת עוטף את הפוסט בשדה post
          postId = postData.post._id;
          console.log('[CreatePost] Found post ID in response.post:', postId);
        } else if (postData.post?.id) {
          postId = postData.post.id;
          console.log('[CreatePost] Found post ID in response.post:', postId);
        } else if (postData.data?._id) {
          // מקרה שבו השרת עוטף את הפוסט בשדה data
          postId = postData.data._id;
          console.log('[CreatePost] Found post ID in response.data:', postId);
        } else if (postData.data?.id) {
          postId = postData.data.id;
          console.log('[CreatePost] Found post ID in response.data:', postId);
        }
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
      
      if (error.message) {
        console.error('[CreatePost] Error message:', error.message);
      }
      
      if (error.response) {
        console.error('[CreatePost] Error details:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      // טיפול מיוחד בשגיאות אימות
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('פג תוקף ההתחברות. אנא התחבר מחדש.');
        navigate('/login', { replace: true });
      } else {
        // הצגת הודעת השגיאה מהשרת או הודעה כללית
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
                    onChange={handleFileChange}
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