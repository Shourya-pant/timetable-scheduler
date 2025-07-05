import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute.tsx';

// Import pages
import Landing from './pages/Landing.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import DeptDashboard from './pages/DeptDashboard.tsx';
import CreateTimetable from './pages/CreateTimetable.tsx';
import Results from './pages/Results.tsx';

// Import styles
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes for admin */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Protected routes for department heads */}
            <Route
              path="/dept/dashboard"
              element={
                <ProtectedRoute requiredRole="dept_head">
                  <DeptDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Protected routes for timetable creation wizard */}
            <Route
              path="/dept/create-timetable"
              element={
                <ProtectedRoute requiredRole="dept_head">
                  <CreateTimetable />
                </ProtectedRoute>
              }
            />
            
            {/* Protected routes for results */}
            <Route
              path="/dept/results/:timetableId"
              element={
                <ProtectedRoute requiredRole="dept_head">
                  <Results />
                </ProtectedRoute>
              }
            />
            
            {/* Admin results route */}
            <Route
              path="/admin/results/:timetableId"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Results />
                </ProtectedRoute>
              }
            />
            
            {/* Catch all route - redirect to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;