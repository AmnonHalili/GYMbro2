import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPosts } from '../services/postService';
import { fixEmptyImages } from '../services/api';
import PostCard from './PostCard';
import { Post as PostType } from '../types';

interface LocalPost {
  _id: string;
  id: string;
  content: string;
  image?: string;
  user: {
    _id: string;
    id: string;
    username: string;
    profilePicture?: string;
  };
  createdAt: string;
  likesCount: number;
  commentsCount: number;
}

interface PostsState {
  items: LocalPost[];
  loading: boolean;
  error: string | null;
}

const PostList: React.FC = () => {
  // הגדרת סטייט מקומי במקום רדקס
  const [postsState, setPostsState] = useState<PostsState>({
    items: [],
    loading: true,
    error: null
  });
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [imageFixStatus, setImageFixStatus] = useState<{
    isFixing: boolean;
    result: null | {
      fixed: number;
      failed: number;
      errors: string[];
    };
  }>({
    isFixing: false,
    result: null
  });

  // טעינת נתוני משתמש מהלוקאל סטורג'
  useEffect(() => {
    const userDataString = localStorage.getItem('user');
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // פונקציה לטעינת פוסטים
  const fetchPostsData = async (pageNum: number, filterUserId: string | null = null, append: boolean = false) => {
    setPostsState(prev => ({ ...prev, loading: true }));
    
    try {
      // קריאה לשירות עם פרמטרים של עמוד ופילטר
      const response = await getPosts(pageNum, 10);
      
      // בדיקה שיש נתונים בתשובה
      if (!response || !response.data) {
        console.error('Error fetching posts: No data in response');
        throw new Error('לא התקבלו נתונים מהשרת');
      }
      
      const newPosts = response.data || [];
      console.log(`[PostList] קבלת ${newPosts.length} פוסטים מהשרת`);
      
      // מיפוי ועיבוד הפוסטים כדי לוודא שיש להם את כל השדות הנדרשים
      const processedPosts = newPosts.map((post: any) => {
        // וידוא שלפוסט יש גם id וגם _id
        const id = post.id || post._id;
        
        // וידוא שלמשתמש יש גם id וגם _id
        const userId = post.user?.id || post.user?._id;
        
        // יצירת אובייקט פוסט עם כל השדות הנדרשים
        const processedPost = {
          ...post,
          id,
          _id: id,
          user: {
            ...post.user,
            id: userId,
            _id: userId
          }
        };
        
        // טיפול בנתיבי תמונה
        if (post.image || post.imgUrl) {
          // איסוף כל מקורות התמונה האפשריים
          const imagePaths = [post.image, post.imgUrl].filter(Boolean);
          
          if (imagePaths.length > 0) {
            console.log(`[PostList] פוסט ${id} מכיל תמונות:`, imagePaths);
            
            // בחירת הנתיב הטוב ביותר (עדיפות לנתיב שמתחיל ב-/uploads/)
            let bestPath = imagePaths.find(path => path && path.includes('/uploads/')) || imagePaths[0];
            
            // וידוא שהנתיב מתחיל נכון
            if (bestPath && !bestPath.startsWith('/') && !bestPath.startsWith('http')) {
              bestPath = '/' + bestPath;
            }
            
            // שמירת אותו נתיב בשני השדות
            processedPost.image = bestPath;
            processedPost.imgUrl = bestPath;
            
            console.log(`[PostList] נתיב תמונה סופי לפוסט ${id}: ${bestPath}`);
          }
        } else {
          console.log(`[PostList] פוסט ${id} ללא תמונות`);
        }
        
        return processedPost;
      });
      
      const hasMoreItems = processedPosts.length === 10;
      
      console.log(`[PostList] עיבוד ${processedPosts.length} פוסטים, עוד נתונים: ${hasMoreItems}`);
      
      setPostsState(prev => ({
        items: append ? [...prev.items, ...processedPosts] : processedPosts,
        loading: false,
        error: null
      }));
      
      setHasMore(hasMoreItems);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPostsState(prev => ({
        ...prev,
        loading: false,
        error: 'שגיאה בטעינת פוסטים'
      }));
    }
  };

  // פונקציה לשינוי הפילטר
  const handleFilterChange = (userId: string | null) => {
    setFilter(userId);
    setPage(1);
    fetchPostsData(1, userId);
  };

  // פונקציה לטעינת עוד פוסטים
  const loadMorePosts = () => {
    if (!postsState.loading && hasMore) {
      const nextPage = page + 1;
      fetchPostsData(nextPage, filter, true);
      setPage(nextPage);
    }
  };

  // פונקציה לתיקון תמונות ריקות
  const handleFixEmptyImages = async () => {
    setImageFixStatus({
      isFixing: true,
      result: null
    });
    
    try {
      const result = await fixEmptyImages();
      
      setImageFixStatus({
        isFixing: false,
        result
      });
      
      // רענון הפוסטים אם נמצאו ותוקנו קבצים
      if (result.fixed > 0) {
        fetchPostsData(1, filter);
        setPage(1);
      }
      
      // הצגת הודעה למשתמש
      alert(`תיקון תמונות הושלם: ${result.fixed} תמונות תוקנו, ${result.failed} נכשלו`);
    } catch (error) {
      console.error('Error fixing images:', error);
      setImageFixStatus({
        isFixing: false,
        result: {
          fixed: 0,
          failed: 0,
          errors: [String(error)]
        }
      });
      
      alert('שגיאה בתיקון תמונות: ' + error);
    }
  };

  // טעינת פוסטים ראשונית
  useEffect(() => {
    fetchPostsData(1, filter);
  }, []);

  return (
    <div className="post-list-container">
      <div className="post-list-header">
        <h2>פוסטים</h2>
        <div className="post-list-controls">
          {user && (
            <Link to="/posts/new" className="btn-primary">
              פוסט חדש
            </Link>
          )}
          
          <div className="filter-controls">
            <button
              className={`filter-btn ${filter === null ? 'active' : ''}`}
              onClick={() => handleFilterChange(null)}
            >
              כל הפוסטים
            </button>
            {user && (
              <button
                className={`filter-btn ${filter === user._id ? 'active' : ''}`}
                onClick={() => handleFilterChange(user._id)}
              >
                הפוסטים שלי
              </button>
            )}
          </div>
          
          {/* כפתור לתיקון תמונות ריקות - יוצג רק למנהלים */}
          {user?.isAdmin && (
            <button
              className="btn-secondary"
              onClick={handleFixEmptyImages}
              disabled={imageFixStatus.isFixing}
            >
              {imageFixStatus.isFixing ? 'מתקן תמונות...' : 'תקן תמונות ריקות'}
            </button>
          )}
        </div>
      </div>

      {postsState.loading && page === 1 && (
        <div className="loading-spinner">טוען פוסטים...</div>
      )}

      {postsState.error && (
        <div className="error-message">שגיאה בטעינת פוסטים: {postsState.error}</div>
      )}

      <div className="post-grid">
        {postsState.items && postsState.items.length > 0 ? (
          postsState.items.map((post) => (
            <PostCard 
              key={post._id} 
              post={post} 
              onPostDeleted={() => fetchPostsData(1, filter)}
            />
          ))
        ) : !postsState.loading && (
          <div className="no-posts-message">אין פוסטים להצגה</div>
        )}
      </div>

      {postsState.loading && page > 1 && (
        <div className="loading-more">טוען פוסטים נוספים...</div>
      )}
      
      {!postsState.loading && hasMore && postsState.items.length > 0 && (
        <button className="load-more-btn" onClick={loadMorePosts}>
          טען עוד
        </button>
      )}
    </div>
  );
};

export default PostList; 