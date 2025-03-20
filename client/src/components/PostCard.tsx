import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Post, User } from '../types';
import { 
  FaEllipsisV, 
  FaPen, 
  FaTrash, 
  FaHeart, 
  FaRegHeart, 
  FaComment 
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import * as postService from '../services/postService';
import AnonymousAvatar from './AnonymousAvatar';
import { getImageUrl } from '../services/api';

interface PostCardProps {
  post: Post;
  onPostDeleted?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted }) => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const maxRetries = 3;

  // מתג לדיבוג - הגדר כ-true כדי להציג תמיד את כפתור העריכה
  // שים לב: יש להגדיר כ-false לפני העלאה לשרת!!
  const FORCE_SHOW_EDIT_BUTTON = false;

  // Check if current user is the post owner with additional fallbacks
  const isPostOwner = React.useMemo(() => {
    // אם אין משתמש מחובר או אין נתונים על יוצר הפוסט
    if (!authState.user || !post.user) return false;
    
    // מדפיס למסך את הערכים של השדות לבדיקה
    console.log('User comparison:', {
      authUserId: authState.user.id,
      authUser_Id: authState.user._id,
      postUserId: post.user.id,
      postUser_Id: post.user._id,
      authUserName: authState.user.username,
      postUserName: post.user.username
    });
    
    // בדיקה פשוטה - האם מזהה המשתמש שווה למזהה יוצר הפוסט
    if (authState.user.id && post.user.id && authState.user.id === post.user.id) {
      console.log('Match by id');
      return true;
    }
    
    // בדיקה שניה - האם מזהה המשתמש שווה למזהה _id של יוצר הפוסט
    if (authState.user.id && post.user._id && authState.user.id === post.user._id) {
      console.log('Match by id === _id');
      return true;
    }
    
    // בדיקה שלישית - האם מזהה _id של המשתמש שווה למזהה של יוצר הפוסט
    if (authState.user._id && post.user.id && authState.user._id === post.user.id) {
      console.log('Match by _id === id');
      return true;
    }
    
    // בדיקה רביעית - האם מזהה _id של המשתמש שווה למזהה _id של יוצר הפוסט
    if (authState.user._id && post.user._id && authState.user._id === post.user._id) {
      console.log('Match by _id');
      return true;
    }
    
    // בדיקה חמישית - האם שם המשתמש זהה
    if (authState.user.username && post.user.username && 
        authState.user.username === post.user.username) {
      console.log('Match by username');
      return true;
    }
    
    // אם הגענו לכאן, אין התאמה
    return false;
  }, [authState.user, post.user]);
  
  // Get valid post id
  const postId = post.id || post._id;
  
  // פונקציית עזר לחילוץ שם הקובץ מנתיב
  const getFilenameFromPath = (imagePath: string | { path: string }): string => {
    let path = '';
    
    if (typeof imagePath === 'object' && imagePath.path) {
      path = imagePath.path;
    } else if (typeof imagePath === 'string') {
      path = imagePath;
    }
    
    // פשוט מחלצים את החלק האחרון מהנתיב (אחרי ה-/ האחרון)
    const parts = path.split('/');
    return parts[parts.length - 1];
  };
  
  // פונקציה ליצירת URL מתאים לתמונה
  const getEnhancedImageUrl = (): string => {
    if (!post.image) {
      return '';
    }

    const baseServerUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
    
    // אם יש לנו כבר נתיב מלא מתאים
    if (post.imageFullPath) {
      console.log(`משתמש בנתיב imageFullPath: ${post.imageFullPath}`);
      return post.imageFullPath;
    }
    
    // אם יש לנו נתיב URL מתאים
    if (post.imageUrl) {
      console.log(`משתמש בנתיב imageUrl: ${post.imageUrl}`);
      return post.imageUrl;
    }
    
    // טיפול במקרה שהתמונה היא אובייקט עם path
    if (typeof post.image === 'object' && post.image.path) {
      const path = post.image.path.startsWith('/') 
        ? post.image.path 
        : `/${post.image.path}`;
      console.log(`משתמש בנתיב מאובייקט: ${baseServerUrl}${path}`);
      return `${baseServerUrl}${path}`;
    }
    
    // טיפול במקרה שהתמונה היא מחרוזת
    if (typeof post.image === 'string') {
      const path = post.image.startsWith('/') 
        ? post.image 
        : `/${post.image}`;
      console.log(`משתמש בנתיב מחרוזת: ${baseServerUrl}${path}`);
      return `${baseServerUrl}${path}`;
    }
    
    return '';
  };

  // אתחול URL התמונה בעת טעינת הקומפוננטה - מעתיקים את זה כאן למעלה
  useEffect(() => {
    if (post.image) {
      console.log('מאתחל תמונת פוסט עם ID:', post.id);
      setImageUrl(getEnhancedImageUrl());
    }
  }, [post.id, post.image]);

  // Debug logging
  useEffect(() => {
    console.log('Rendering PostCard for post:', {
      postId,
      title: post.content?.substring(0, 30),
      userId: post.user?.id,
      username: post.user?.username
    });
    
    // Check for valid post ID
    if (!postId) {
      console.error('Post has no valid ID:', post);
    }
  }, [post, postId]);
  
  // Check for post updates in localStorage
  useEffect(() => {
    if (!postId) return;
    
    try {
      const postUpdates = JSON.parse(localStorage.getItem('postUpdates') || '{}');
      if (postUpdates[postId]) {
        const updates = postUpdates[postId];
        
        // Update likes count if changed
        if (updates.likesCount !== undefined && updates.likesCount !== likesCount) {
          console.log(`Updating likes count for post ${postId} from ${likesCount} to ${updates.likesCount}`);
          setLikesCount(updates.likesCount);
        }
        
        // Update comments count if changed
        if (updates.commentsCount !== undefined && updates.commentsCount !== commentsCount) {
          console.log(`Updating comments count for post ${postId} from ${commentsCount} to ${updates.commentsCount}`);
          setCommentsCount(updates.commentsCount);
        }
        
        // עדכון מצב הלייק
        if (updates.liked !== undefined) {
          console.log(`Updating liked status for post ${postId} to ${updates.liked}`);
          setLiked(updates.liked);
        }
      }
    } catch (err) {
      console.error('Failed to load post updates from localStorage', err);
    }
  }, [postId, likesCount, commentsCount]);
  
  // בעת הרנדור של קומפוננטת PostCard, נוסיף לוג של נתיבי התמונה
  useEffect(() => {
    if (post.image) {
      console.log(`Post ${postId} image paths:`, { 
        originalPath: post.image,
        imageUrl: post.imageUrl,
        fullPath: getImageUrl(post.image)
      });
    }
  }, [post.image, postId, post.imageUrl]);
  
  // בדיקת זיהוי משתמש בקונסול כדי לפתור את בעיית העריכה והמחיקה
  useEffect(() => {
    if (authState.user && post.user) {
      console.log(`PostCard user check for post ${postId}:`, {
        isPostOwner,
        authUser: authState.user,
        postUser: post.user,
        authUserId: authState.user.id,
        authUser_Id: authState.user._id,
        postUserId: post.user.id,
        postUser_Id: post.user._id,
        postContent: post.content?.substring(0, 20)
      });
    }
  }, [authState.user, post.user, postId, isPostOwner]);
  
  // Error fallback if no valid post ID
  if (!postId) {
    return (
      <div className="card h-100 shadow-sm">
        <div className="card-body">
          <p className="text-danger">שגיאה בטעינת הפוסט - חסר מזהה</p>
        </div>
      </div>
    );
  }
  
  // Toggle post like
  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!authState.isAuthenticated) {
      return;
    }
    
    try {
      console.log('Toggling like for post:', postId);
      const response = await postService.toggleLike(postId);
      console.log('Like toggle response:', response);
      
      // Handle API response
      if (response) {
        const likeData = response.data || response;
        const isLiked = likeData?.liked !== undefined ? likeData.liked : !liked;
        const newLikesCount = likeData?.likesCount !== undefined ? 
          likeData.likesCount : 
          (isLiked ? likesCount + 1 : Math.max(0, likesCount - 1));
        
        console.log(`Updating post like status: liked=${isLiked}, likesCount=${newLikesCount}`);
        
        // Update like state and count
        setLiked(isLiked);
        setLikesCount(newLikesCount);
        
        // Store updated counts in localStorage
        try {
          const postUpdates = JSON.parse(localStorage.getItem('postUpdates') || '{}');
          postUpdates[postId] = {
            ...postUpdates[postId] || {},
            likesCount: newLikesCount,
            liked: isLiked // שמירת מצב הלייק
          };
          localStorage.setItem('postUpdates', JSON.stringify(postUpdates));
        } catch (err) {
          console.error('Failed to store post updates', err);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Handle edit post navigation
  const handleEditPost = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowActions(false);
    navigate(`/edit-post/${postId}`);
  };

  // Handle delete post
  const handleDeletePost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      await postService.deletePost(postId);
      
      // Call the onPostDeleted callback if provided
      if (onPostDeleted) {
        onPostDeleted();
      }
      
      // If we're on the post detail page, navigate back to home
      if (window.location.pathname.includes(`/post/${postId}`)) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setIsDeleting(false);
    } finally {
      setShowDeleteConfirm(false);
    }
  };
  
  // Format date helper
  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'dd/MM/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return date;
    }
  };
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`שגיאה בטעינת תמונה לפוסט ${postId}`, {
      src: e.currentTarget.src,
      originalSrc: post.image,
      postImageUrl: post.imageUrl,
      retryCount
    });
    
    // אם יש לנו כבר 3 ניסיונות כושלים, נוותר ולא נציג תמונה
    if (retryCount >= maxRetries) {
      console.log('הגענו למספר נסיונות מקסימלי, מסתירים את התמונה');
      setImageError(true);
        return;
      }
      
    // ננסה שוב עם URL מתוקן אחרי השהייה קצרה
    setTimeout(() => {
      // ננסה גרסה אחרת של ה-URL
      console.log('מנסה נתיב חלופי לתמונת הפוסט');
      
      if (post.image) {
        let newImageUrl;
        const baseServerUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
        const filename = getFilenameFromPath(post.image);
        
        // מנסה תיקון נתיב בהתאם למספר הנסיון
        if (retryCount === 0) {
          // נסיון ראשון - API ייעודי לתמונות
          newImageUrl = `${baseServerUrl}/api/image/posts/${filename}`;
          console.log(`נסיון ${retryCount + 1}/${maxRetries} - URL API: ${newImageUrl}`);
        }
        else if (retryCount === 1) {
          // נסיון שני - נתיב ישיר לתיקיית posts
          newImageUrl = `${baseServerUrl}/uploads/posts/${filename}`;
          console.log(`נסיון ${retryCount + 1}/${maxRetries} - נתיב ישיר: ${newImageUrl}`);
        }
        else {
          // נסיון אחרון - נתיב קובץ בלי התיקייה
          newImageUrl = `${baseServerUrl}/uploads/${filename}`;
          console.log(`נסיון ${retryCount + 1}/${maxRetries} - נתיב שורש: ${newImageUrl}`);
        }
        
        if (newImageUrl) {
          setImageUrl(newImageUrl);
          setRetryCount(prevCount => prevCount + 1);
        } else {
          console.error('לא ניתן ליצור URL לתמונה, מסתירים את התמונה');
          setImageError(true);
        }
      } else {
        setImageError(true);
      }
    }, 500);
  };

  // Get user profile picture URL or return null if invalid
  const getProfilePictureUrl = (user: User | undefined): string | null => {
    // אם אין משתמש בכלל - אין תמונה
    if (!user) {
      console.log('אין משתמש, מחזיר null');
      return null;
    }
    
    const { profilePicture } = user;
    
    // אם אין תמונת פרופיל בכלל
    if (!profilePicture) {
      console.log('אין תמונת פרופיל, מחזיר null');
      return null;
    }
    
    // אם התמונה היא מחרוזת
    if (typeof profilePicture === 'string') {
      return profilePicture;
    }
    
    // אם התמונה היא אובייקט
    if (typeof profilePicture === 'object' && profilePicture !== null) {
      console.log('תמונת פרופיל היא אובייקט:', profilePicture);
      
      // בדיקה אם יש שדה path
      if ('path' in profilePicture && typeof (profilePicture as any).path === 'string') {
        return (profilePicture as any).path;
      }
      
      // בדיקה אם יש שדה url
      if ('url' in profilePicture && typeof (profilePicture as any).url === 'string') {
        return (profilePicture as any).url;
      }
    }
    
    // אם הגענו לכאן, לא הצלחנו לחלץ URL תקין
    console.warn('לא ניתן לחלץ URL תקין מתמונת הפרופיל:', profilePicture);
    return null;
  };

  return (
    <div className="post-card card h-100 shadow-sm animate-fade-in" onClick={() => navigate(`/post/${postId}`)}>
      {/* חלק עליון של הכרטיס - כולל סרגל פעולות */}
      <div className="card-header-action-bar" style={{ position: 'relative' }}>
        {/* אינדיקטור בעלות על הפוסט - מוצג רק במצב פיתוח */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ position: 'absolute', top: '5px', left: '5px', zIndex: 10 }}>
            <span style={{ 
              fontSize: '10px', 
              background: isPostOwner ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)', 
              padding: '2px 4px', 
              borderRadius: '4px',
              color: isPostOwner ? 'green' : 'red' 
            }}>
              {isPostOwner ? 'בעל הפוסט' : 'לא בעלים'}
            </span>
        </div>
      )}
        
        {/* כפתור עריכה/מחיקה */}
        {isPostOwner && (
          <div className="post-actions-container" style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            zIndex: 10,
            direction: 'rtl' // חשוב: מבטיח שהתפריט ייפתח לכיוון הנכון
          }}>
            <button 
              className="btn-icon" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowActions(!showActions);
                console.log('Toggle actions menu:', !showActions);
              }}
              aria-label="פעולות נוספות"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {FaEllipsisV({ size: 18, style: { color: '#444' } })}
            </button>
            
            {showActions && (
              <div className="post-actions-menu" style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                background: '#fff',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                padding: '8px 0',
                zIndex: 999,
                minWidth: '150px',
                direction: 'rtl',
                textAlign: 'right'
              }}>
                <button className="post-action-btn" onClick={handleEditPost} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 16px',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  justifyContent: 'flex-start'
                }}>
                  {FaPen({ style: { marginLeft: '8px', fontSize: '12px' } })} עריכה
                </button>
                <button 
                  className="post-action-btn delete" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                    setShowActions(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 16px',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#dc3545',
                    fontSize: '14px',
                    justifyContent: 'flex-start'
                  }}
                >
                  {FaTrash({ style: { marginLeft: '8px', fontSize: '12px' } })} מחיקה
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="card-body">
        <div className="post-header">
          <div className="d-flex align-items-center">
            <Link 
              to={`/profile/${post.user?._id || post.user?.id}`} 
              className="post-avatar-link"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="post-avatar-container">
                {(() => {
                  // נבדוק אם יש תמונת פרופיל תקינה
                  const profileUrl = getProfilePictureUrl(post.user);
                  
                  // במקרה של תמונת פרופיל תקינה, מציגים אותה
                  if (profileUrl) {
                    return (
                      <img 
                        src={profileUrl} 
                        alt={post.user?.username || 'משתמש'} 
                  className="post-avatar"
                        onError={(e) => {
                          console.log('שגיאה בטעינת תמונת פרופיל:', e);
                          
                          // מסתירים את התמונה שנכשלה
                          e.currentTarget.style.display = 'none';
                          
                          // מציגים אווטאר אנונימי במקומה
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            // יוצרים תוכן חדש עם האווטאר
                            const fallbackDiv = document.createElement('div');
                            fallbackDiv.className = 'post-avatar-fallback';
                            fallbackDiv.style.display = 'flex';
                            fallbackDiv.style.justifyContent = 'center';
                            fallbackDiv.style.alignItems = 'center';
                            fallbackDiv.style.width = '100%';
                            fallbackDiv.style.height = '100%';
                            
                            // מרנדרים את האווטאר האנונימי לתוך הדיב
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = `
                              <div style="
                                width: 36px;
                                height: 36px;
                                background: linear-gradient(135deg, #e8f5e9, #2e7d32);
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                flex-shrink: 0;
                                border: 1px solid rgba(0,0,0,0.1);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                              ">
                                <svg
                                  width="21.6"
                                  height="21.6"
                                  viewBox="0 0 24 24"
                                  fill="white"
                                >
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                              </div>
                            `;
                            
                            // מוסיפים את האווטאר לדיב
                            fallbackDiv.appendChild(tempDiv.firstElementChild!);
                            
                            // מוסיפים את הדיב למסמך
                            parent.appendChild(fallbackDiv);
                          }
                        }}
                      />
                    );
                  }
                  
                  // אם אין תמונת פרופיל תקינה, מציגים ישר אווטאר אנונימי
                  return (
                    <div className="post-avatar-fallback" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%'}}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'linear-gradient(135deg, #e8f5e9, #2e7d32)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}>
                        <svg
                          width={21.6}
                          height={21.6}
                          viewBox="0 0 24 24"
                          fill="white"
                        >
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Link>
            
            <div className="post-user-info">
              <Link 
                to={`/profile/${post.user?._id || post.user?.id}`} 
                className="post-username"
                onClick={(e) => e.stopPropagation()}
              >
                {post.user?.username || 'משתמש'}
              </Link>
              <div className="post-date">
                {formatDate(post.createdAt)}
              </div>
            </div>
          </div>
        </div>
        
        {/* תצוגת תמונת הפוסט (עכשיו אחרי פרטי המשתמש) */}
        {post.image && !imageError && (
          <div className="post-image-container mt-3" style={{ maxHeight: '250px', overflow: 'hidden' }}>
            <img
              src={imageUrl || getEnhancedImageUrl()}
              alt="תמונת פוסט"
              className="post-image card-img-top"
              loading="lazy"
              crossOrigin="anonymous"
              onError={handleImageError}
              style={{ maxHeight: '230px', objectFit: 'cover', width: '100%' }}
            />
          </div>
        )}
        
        {/* תוכן הפוסט בתחתית */}
        <p className="post-content mt-3" style={{ marginBottom: '5px', minHeight: '20px', maxHeight: 'none' }}>{post.content}</p>
      </div>
      
      <div className="card-footer" style={{ marginTop: '-5px' }}>
        <div className="post-interactions">
          <button 
            className={`btn-interaction like ${liked ? 'active' : ''}`}
            onClick={handleLike}
            disabled={!authState.isAuthenticated}
            aria-label={liked ? 'בטל לייק' : 'הוסף לייק'}
          >
            {liked ? FaHeart({ className: "icon" }) : FaRegHeart({ className: "icon" })}
            <span>{likesCount}</span>
          </button>
          
          <Link 
            to={`/post/${postId}`} 
            className="btn-interaction comments"
            onClick={(e) => e.stopPropagation()}
            aria-label="הצג תגובות"
          >
            {FaComment({ className: "icon" })}
            <span>{commentsCount}</span>
          </Link>
        </div>
      </div>
      
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={(e) => {
          e.stopPropagation();
          setShowDeleteConfirm(false);
        }}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>מחיקת פוסט</h4>
            <p>האם אתה בטוח שברצונך למחוק פוסט זה? לא ניתן לבטל פעולה זו.</p>
            <div className="delete-confirm-actions">
              <button 
                className="btn btn-secondary" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                disabled={isDeleting}
              >
                ביטול
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeletePost}
                disabled={isDeleting}
              >
                {isDeleting ? 'מוחק...' : 'מחק פוסט'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard; 