import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as postService from '../services/postService';
import { Post, Comment, Pagination } from '../types';
import { markFeedForRefresh } from './Home';
import { FaHeart, FaRegHeart, FaComment, FaTrash, FaEdit, FaPaperPlane, FaArrowLeft } from 'react-icons/fa';

// רכיב לתצוגת תגובה בודדת
interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: string) => void;
  post: Post | null;
  setPost: React.Dispatch<React.SetStateAction<Post | null>>;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onDelete, post, setPost }) => {
  const { state } = useAuth();
  const { user } = state;
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isCommentOwner = user && user.id === comment.user?.id;
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      const result = await postService.updateComment(comment.id, editedContent);
      
      // עדכון התגובה בממשק
      comment.content = editedContent;
      
      // במידה והשרת מחזיר את מספר התגובות המעודכן, נעדכן גם אותו
      if (result.commentsCount !== undefined && post) {
        setPost({
          ...post,
          commentsCount: result.commentsCount
        });
        
        // שמירת מספר התגובות המעודכן ב-localStorage
        try {
          const postUpdates = JSON.parse(localStorage.getItem('postUpdates') || '{}');
          if (result.postId) {
            postUpdates[result.postId] = {
              ...postUpdates[result.postId] || {},
              commentsCount: result.commentsCount
            };
            localStorage.setItem('postUpdates', JSON.stringify(postUpdates));
            
            // סימון לדף הבית שצריך לרענן את הנתונים בעת החזרה אליו
            markFeedForRefresh();
          }
        } catch (err) {
          console.error('Failed to store post updates', err);
        }
      }
      
      // סיום עריכה
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('אירעה שגיאה בעדכון התגובה. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="comment-item animate-fade-in">
      <div className="comment-header">
        <div className="comment-user-info">
          <img 
            src={comment.user?.profilePicture || '/default-avatar.png'} 
            alt={comment.user?.username || 'משתמש'} 
            className="comment-avatar"
          />
          <Link to={`/profile/${comment.user?.id}`} className="comment-username">
            {comment.user?.username || 'משתמש'}
          </Link>
          <span className="comment-date">
            {new Date(comment.createdAt).toLocaleDateString('he-IL')}
          </span>
        </div>
        
        {isCommentOwner && (
          <div className="comment-actions">
            {!isEditing && (
              <>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="btn-edit"
                  aria-label="ערוך תגובה"
                >
                  {FaEdit({})}
                </button>
                <button 
                  onClick={() => onDelete(comment.id)} 
                  className="btn-delete"
                  aria-label="מחק תגובה"
                >
                  {FaTrash({})}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="comment-edit-form">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="comment-edit-input"
            disabled={isSubmitting}
          />
          <div className="comment-edit-buttons">
            <button 
              type="submit" 
              disabled={isSubmitting || !editedContent.trim()} 
              className="btn-save"
            >
              {isSubmitting ? 'שומר...' : 'שמור'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setIsEditing(false);
                setEditedContent(comment.content);
              }} 
              className="btn-cancel"
            >
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <p className="comment-content">{comment.content}</p>
      )}
    </div>
  );
};

const PostDetail: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const { state } = useAuth();
  const { user } = state;
  const navigate = useNavigate();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch post and comments
  useEffect(() => {
    const fetchPostAndComments = async () => {
      if (!postId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch post
        const postData = await postService.getPostById(postId, 5);
        
        if (postData && postData.data) {
          setPost(postData.data);
        } else if (postData) {
          setPost(postData as unknown as Post);
        } else {
          throw new Error('Invalid post data format');
        }
        
        // Fetch comments
        const commentsData = await postService.getCommentsByPost(postId);
        if (commentsData) {
          setComments(commentsData.comments || []);
          if (commentsData.pagination) {
            setPagination(commentsData.pagination);
          }
        }
      } catch (error) {
        console.error('Error fetching post data:', error);
        setError('אירעה שגיאה בטעינת הפוסט. אנא נסה שוב מאוחר יותר.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPostAndComments();
  }, [postId]);
  
  // Handle page change for comments
  const handlePageChange = async (page: number) => {
    if (!postId) return;
    
    try {
      const commentsData = await postService.getCommentsByPost(postId, page);
      setComments(commentsData.comments);
      setPagination(commentsData.pagination);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };
  
  // Handle adding new comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postId || !newComment.trim() || !user) return;
    
    setSubmitting(true);
    
    try {
      const result = await postService.createComment(postId, newComment);
      
      // יצירת אובייקט תגובה חדש
      let newCommentObj: Comment;
      
      if (result && result.comment) {
        newCommentObj = result.comment;
        
        if (!newCommentObj.user || typeof newCommentObj.user !== 'object') {
          newCommentObj.user = {
            id: user.id,
            username: user.username,
            profilePicture: user.profilePicture
          };
        }
        
        if (!newCommentObj.id) {
          newCommentObj.id = `temp-${Date.now()}`;
        }
        
        if (!newCommentObj.createdAt) {
          newCommentObj.createdAt = new Date().toISOString();
        }
      } else {
        newCommentObj = {
          id: `temp-${Date.now()}`,
          content: newComment,
          user: {
            id: user.id,
            username: user.username,
            profilePicture: user.profilePicture
          },
          post: postId,
          createdAt: new Date().toISOString()
        };
      }
      
      // הוספת התגובה למערך התגובות
      setComments(prev => [newCommentObj, ...prev]);
      
      // Update post comment count
      if (post) {
        const newCommentsCount = result?.commentsCount !== undefined 
          ? result.commentsCount 
          : post.commentsCount + 1;
          
        setPost({
          ...post,
          commentsCount: newCommentsCount
        });
        
        // שמירת מספר התגובות המעודכן ב-localStorage
        try {
          const postUpdates = JSON.parse(localStorage.getItem('postUpdates') || '{}');
          postUpdates[postId] = {
            ...postUpdates[postId] || {},
            commentsCount: newCommentsCount
          };
          localStorage.setItem('postUpdates', JSON.stringify(postUpdates));
          
          markFeedForRefresh();
        } catch (err) {
          console.error('Failed to store post updates', err);
        }
      }
      
      // Clear input
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('אירעה שגיאה בהוספת התגובה. אנא נסה שוב.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle like toggle
  const handleLike = async () => {
    if (!postId || !post) return;
    
    try {
      const response = await postService.toggleLike(postId);
      
      if (response) {
        const likeData = response.data || response;
        const isLiked = likeData.liked !== undefined ? likeData.liked : !post.liked;
        const newLikesCount = likeData.likesCount !== undefined ? 
          likeData.likesCount : 
          (isLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1));
        
        setPost({
          ...post,
          liked: isLiked,
          likesCount: newLikesCount
        });
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      const errorMessage = error.response?.status === 404 ?
        'לא ניתן למצוא את הפוסט. ייתכן שהוא נמחק.' :
        'אירעה שגיאה בעת סימון לייק. אנא נסה שוב מאוחר יותר.';
      
      alert(errorMessage);
    }
  };
  
  // Handle post delete
  const handleDelete = async () => {
    if (!postId || !post) return;
    
    const confirm = window.confirm('האם אתה בטוח שברצונך למחוק את הפוסט הזה?');
    
    if (!confirm) return;
    
    try {
      await postService.deletePost(postId);
      navigate('/');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('אירעה שגיאה במחיקת הפוסט. אנא נסה שוב.');
    }
  };
  
  // פונקציה למחיקת תגובה
  const handleDeleteComment = async (commentId: string) => {
    if (!postId || !post) return;
    
    const confirmDelete = window.confirm('האם אתה בטוח שברצונך למחוק את התגובה?');
    if (!confirmDelete) return;
    
    try {
      const result = await postService.deleteComment(commentId);
      
      // עדכון רשימת התגובות בממשק
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      // עדכון מספר התגובות בפוסט
      if (result && result.commentsCount !== undefined) {
        setPost({
          ...post,
          commentsCount: result.commentsCount
        });
        
        // שמירת מספר התגובות המעודכן ב-localStorage
        try {
          const postUpdates = JSON.parse(localStorage.getItem('postUpdates') || '{}');
          if (postId) {
            postUpdates[postId] = {
              ...postUpdates[postId] || {},
              commentsCount: result.commentsCount
            };
            localStorage.setItem('postUpdates', JSON.stringify(postUpdates));
            
            // סימון לדף הבית שצריך לרענן את הנתונים בעת החזרה אליו
            markFeedForRefresh();
          }
        } catch (err) {
          console.error('Failed to store post updates', err);
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('אירעה שגיאה במחיקת התגובה. אנא נסה שוב.');
    }
  };

  return (
    <div className="post-detail-container animate-fade-in">
      <div className="post-detail-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          {FaArrowLeft({})} חזרה
        </button>
        <h1 className="post-detail-title">פוסט מאת {post?.user?.username}</h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      
      {loading ? (
        <div className="loading-spinner"></div>
      ) : post ? (
        <div className="post-detail">
          <div className="post-detail-content">
            <div className="post-detail-user">
              <img 
                src={post.user?.profilePicture || '/default-avatar.png'} 
                alt={post.user?.username || 'משתמש'} 
                className="post-avatar"
              />
              <Link to={`/profile/${post.user?.id}`} className="post-username">
                {post.user?.username}
              </Link>
              <span className="post-date">
                {new Date(post.createdAt).toLocaleDateString('he-IL')}
              </span>
            </div>
            
            {post.image && (
              <div className="post-detail-image-container">
                <img 
                  src={post.image} 
                  alt="תוכן הפוסט" 
                  className="post-detail-image"
                  loading="lazy"
                />
              </div>
            )}
            
            <p className="post-detail-text">{post.content}</p>
            
            <div className="post-detail-actions">
              <button 
                onClick={handleLike} 
                className={`btn-like ${post.liked ? 'liked' : ''}`}
                aria-label={post.liked ? 'בטל לייק' : 'סמן לייק'}
              >
                {post.liked ? FaHeart({}) : FaRegHeart({})} {post.likesCount}
              </button>
              
              <span className="post-comments-count">
                {FaComment({})} {post.commentsCount}
              </span>
              
              {user && user.id === post.user?.id && (
                <button onClick={handleDelete} className="btn-delete">
                  {FaTrash({})} מחק
                </button>
              )}
            </div>
          </div>
          
          {user ? (
            <form onSubmit={handleAddComment} className="comment-form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="הוסף תגובה..."
                required
                className="comment-input"
                disabled={submitting}
              />
              <button 
                type="submit" 
                disabled={submitting || !newComment.trim()} 
                className="btn-comment-submit"
              >
                {FaPaperPlane({})} {submitting ? 'שולח...' : 'שלח'}
              </button>
            </form>
          ) : (
            <p className="comment-login-prompt">
              <Link to="/login">התחבר</Link> כדי להוסיף תגובה
            </p>
          )}
          
          <div className="comments-container">
            <h3 className="comments-title">תגובות ({post.commentsCount})</h3>
            
            {comments.length > 0 ? (
              <div className="comments-list">
                {comments.map(comment => (
                  <CommentItem 
                    key={comment.id} 
                    comment={comment} 
                    onDelete={handleDeleteComment}
                    post={post}
                    setPost={setPost}
                  />
                ))}
              </div>
            ) : (
              <p className="no-comments">אין תגובות עדיין. היה הראשון להגיב!</p>
            )}
            
            {pagination.pages > 1 && (
              <div className="pagination">
                {Array.from({ length: pagination.pages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handlePageChange(i + 1)}
                    className={`page-button ${pagination.page === i + 1 ? 'active' : ''}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="not-found">הפוסט לא נמצא</div>
      )}
    </div>
  );
};

export default PostDetail; 