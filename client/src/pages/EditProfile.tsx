import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as userService from '../services/userService';
import * as FaIcons from 'react-icons/fa';

const EditProfile: React.FC = () => {
  const { state, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!state.isAuthenticated) {
      navigate('/login');
    } else if (state.user) {
      setUsername(state.user.username);
      if (state.user.profilePicture) {
        setPreviewUrl(state.user.profilePicture);
      }
    }
  }, [state.isAuthenticated, state.user, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      setProfileImage(file);
      
      // Create preview URL for display
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    if (!username.trim()) {
      setError('שם משתמש הוא שדה חובה');
      setLoading(false);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('username', username);
      
      if (profileImage) {
        formData.append('profilePicture', profileImage);
      }
      
      const response = await userService.updateProfile(formData);
      
      // Update user in context
      updateUser(response.user);
      
      setSuccess(true);
      setTimeout(() => {
        navigate(`/profile`);
      }, 2000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || 'אירעה שגיאה בעדכון הפרופיל';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!state.user) {
    return (
      <div className="d-flex justify-content-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">טוען...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h2 className="h5 mb-0">עריכת פרופיל</h2>
            </div>
            
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="alert alert-success" role="alert">
                  הפרופיל עודכן בהצלחה! מעביר אותך לדף הפרופיל...
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4 text-center">
                  <div className="position-relative d-inline-block">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="תמונת פרופיל"
                        className="rounded-circle"
                        style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div 
                        className="bg-light rounded-circle d-flex align-items-center justify-content-center" 
                        style={{ width: '150px', height: '150px' }}
                      >
                        <span className="text-secondary">{FaIcons.FaUser({ size: 50 })}</span>
                      </div>
                    )}
                    
                    <label 
                      htmlFor="profilePicture" 
                      className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-2 shadow-sm"
                      style={{ cursor: 'pointer' }}
                    >
                      <span>{FaIcons.FaCamera({})}</span>
                      <input
                        type="file"
                        id="profilePicture"
                        name="profilePicture"
                        accept="image/*"
                        className="d-none"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">שם משתמש</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                
                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={loading}
                  >
                    {loading ? 'מעדכן...' : 'שמור שינויים'}
                  </button>
                  
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={() => navigate('/profile')}
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile; 