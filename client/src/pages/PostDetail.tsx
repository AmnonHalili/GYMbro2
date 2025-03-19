import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as postService from '../services/postService';
import { Post, Comment, Pagination } from '../types';
import { markFeedForRefresh } from './Home';
import { 
  FaHeart, 
  FaRegHeart, 
  FaEdit, 
  FaTrash, 
  FaArrowRight,
  FaComment, 
  FaShareAlt, 
  FaWhatsapp, 
  FaTelegram, 
  FaCopy, 
  FaPaperPlane, 
  FaComments 
} from 'react-icons/fa';
import AnonymousAvatar from '../components/AnonymousAvatar';
// @ts-ignore
import { toast } from 'react-toastify';
import '../styles/PostDetail.css';
import { formatRelativeTime, formatFullDate } from '../utils/dateUtils';

// Comment item component
interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: string) => void;
  onLike?: () => void;
  liked?: boolean;
  post: Post | null;
  setPost: React.Dispatch<React.SetStateAction<Post | null>>;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  onDelete, 
  post, 
  setPost,
  liked = false,
  onLike 
}) => {
  const { authState } = useAuth();
  const { user } = authState;
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(liked);
  
  const isCommentOwner = user && user.id === comment.user?.id;
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      const result = await postService.updateComment(comment.id, editedContent);
      
      // Update comment in the UI
      comment.content = editedContent;
      
      // If the server returns updated comments count, update it
      if (result.commentsCount !== undefined && post) {
        setPost({
          ...post,
          commentsCount: result.commentsCount
        });
        
        // Store updated comments count in localStorage
        try {
          const postUpdates = JSON.parse(localStorage.getItem('postUpdates') || '{}');
          if (result.postId) {
            postUpdates[result.postId] = {
              ...postUpdates[result.postId] || {},
              commentsCount: result.commentsCount
            };
            localStorage.setItem('postUpdates', JSON.stringify(postUpdates));
            
            // Mark the feed for refresh when returning
            markFeedForRefresh();
          }
        } catch (err) {
          console.error('Failed to store post updates', err);
        }
      }
      
      // End editing mode
      setIsEditing(false);
      toast.success('התגובה עודכנה בהצלחה');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('אירעה שגיאה בעדכון התגובה. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLikeComment = () => {
    setIsLiked(!isLiked);
    if (onLike) {
      onLike();
    }
  };
  
  return (
    <div className="comment-item animate-fade-in">
      <div className="comment-header">
        <div className="comment-user-info">
          <Link to={`/profile/${comment.user?.id}`}>
            {comment.user?.profilePicture ? (
              <img 
                src={comment.user.profilePicture} 
                alt={comment.user?.username || 'משתמש'} 
                className="comment-avatar"
              />
            ) : (
              <AnonymousAvatar size="sm" className="comment-avatar" />
            )}
          </Link>
          
          <div>
            <Link to={`/profile/${comment.user?.id}`} className="comment-username">
              {comment.user?.username || 'משתמש'}
            </Link>
            <span className="comment-date">
              {comment.createdAt ? formatRelativeTime(comment.createdAt) : ''}
            </span>
          </div>
        </div>
        
        <div className="comment-actions">
          {user && (
            <button 
              onClick={handleLikeComment} 
              className={`btn-comment-like ${isLiked ? 'liked' : ''}`}
            >
              {isLiked ? FaHeart({}) : FaRegHeart({})}
            </button>
          )}
          
          {isCommentOwner && !isEditing && (
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
  const { authState } = useAuth();
  const { user } = authState;
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
  const [commentError, setCommentError] = useState<string | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Fetch post and comments
  useEffect(() => {
    const fetchPostAndComments = async () => {
      if (!postId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch post
        const postData = await postService.getPostById(postId, 5);
        
        let postObj: Post | null = null;
        
        // נסיון למצוא את אובייקט הפוסט ממספר מבנים אפשריים בתגובה
        if (postData.data && typeof postData.data === 'object') {
          console.log('Post found in postData.data');
          postObj = postData.data as Post;
        } else if (postData.post && typeof postData.post === 'object') {
          console.log('Post found in postData.post');
          postObj = postData.post as Post;
        } else if (postData && typeof postData === 'object' && (postData as any).content) {
          console.log('Post found directly in postData');
          postObj = postData as unknown as Post;
        }
        
        if (!postObj) {
          console.error('Could not find valid post object in API response:', postData);
          throw new Error('לא נמצאו נתוני פוסט תקינים');
        }
        
        // וידוא שהפוסט מכיל את כל השדות הנדרשים
        if (!postObj.user || typeof postObj.user !== 'object') {
          console.warn('Post has no user object, creating placeholder');
          postObj.user = {
            id: 'unknown',
            _id: 'unknown',
            username: 'משתמש'
          };
        }
        
        // וידוא שלפוסט יש מזהה
        if (!postObj.id && (postObj as any)._id) {
          postObj.id = (postObj as any)._id;
        }
        
        console.log('Processed post object:', {
          id: postObj.id,
          content: postObj.content?.substring(0, 30),
          user: postObj.user ? {
            id: postObj.user.id || postObj.user._id,
            username: postObj.user.username
          } : 'No user'
        });
        
        setPost(postObj);
        
        // Fetch comments
        try {
          const commentsData = await postService.getCommentsByPost(postId);
          if (commentsData) {
            setComments(commentsData.comments || []);
            if (commentsData.pagination) {
              setPagination(commentsData.pagination);
            }
          }
        } catch (commentError) {
          console.error('Error fetching comments:', commentError);
          // עדיין נציג את הפוסט אפילו אם טעינת התגובות נכשלה
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError(typeof error === 'string' ? error : 'אירעה שגיאה בטעינת הפוסט');
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('אירעה שגיאה בטעינת התגובות');
    }
  };
  
  // Handle adding new comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postId || !newComment.trim()) {
      setCommentError('יש להזין תוכן לתגובה');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      setCommentError('אתה צריך להתחבר כדי להוסיף תגובה');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    
    setSubmitting(true);
    setCommentError(null);
    
    try {
      const result = await postService.createComment(postId, newComment);
      
      // Create new comment object
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
      
      // Add new comment to comments list
      setComments([newCommentObj, ...comments]);
      
      // Update comments count in post
      if (post && result.commentsCount !== undefined) {
        setPost({
          ...post,
          commentsCount: result.commentsCount
        });
      } else if (post) {
        // If server didn't return updated count, increment by 1
        setPost({
          ...post,
          commentsCount: (post.commentsCount || 0) + 1
        });
      }
      
      // Clear comment input
      setNewComment('');
      toast.success('התגובה נוספה בהצלחה');
      
    } catch (error: any) {
      console.error('Error adding comment:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403 || 
         error.message?.includes('אתה לא מחובר') || error.message?.includes('פג תוקף')) {
        setCommentError('פג תוקף ההתחברות. אנא התחבר מחדש כדי להוסיף תגובה.');
        toast.error('יש להתחבר מחדש כדי להוסיף תגובה');
      } else {
        setCommentError(error.message || 'אירעה שגיאה בהוספת התגובה. אנא נסה שוב מאוחר יותר.');
        toast.error('אירעה שגיאה בהוספת התגובה');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle like toggle
  const handleLike = async () => {
    if (!postId || !post) return;
    
    try {
      // Check if user is authenticated
      if (!user) {
        setError('אתה צריך להתחבר כדי לסמן לייק');
        toast.info('התחבר כדי לסמן לייק');
        setTimeout(() => navigate('/login'), 1500);
        return;
      }
      
      const response = await postService.toggleLike(postId);
      
      if (response) {
        const likeData = response.data || response;
        const isLiked = likeData.liked !== undefined ? likeData.liked : !post.liked;
        const newLikesCount = likeData.likesCount !== undefined ? 
          likeData.likesCount : 
          (isLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1));
        
        // Apply like animation if liking (not unliking)
        if (isLiked && !post.liked) {
          setIsLikeAnimating(true);
          setTimeout(() => setIsLikeAnimating(false), 1000);
        }
        
        setPost({
          ...post,
          liked: isLiked,
          likesCount: newLikesCount
        });
        
        if (isLiked) {
          toast.success('הוספת לייק לפוסט');
        }
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403 || 
         error.message?.includes('אתה לא מחובר') || error.message?.includes('פג תוקף')) {
        setError('פג תוקף ההתחברות. אנא התחבר מחדש כדי לסמן לייק.');
        toast.error('יש להתחבר מחדש כדי לסמן לייק');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(error.message || 'אירעה שגיאה בהוספת לייק. אנא נסה שוב מאוחר יותר.');
        toast.error('אירעה שגיאה בהוספת לייק');
        setTimeout(() => setError(null), 3000);
      }
    }
  };
  
  // Handle post delete
  const handleDelete = async () => {
    if (!postId || !post || isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await postService.deletePost(postId);
      toast.success('הפוסט נמחק בהצלחה');
      navigate('/');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('אירעה שגיאה במחיקת הפוסט');
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };
  
  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!commentId) return;
    
    try {
      // Check if user is authenticated
      if (!user) {
        setError('אתה צריך להתחבר כדי למחוק תגובה');
        toast.info('התחבר כדי למחוק תגובה');
        setTimeout(() => navigate('/login'), 1500);
        return;
      }
      
      const result = await postService.deleteComment(commentId);
      
      // Update comments list in UI
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      // Update comments count in post
      if (result && result.commentsCount !== undefined && post) {
        setPost({
          ...post,
          commentsCount: result.commentsCount
        });
      } else if (post) {
        // If server didn't return updated count, decrement by 1
        setPost({
          ...post,
          commentsCount: Math.max(0, (post.commentsCount || 0) - 1)
        });
      }
      
      toast.success('התגובה נמחקה בהצלחה');
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403 || 
         error.message?.includes('אתה לא מחובר') || error.message?.includes('פג תוקף')) {
        setError('פג תוקף ההתחברות. אנא התחבר מחדש כדי למחוק תגובה.');
        toast.error('יש להתחבר מחדש כדי למחוק תגובה');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(error.message || 'אירעה שגיאה במחיקת התגובה. אנא נסה שוב מאוחר יותר.');
        toast.error('אירעה שגיאה במחיקת התגובה');
        setTimeout(() => setError(null), 3000);
      }
    }
  };
  
  // Handle share post
  const handleShare = () => {
    setShowShareOptions(!showShareOptions);
  };
  
  // Handle share on various platforms
  const shareUrl = window.location.href;
  const sharePost = (platform: string) => {
    const postTitle = post?.content?.substring(0, 50) || 'שיתוף פוסט מ-GYMbro';
    let shareUrl = '';
    
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(postTitle + ' ' + window.location.href)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(postTitle)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(window.location.href);
        toast.success('הקישור הועתק ללוח');
        setShowShareOptions(false);
        return;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank');
    setShowShareOptions(false);
  };

  // Focus on comment input when requested
  const focusCommentInput = () => {
    if (commentInputRef.current) {
      commentInputRef.current.focus();
      // Scroll to comment input
      commentInputRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="post-detail-container animate-fade-in">
      <div className="post-detail-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          {FaArrowRight({})} חזרה
        </button>
        <h1 className="post-detail-title">
          {post?.user?.username ? `פוסט מאת ${post.user.username}` : 'פוסט'}
        </h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      
      {loading ? (
        <div className="loading-spinner"></div>
      ) : post ? (
        <div className="post-detail">
          <div className="post-detail-content">
            <div className="post-detail-user">
              {post.user && (
                <Link to={`/profile/${post.user?._id || post.user?.id}`}>
                  {post.user?.profilePicture ? (
                    <img 
                      src={post.user.profilePicture} 
                      alt={post.user?.username || 'משתמש'} 
                      className="post-avatar"
                    />
                  ) : (
                    <AnonymousAvatar size="md" className="post-avatar" />
                  )}
                </Link>
              )}
              
              <div>
                {post.user && (
                  <Link to={`/profile/${post.user?._id || post.user?.id}`} className="post-username">
                    {post.user?.username || 'משתמש'}
                  </Link>
                )}
                <span className="post-date">
                  {post.createdAt ? formatFullDate(post.createdAt) : ''}
                </span>
              </div>
            </div>
            
            {post.image && (
              <div className="post-detail-image-container">
                <img 
                  src={post.image} 
                  alt="תוכן הפוסט" 
                  className="post-detail-image"
                  loading="lazy"
                  onError={(e) => {
                    console.error(`Failed to load image for post detail ${post.id || post._id}:`, post.image);
                    // Set a fallback or hide the image container if loading fails
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    // Find parent container and hide it too
                    const container = target.closest('.post-detail-image-container');
                    if (container) {
                      (container as HTMLElement).style.display = 'none';
                    }
                  }}
                />
              </div>
            )}
            
            <p className="post-detail-text">{post.content}</p>
            
            <div className="post-detail-actions">
              <button 
                onClick={handleLike} 
                className={`btn-like ${post.liked ? 'liked' : ''} ${isLikeAnimating ? 'animate-like' : ''}`}
                aria-label={post.liked ? 'בטל לייק' : 'סמן לייק'}
              >
                {post.liked ? FaHeart({}) : FaRegHeart({})} {post.likesCount}
              </button>
              
              <button 
                className="btn-comment-link"
                onClick={focusCommentInput}
                aria-label="הוסף תגובה"
              >
                {FaComment({})} {post.commentsCount}
              </button>
              
              <div className="post-share-container">
                <button 
                  onClick={handleShare}
                  className="btn-share"
                  aria-label="שתף פוסט"
                >
                  {FaShareAlt({})}
                </button>
                
                {showShareOptions && (
                  <div className="share-options">
                    <button onClick={() => sharePost('whatsapp')} className="btn-share-option">
                      {FaWhatsapp({})} וואטסאפ
                    </button>
                    <button onClick={() => sharePost('telegram')} className="btn-share-option">
                      {FaTelegram({})} טלגרם
                    </button>
                    <button onClick={() => sharePost('copy')} className="btn-share-option">
                      {FaCopy({})} העתק קישור
                    </button>
                  </div>
                )}
              </div>
              
              {user && user.id === post.user?.id && (
                <>
                  <Link to={`/edit-post/${post.id}`} className="btn-edit">
                    {FaEdit({})} ערוך
                  </Link>
                  <button 
                    onClick={() => setShowConfirmDelete(true)} 
                    className="btn-delete"
                  >
                    {FaTrash({})} מחק
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Comment form */}
          {user ? (
            <form onSubmit={handleAddComment} className="comment-form">
              {commentError && (
                <div className="alert alert-danger comment-error">
                  {commentError}
                </div>
              )}
              <textarea
                ref={commentInputRef}
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
          
          {/* Comments section */}
          <div className="comments-container">
            <h3 className="comments-title">
              {FaComments({})} תגובות {post.commentsCount}
            </h3>
            
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
            ) : (
              <p className="no-comments">אין תגובות עדיין. היה הראשון להגיב!</p>
            )}
          </div>
        </div>
      ) : (
        <div className="not-found">הפוסט לא נמצא</div>
      )}
      
      {/* Delete confirmation modal */}
      {showConfirmDelete && (
        <div className="delete-confirm-overlay" onClick={() => !isDeleting && setShowConfirmDelete(false)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>מחיקת פוסט</h4>
            <p>האם אתה בטוח שברצונך למחוק את הפוסט הזה? לא ניתן לבטל פעולה זו.</p>
            <div className="delete-confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
              >
                ביטול
              </button>
              <button 
                className="btn-delete" 
                onClick={handleDelete}
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

export default PostDetail; 