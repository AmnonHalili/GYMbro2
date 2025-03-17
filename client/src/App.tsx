import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './styles/theme.css';

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

// Import Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import FloatingButton from './components/FloatingButton';

const App: React.FC = () => {
  return (
    <div className="app">
      <Navbar />
      <main className="content">
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
          <Route path="/nutrition-advice" element={<NutritionAdvice />} />
          <Route path="/nutritional-calculator" element={<NutritionalCalculator />} />
          <Route path="/workout-planner" element={<WorkoutPlanner />} />
          
          {/* Fallback route */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </main>
      <FloatingButton />
    </div>
  );
};

export default App;
