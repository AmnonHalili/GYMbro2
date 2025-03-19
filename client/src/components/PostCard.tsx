import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Post } from '../types';
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

  // Check if current user is the post owner
  const isPostOwner = authState.user?.id === post.user.id;
  
  // Get valid post id
  const postId = post.id || post._id;

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
      }
    } catch (err) {
      console.error('Failed to load post updates from localStorage', err);
    }
  }, [postId, likesCount, commentsCount]);
  
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
            likesCount: newLikesCount
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
    const img = e.currentTarget;
    console.error(`[PostCard] Failed to load image for post ${postId}:`, {
      originalSrc: img.src,
      postImage: post.image
    });
    
    try {
      // If the image path is not valid, hide the image
      if (!post.image) {
        console.log('[PostCard] No image path available, hiding image');
        img.style.display = 'none';
        const container = img.parentElement;
        if (container) {
          container.style.display = 'none';
        }
        return;
      }
      
      // Try to load the image with a direct path if the URL approach failed
      const serverBase = process.env.REACT_APP_API_URL || window.location.origin;
      const directPath = post.image.startsWith('/') 
        ? `${serverBase}${post.image}`
        : `${serverBase}/uploads/posts/${post.image}`;
        
      if (img.src !== directPath) {
        console.log(`[PostCard] Retrying with direct path:`, {
          originalSrc: img.src,
          directPath,
          postImage: post.image
        });
        img.src = directPath;
      } else {
        // If direct path also failed, hide the image
        console.log('[PostCard] Direct path also failed, hiding image');
        img.style.display = 'none';
        const container = img.parentElement;
        if (container) {
          container.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('[PostCard] Error handling image failure:', error);
      img.style.display = 'none';
      const container = img.parentElement;
      if (container) {
        container.style.display = 'none';
      }
    }
  };

  // בונה URL לתמונה בשימוש הפונקציה המשופרת
  const buildImageUrl = (imagePath: string | null): string => {
    if (!imagePath) return '';
    
    // שימוש בפונקציה שנוספה ל-API
    return getImageUrl(imagePath);
  };

  return (
    <div className="post-card card h-100 shadow-sm animate-fade-in" onClick={() => navigate(`/post/${postId}`)}>
      {post.image && (
        <div className="post-image-container">
          <img 
            src={getImageUrl(post.image)}
            className="card-img-top" 
            alt="תמונת פוסט"
            loading="lazy"
            onError={handleImageError}
          />
        </div>
      )}
      
      <div className="card-body">
        <div className="post-header">
          <div className="d-flex align-items-center">
            <Link 
              to={`/profile/${post.user._id || post.user.id}`} 
              className="post-avatar-link"
              onClick={(e) => e.stopPropagation()}
            >
              {post.user.profilePicture ? (
                <img 
                  src={post.user.profilePicture} 
                  alt={post.user.username || 'משתמש'}
                  className="post-avatar"
                  loading="lazy"
                />
              ) : (
                <AnonymousAvatar size="sm" />
              )}
            </Link>
            
            <div className="post-user-info">
              <Link 
                to={`/profile/${post.user._id || post.user.id}`} 
                className="post-username"
                onClick={(e) => e.stopPropagation()}
              >
                {post.user.username || 'משתמש אנונימי'}
              </Link>
              <div className="post-date">
                {formatDate(post.createdAt)}
              </div>
            </div>
          </div>
          
          {isPostOwner && (
            <div className="post-actions-container">
              <button 
                className="btn-icon" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                aria-label="פעולות נוספות"
              >
                {FaEllipsisV({})}
              </button>
              
              {showActions && (
                <div className="post-actions-menu">
                  <button className="post-action-btn" onClick={handleEditPost}>
                    {FaPen({})} עריכה
                  </button>
                  <button 
                    className="post-action-btn delete" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                      setShowActions(false);
                    }}
                  >
                    {FaTrash({})} מחיקה
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <p className="post-content">{post.content}</p>
      </div>
      
      <div className="card-footer">
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