import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as userService from '../services/userService';
import * as postService from '../services/postService';
import { User, Post } from '../types';
import * as FaIcons from 'react-icons/fa';
import PostCard from '../components/PostCard';
<<<<<<< HEAD
import AnonymousAvatar from '../components/AnonymousAvatar';
import '../styles/Profile.css';
=======
import Chat from '../components/Chat/Chat';
>>>>>>> 23761bd470e744bbadff045868c99f15de28739a

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
<<<<<<< HEAD
  const [totalPages, setTotalPages] = useState(1);
=======
  const [showChat, setShowChat] = useState(false);
>>>>>>> 23761bd470e744bbadff045868c99f15de28739a

  // הוספת משתנים לתצוגה ומיון
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [filterText, setFilterText] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  // טעינת פרופיל המשתמש
  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoading(true);
      setError('');

      const userIdToUse = userId || user?._id;
      
      // אם אין מזהה משתמש תקף, אין צורך להמשיך
      if (!userIdToUse) {
        setError('מזהה משתמש לא חוקי');
        setLoading(false);
        return;
      }

      try {
        const fetchedUser = await userService.getUserById(userIdToUse);
        setUser(fetchedUser);
        
        // השג את הפוסטים של המשתמש
        const postsResponse = await postService.getUserPosts(userIdToUse);
        setPosts(postsResponse.posts);
        if (postsResponse.pagination && postsResponse.pagination.pages) {
          setTotalPages(postsResponse.pagination.pages);
        }
      } catch (err) {
        console.error('שגיאה בטעינת פרופיל משתמש:', err);
        setError('שגיאה בטעינת פרופיל משתמש');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [userId, user?._id]);

  // טעינת הפוסטים של המשתמש - בנפרד מטעינת המשתמש
  useEffect(() => {
    if (!user) return;
    
    const fetchUserPosts = async () => {
      setLoadingPosts(true);
      setPostsError(null);
      setPage(1);
      
      try {
        // בדיקה מהו המזהה הנכון לשימוש - id או _id
        const userIdToUse = user.id || user._id || '';
        if (!userIdToUse) {
          throw new Error('מזהה משתמש חסר');
        }
        console.log('Fetching posts for user ID:', userIdToUse);
        const response = await postService.getUserPosts(userIdToUse, 1);
        console.log('User posts response processed by service:', response);
        
        // בדיקה שיש נתונים תקינים
        if (response && Array.isArray(response.posts)) {
          console.log(`Setting ${response.posts.length} posts for display`);
          setPosts(response.posts);
          
          // בדיקה אם יש עוד עמודים
          const hasMorePages = response.pagination && response.pagination.pages 
            ? page < response.pagination.pages 
            : false;
            
          setHasMore(hasMorePages);
          
          // יכול להיות שאין פוסטים בכלל
          if (response.posts.length === 0) {
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
      const userIdToUse = user.id || user._id || '';
      if (!userIdToUse) {
        throw new Error('מזהה משתמש חסר');
      }
      console.log(`Loading more posts for user ${userIdToUse}, page ${nextPage}`);
      const response = await postService.getUserPosts(userIdToUse, nextPage);
      
      // בדיקה שיש נתונים תקינים
      if (response && Array.isArray(response.posts)) {
        console.log(`Adding ${response.posts.length} more posts`);
        setPosts(prevPosts => [...prevPosts, ...response.posts]);
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

  // פונקציה לקבלת URL של תמונת הפרופיל
  const getProfilePictureUrl = (): string | null => {
    // אם אין משתמש, אין תמונה
    if (!user) {
      return null;
    }
    
    const { profilePicture } = user;
    
    // אם אין תמונת פרופיל בכלל
    if (!profilePicture) {
      console.log('אין תמונת פרופיל למשתמש:', user.username);
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
              <div className="profile-image mb-3">
                <div className="profile-avatar-container">
                  {(() => {
                    // נבדוק אם יש תמונת פרופיל תקינה
                    const profileUrl = getProfilePictureUrl();
                    
                    // במקרה של תמונת פרופיל תקינה, מציגים אותה
                    if (profileUrl) {
                      return (
                        <img 
                          src={profileUrl} 
                          alt={user?.username || 'משתמש'} 
                          className="profile-avatar"
                          onError={(e) => {
                            console.log('שגיאה בטעינת תמונת פרופיל:', e);
                            
                            // מסתירים את התמונה שנכשלה
                            e.currentTarget.style.display = 'none';
                            
                            // מציגים אווטאר אנונימי במקומה
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              // יוצרים תוכן חדש עם האווטאר
                              const fallbackDiv = document.createElement('div');
                              fallbackDiv.className = 'profile-avatar-fallback';
                              fallbackDiv.style.display = 'flex';
                              fallbackDiv.style.justifyContent = 'center';
                              fallbackDiv.style.alignItems = 'center';
                              fallbackDiv.style.width = '150px';
                              fallbackDiv.style.height = '150px';
                              
                              // מרנדרים את האווטאר האנונימי לתוך הדיב
                              const tempDiv = document.createElement('div');
                              tempDiv.innerHTML = `
                                <div style="
                                  width: 64px;
                                  height: 64px;
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
                                    width="38.4"
                                    height="38.4"
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
                      <div className="profile-avatar-fallback" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', width: '150px', height: '150px'}}>
                        <div style={{
                          width: '64px',
                          height: '64px',
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
                            width={38.4}
                            height={38.4}
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
              </div>
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