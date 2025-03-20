import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import './styles/theme.css';
import { setNavigate } from './services/api';
import { AuthProvider } from './context/AuthContext';
// @ts-ignore
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import NotFound from './pages/NotFound';
import EditProfile from './pages/EditProfile';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import NutritionAdvice from './pages/NutritionAdvice';
import NutritionalCalculator from './pages/NutritionalCalculator';
import WorkoutPlanner from './pages/WorkoutPlanner';
import Chat from './components/Chat/Chat';

// Import Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import FloatingButton from './components/FloatingButton';

const App: React.FC = () => {
  const navigate = useNavigate();
  
  // הגדר את פונקציית הניתוב לשימוש במערכת ה-API
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Private Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/profile/:userId" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/edit-profile" element={
            <PrivateRoute>
              <EditProfile />
            </PrivateRoute>
          } />
          <Route path="/create-post" element={
            <PrivateRoute>
              <CreatePost />
            </PrivateRoute>
          } />
          <Route path="/edit-post/:postId" element={
            <PrivateRoute>
              <EditPost />
            </PrivateRoute>
          } />
          <Route path="/post/:postId" element={<PostDetail />} />
          
          {/* AI Routes - Protected */}
          <Route path="/nutrition-advice" element={
            <PrivateRoute>
              <NutritionAdvice />
            </PrivateRoute>
          } />
          <Route path="/nutritional-calculator" element={
            <PrivateRoute>
              <NutritionalCalculator />
            </PrivateRoute>
          } />
          <Route path="/workout-planner" element={
            <PrivateRoute>
              <WorkoutPlanner />
            </PrivateRoute>
          } />

          {/* Chat Route - Protected */}
          <Route path="/chat" element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          } />
          
          {/* Fallback route */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Layout>

      {/* Toast notifications container */}
      <ToastContainer
        position="bottom-left"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </AuthProvider>
  );
};

export default App;
