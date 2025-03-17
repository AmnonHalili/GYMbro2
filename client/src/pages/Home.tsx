import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as postService from '../services/postService';
import { Post, Pagination as PaginationType } from '../types';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

// Pagination component
const Pagination: React.FC<{
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}> = ({ pagination, onPageChange }) => {
  const { page, pages } = pagination;

  return (
    <div className="pagination">
      <button 
        className="btn btn-secondary"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        הקודם
      </button>
      
      <span className="pagination-info">עמוד {page} מתוך {pages}</span>
      
      <button 
        className="btn btn-secondary"
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
      >
        הבא
      </button>
    </div>
  );
};

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
  const { state } = useAuth();
  const { user } = state;

  // Fetch posts
  const fetchPosts = async (page: number = 1) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // אם העמוד נטען, נטען את הפוסטים
  useEffect(() => {
    // אם אנחנו מנווטים בחזרה לדף הבית אחרי הוספת תגובה,
    // נוודא שהנתונים מתרעננים
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
  };

  // Toggle filter
  const toggleFilter = () => {
    setShowUserPostsOnly(!showUserPostsOnly);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>פיד הפוסטים</h2>
        
        <div className="d-flex gap-2">
          <Link to="/create-post" className="btn btn-primary">
            <i className="fas fa-plus me-1"></i> פוסט חדש
          </Link>
          
          {state.isAuthenticated && (
            <button 
              className={`btn ${showUserPostsOnly ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={toggleFilter}
            >
              {showUserPostsOnly ? 'הפוסטים שלי' : 'כל הפוסטים'}
            </button>
          )}
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {loading ? (
        <div className="d-flex justify-content-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">טוען...</span>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="alert alert-info text-center p-5">
          <p className="mb-3">אין פוסטים להצגה כרגע.</p>
          {showUserPostsOnly && state.isAuthenticated && (
            <Link to="/create-post" className="btn btn-primary">
              צור את הפוסט הראשון שלך
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="row">
            {posts.map(post => (
              <div key={post.id || post._id} className="col-md-6 col-lg-4 mb-4">
                <PostCard post={post} />
              </div>
            ))}
          </div>
          
          {pagination.pages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination 
                pagination={pagination} 
                onPageChange={handlePageChange} 
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home; 