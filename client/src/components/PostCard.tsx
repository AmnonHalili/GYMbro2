import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Post } from '../types';
import * as FaIcons from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import * as postService from '../services/postService';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { state } = useAuth();
  const [liked, setLiked] = React.useState(post.liked || false);
  const [likesCount, setLikesCount] = React.useState(post.likesCount);
  const [commentsCount, setCommentsCount] = React.useState(post.commentsCount);
  
  // מוודא שיש מזהה תקף לפוסט (id או _id)
  const postId = post.id || post._id;

  // ניסיון לשפר את הדיבאגינג
  useEffect(() => {
    console.log('Rendering PostCard for post:', {
      postId,
      title: post.content?.substring(0, 30),
      userId: post.user?.id,
      username: post.user?.username
    });
    
    // בדיקת תקינות הפוסט
    if (!postId) {
      console.error('Post has no valid ID:', post);
    }
  }, [post, postId]);
  
  // בדיקה אם יש עדכונים ב-localStorage בטעינה ואחרי כל שינוי ברשימת הפוסטים
  useEffect(() => {
    if (!postId) return; // אם אין מזהה תקף, לא מנסים לטעון עדכונים
    
    try {
      const postUpdates = JSON.parse(localStorage.getItem('postUpdates') || '{}');
      if (postUpdates[postId]) {
        const updates = postUpdates[postId];
        
        // עדכון מספר הלייקים אם יש עדכון ב-localStorage
        if (updates.likesCount !== undefined && updates.likesCount !== likesCount) {
          console.log(`Updating likes count for post ${postId} from ${likesCount} to ${updates.likesCount}`);
          setLikesCount(updates.likesCount);
        }
        
        // עדכון מספר התגובות אם יש עדכון ב-localStorage
        if (updates.commentsCount !== undefined && updates.commentsCount !== commentsCount) {
          console.log(`Updating comments count for post ${postId} from ${commentsCount} to ${updates.commentsCount}`);
          setCommentsCount(updates.commentsCount);
        }
      }
    } catch (err) {
      console.error('Failed to load post updates from localStorage', err);
    }
  }, [postId, likesCount, commentsCount]);
  
  // אם אין מזהה תקף לפוסט, מציג שגיאה
  if (!postId) {
    return (
      <div className="card h-100 shadow-sm">
        <div className="card-body">
          <p className="text-danger">שגיאה בטעינת הפוסט - חסר מזהה</p>
        </div>
      </div>
    );
  }
  
  const handleLike = async () => {
    if (!state.isAuthenticated) {
      return;
    }
    
    try {
      console.log('Toggling like for post:', postId);
      const response = await postService.toggleLike(postId);
      console.log('Like toggle response:', response);
      
      // טיפול בתשובה מהשרת
      if (response) {
        // במידה והתשובה מהשרת נמצאת באובייקט data או ישירות בתשובה
        const likeData = response.data || response;
        const isLiked = likeData?.liked !== undefined ? likeData.liked : !liked;
        const newLikesCount = likeData?.likesCount !== undefined ? 
          likeData.likesCount : 
          (isLiked ? likesCount + 1 : Math.max(0, likesCount - 1));
        
        console.log(`Updating post like status: liked=${isLiked}, likesCount=${newLikesCount}`);
        
        // עדכון מצב הלייק ומספר הלייקים בקומפוננט
        setLiked(isLiked);
        setLikesCount(newLikesCount);
        
        // שמירת מספר הלייקים המעודכן ב-localStorage
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
      // טיפול בשגיאה - אין צורך להציג התראה בעמוד הפיד
    }
  };
  
  // פונקציה לפורמט תאריך בעברית
  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'dd/MM/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return date;
    }
  };
  
  return (
    <div className="card h-100 shadow-sm animate-fade-in">
      {post.image && (
        <img 
          src={post.image} 
          className="card-img-top" 
          alt="תמונת פוסט"
          loading="lazy"
        />
      )}
      
      <div className="card-body">
        <div className="d-flex align-items-center mb-3">
          <Link to={`/profile/${post.user.id}`} className="text-decoration-none">
            <img 
              src={post.user.profilePicture || '/default-avatar.png'} 
              alt={post.user.username}
              className="rounded-circle post-avatar me-2"
              loading="lazy"
            />
          </Link>
          
          <div>
            <Link to={`/profile/${post.user.id}`} className="post-username text-decoration-none">
              {post.user.username}
            </Link>
            <div className="post-date">
              {formatDate(post.createdAt)}
            </div>
          </div>
        </div>
        
        <p className="card-text">{post.content}</p>
      </div>
      
      <div className="card-footer bg-white border-top-0">
        <div className="d-flex justify-content-between align-items-center">
          <button 
            className={`btn-like ${liked ? 'active' : ''}`}
            onClick={handleLike}
            disabled={!state.isAuthenticated}
            aria-label={liked ? 'בטל לייק' : 'הוסף לייק'}
          >
            {liked ? <span>{FaIcons.FaHeart({})}</span> : <span>{FaIcons.FaRegHeart({})}</span>} 
            <span>{likesCount}</span>
          </button>
          
          <Link to={`/post/${postId}`} className="btn-comment" aria-label="צפה בתגובות">
            <span>{FaIcons.FaComment({})}</span> 
            <span>{commentsCount}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PostCard; 