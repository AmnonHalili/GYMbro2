import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as postService from '../services/postService';
import { Post, Pagination as PaginationType } from '../types';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { 
  FaAngleRight, 
  FaAngleLeft, 
  FaSync, 
  FaPlus, 
  FaFilter 
} from 'react-icons/fa';
// @ts-ignore
import { toast } from 'react-toastify';

// Pagination component
const Pagination: React.FC<{
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}> = ({ pagination, onPageChange }) => {
  const { page, pages } = pagination;

  return (
    <div className="pagination-container">
      <button 
        className="pagination-btn"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="לעמוד הקודם"
      >
        {FaAngleRight({ className: "icon" })}
      </button>
      
      <span className="pagination-info">עמוד {page} מתוך {pages}</span>
      
      <button 
        className="pagination-btn"
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
        aria-label="לעמוד הבא"
      >
        {FaAngleLeft({ className: "icon" })}
      </button>
    </div>
  );
};

// Skeleton loading component
const PostCardSkeleton: React.FC = () => (
  <div className="card post-card skeleton-card">
    <div className="skeleton-image"></div>
    <div className="card-body">
      <div className="skeleton-header">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-text-container">
          <div className="skeleton-text skeleton-title"></div>
          <div className="skeleton-text skeleton-subtitle"></div>
        </div>
      </div>
      <div className="skeleton-text"></div>
      <div className="skeleton-text"></div>
      <div className="skeleton-text skeleton-text-short"></div>
    </div>
    <div className="card-footer">
      <div className="skeleton-footer">
        <div className="skeleton-action"></div>
        <div className="skeleton-action"></div>
      </div>
    </div>
  </div>
);

// פונקציה לסימון דף הפיד שצריך לרענן את הנתונים אחרי חזרה
export const markFeedForRefresh = () => {
  sessionStorage.setItem('shouldRefreshPosts', 'true');
};

// Main component
const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserPostsOnly, setShowUserPostsOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { authState } = useAuth();
  const { user } = authState;

  // Fetch posts
  const fetchPosts = async (page: number = 1, showRefreshAnimation: boolean = false) => {
    if (showRefreshAnimation) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      let response;
      
      if (showUserPostsOnly && user?.id) {
        response = await postService.getUserPosts(user.id, page);
      } else {
        response = await postService.getPosts(page);
      }
      
      console.log('Fetched posts response:', response);
      
      if (Array.isArray(response)) {
        setPosts(response);
      } else if (response.data && Array.isArray(response.data)) {
        setPosts(response.data);
      } else if (response.posts) {
        setPosts((response.posts as unknown) as Post[]);
      } else {
        console.error('Unexpected posts response format:', response);
        setPosts([]);
      }
      
      if (response.pagination) {
        setPagination({
          ...pagination,
          ...response.pagination
        });
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('אירעה שגיאה בטעינת הפוסטים. אנא נסה שוב מאוחר יותר.');
      toast.error('לא ניתן לטעון את הפוסטים כרגע. נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load posts when component mounts or filter changes
  useEffect(() => {
    // Check if we should refresh data after navigation
    const shouldRefreshData = sessionStorage.getItem('shouldRefreshPosts') === 'true';
    
    if (shouldRefreshData) {
      console.log('Refreshing posts data after navigation');
      sessionStorage.removeItem('shouldRefreshPosts');
    }
    
    fetchPosts();
  }, [showUserPostsOnly]);

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchPosts(page);
    // Scroll to top after page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle filter
  const toggleFilter = () => {
    setShowUserPostsOnly(!showUserPostsOnly);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchPosts(pagination.page, true);
    toast.info('מרענן פוסטים...');
  };

  // Handle post deletion
  const handlePostDeleted = () => {
    fetchPosts(pagination.page);
    toast.success('הפוסט נמחק בהצלחה');
  };

  // Generate skeleton cards for loading state
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, index) => (
      <div key={`skeleton-${index}`} className="col-md-6 col-lg-4 mb-4">
        <PostCardSkeleton />
      </div>
    ));
  };

  return (
    <div className="feed-container container mt-4">
      <div className="feed-header">
        <div className="feed-title">
          <h2>פיד הפוסטים</h2>
          
          <button 
            className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            disabled={loading || refreshing}
            aria-label="רענן פוסטים"
          >
            {FaSync({ className: "icon" })}
          </button>
        </div>
        
        <div className="feed-actions">
          <Link to="/create-post" className="btn-create-post">
            {FaPlus({ className: "icon" })} פוסט חדש
          </Link>
          
          {authState.isAuthenticated && (
            <button 
              className={`btn-filter ${showUserPostsOnly ? 'active' : ''}`}
              onClick={toggleFilter}
              aria-label={showUserPostsOnly ? 'הצג את כל הפוסטים' : 'הצג רק את הפוסטים שלי'}
            >
              {FaFilter({ className: "icon" })}
              <span>{showUserPostsOnly ? 'הפוסטים שלי' : 'כל הפוסטים'}</span>
            </button>
          )}
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="row">
        {loading ? (
          renderSkeletons()
        ) : posts.length === 0 ? (
          <div className="empty-posts-container">
            <div className="empty-posts-message">
              <h3>אין פוסטים להצגה כרגע</h3>
              <p>{showUserPostsOnly ? 'עדיין לא פרסמת פוסטים.' : 'אין פוסטים זמינים כרגע.'}</p>
              
              {authState.isAuthenticated && (
                <Link to="/create-post" className="btn-create-first">
                  {FaPlus({ className: "icon" })} 
                  {showUserPostsOnly ? 'צור את הפוסט הראשון שלך' : 'פרסם פוסט חדש'}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <div key={post.id || post._id} className="col-md-6 col-lg-4 mb-4">
                <PostCard post={post} onPostDeleted={handlePostDeleted} />
              </div>
            ))}
          </>
        )}
      </div>
      
      {!loading && posts.length > 0 && pagination.pages > 1 && (
        <div className="pagination-wrapper">
          <Pagination 
            pagination={pagination} 
            onPageChange={handlePageChange} 
          />
        </div>
      )}
    </div>
  );
};

export default Home; 