import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as userService from '../services/userService';
import * as postService from '../services/postService';
import { User, Post } from '../types';
import * as FaIcons from 'react-icons/fa';
import PostCard from '../components/PostCard';
import Chat from '../components/Chat/Chat';

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { user: currentUser } = authState;
  
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showChat, setShowChat] = useState(false);

  // הוספת משתנים לתצוגה ומיון
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [filterText, setFilterText] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  // טעינת פרופיל המשתמש
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let userProfile;
        
        // בדיקה האם להציג את הפרופיל של המשתמש המחובר או משתמש אחר
        if (!userId && authState.isAuthenticated && currentUser) {
          // הצגת פרופיל אישי כשמחוברים
          userProfile = currentUser;
          console.log('Using current user profile:', userProfile);
        } else if (userId) {
          // הצגת פרופיל לפי מזהה משתמש
          try {
            userProfile = await userService.getUserById(userId);
            console.log('Fetched user profile by ID:', userId);
          } catch (error: any) {
            console.error('Error fetching user by ID:', error);
            if (error.response?.status === 404) {
              setError(`משתמש עם מזהה ${userId} לא נמצא`);
            } else {
              setError('אירעה שגיאה בטעינת פרופיל המשתמש');
            }
            setLoading(false);
            return;
          }
        } else if (!authState.isAuthenticated) {
          // אם לא מחוברים וגם לא ביקשו משתמש ספציפי
          console.log('User not authenticated, redirecting to login');
          navigate('/login');
          return;
        }
        
        if (!userProfile) {
          setError('לא ניתן לטעון את פרופיל המשתמש');
          setLoading(false);
          return;
        }
        
        console.log('Setting user profile:', userProfile);
        setUser(userProfile);
        setLoading(false);
      } catch (error) {
        console.error('Error in profile data fetch:', error);
        setError('אירעה שגיאה בטעינת הפרופיל. אנא נסה שוב מאוחר יותר.');
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [userId, authState.isAuthenticated, currentUser, navigate]);

  // טעינת הפוסטים של המשתמש - בנפרד מטעינת המשתמש
  useEffect(() => {
    if (!user) return;
    
    const fetchUserPosts = async () => {
      setLoadingPosts(true);
      setPostsError(null);
      setPage(1);
      
      try {
        console.log('Fetching posts for user ID:', user.id);
        const response = await postService.getUserPosts(user.id, 1);
        console.log('User posts response processed by service:', response);
        
        // בדיקה שיש נתונים תקינים
        if (response && Array.isArray(response.data)) {
          console.log(`Setting ${response.data.length} posts for display`);
          setPosts(response.data);
          
          // בדיקה אם יש עוד עמודים
          const hasMorePages = response.pagination && response.pagination.pages 
            ? response.pagination.pages > 1 
            : false;
          console.log('Has more pages:', hasMorePages, response.pagination);
          setHasMore(hasMorePages);
          
          // יכול להיות שאין פוסטים בכלל
          if (response.data.length === 0) {
            console.log('No posts found for this user');
          }
        } else {
          console.warn('Invalid posts data format after processing:', response);
          setPosts([]);
          setHasMore(false);
          setPostsError('מבנה נתוני הפוסטים אינו תקין');
        }
      } catch (error: any) {
        console.error('Error fetching user posts:', error);
        setPosts([]);
        setHasMore(false);
        setPostsError('אירעה שגיאה בטעינת הפוסטים. ' + (error.message || ''));
      } finally {
        setLoadingPosts(false);
      }
    };
    
    fetchUserPosts();
  }, [user]);
  
  // טעינת פוסטים נוספים
  const loadMorePosts = async () => {
    if (!user || !hasMore || loadingMore) return;
    
    setLoadingMore(true);
    
    try {
      const nextPage = page + 1;
      console.log(`Loading more posts for user ${user.id}, page ${nextPage}`);
      const response = await postService.getUserPosts(user.id, nextPage);
      
      // בדיקה שיש נתונים תקינים
      if (response && Array.isArray(response.data)) {
        console.log(`Adding ${response.data.length} more posts`);
        setPosts(prevPosts => [...prevPosts, ...response.data]);
        setPage(nextPage);
        
        // בדיקה אם יש עוד עמודים
        const hasMorePages = response.pagination && response.pagination.pages 
          ? nextPage < response.pagination.pages 
          : false;
        console.log('Has more pages after load more:', hasMorePages);
        setHasMore(hasMorePages);
      } else {
        console.warn('Invalid additional posts data format:', response);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // פילטור ומיון פוסטים
  const getFilteredAndSortedPosts = () => {
    let filteredPosts = posts;
    
    // פילטור לפי טקסט
    if (filterText) {
      filteredPosts = filteredPosts.filter(post => 
        post.content.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    
    // מיון לפי הפרמטר הנבחר
    return filteredPosts.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'popular') {
        return b.likesCount - a.likesCount;
      }
      return 0;
    });
  };

  // רינדור הממשק בזמן טעינת המשתמש
  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">טוען פרופיל משתמש...</span>
        </div>
      </div>
    );
  }
  
  // רינדור כאשר יש שגיאה או שהמשתמש לא נמצא
  if (error || !user) {
    return <div className="alert alert-danger text-center my-4">{error || 'לא נמצא משתמש'}</div>;
  }

  const isOwnProfile = currentUser && user.id === currentUser.id;
  const filteredAndSortedPosts = getFilteredAndSortedPosts();

  return (
    <div className="container mt-4">
      {/* אזור פרטי המשתמש */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-3 text-center">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.username}
                  className="rounded-circle avatar-lg"
                  style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                />
              ) : (
                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto" 
                     style={{ width: '150px', height: '150px' }}>
                  <span className="text-secondary">{FaIcons.FaUser({ size: 50 })}</span>
                </div>
              )}
            </div>
            
            <div className="col-md-9">
              <h2 className="card-title mb-3">{user.username}</h2>
              
              {/* סטטיסטיקות משתמש */}
              <div className="row mb-3">
                <div className="col-4">
                  <div className="user-stat-card">
                    <p className="stat-number">{posts.length}</p>
                    <p className="stat-label">פוסטים</p>
                  </div>
                </div>
                <div className="col-4">
                  <div className="user-stat-card">
                    <p className="stat-number">{posts.reduce((total, post) => total + post.likesCount, 0)}</p>
                    <p className="stat-label">לייקים</p>
                  </div>
                </div>
                <div className="col-4">
                  <div className="user-stat-card">
                    <p className="stat-number">{posts.reduce((total, post) => total + post.commentsCount, 0)}</p>
                    <p className="stat-label">תגובות</p>
                  </div>
                </div>
              </div>

              {/* כפתורי פעולה */}
              <div className="d-flex gap-2">
                {isOwnProfile ? (
                  <Link to="/profile/edit" className="btn btn-primary">
                    ערוך פרופיל
                  </Link>
                ) : (
                  <>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowChat(!showChat)}
                    >
                      {showChat ? 'סגור צ׳אט' : 'צ׳אט'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* אזור הצ'אט */}
      {showChat && currentUser && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <Chat targetUserId={user.id} />
          </div>
        </div>
      )}

      {/* אזור הפוסטים */}
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="mb-0">הפוסטים של {user.username}</h3>
            <div className="d-flex gap-2">
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'popular')}
              >
                <option value="newest">החדשים ביותר</option>
                <option value="oldest">הישנים ביותר</option>
                <option value="popular">הפופולריים ביותר</option>
              </select>
              <input
                type="text"
                className="form-control"
                placeholder="חיפוש בפוסטים..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </div>

          {loadingPosts ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">טוען פוסטים...</span>
              </div>
            </div>
          ) : postsError ? (
            <div className="alert alert-danger">{postsError}</div>
          ) : filteredAndSortedPosts.length === 0 ? (
            <div className="text-center text-muted">
              {isOwnProfile ? 'אין לך עדיין פוסטים. צור פוסט חדש!' : 'אין פוסטים עדיין'}
            </div>
          ) : (
            <>
              <div className={`row ${viewMode === 'grid' ? 'g-4' : ''}`}>
                {filteredAndSortedPosts.map(post => (
                  <div key={post.id} className={viewMode === 'grid' ? 'col-md-4' : 'col-12'}>
                    <PostCard post={post} />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-4">
                  <button
                    className="btn btn-outline-primary"
                    onClick={loadMorePosts}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'טוען...' : 'טען עוד'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 