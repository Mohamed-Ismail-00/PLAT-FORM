import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DashboardLayout, ProtectedRoute } from './components/Layout';

// Pages
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UsersList from './pages/UsersList';
import StudentsOverview from './pages/StudentsOverview';
import StudentsSection from './pages/StudentsSection';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login removed as requested */}
          
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/admin" replace />} />
            
            {/* Student Routes */}
            <Route path="student" element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            
            {/* Instructor Routes */}
            <Route path="instructor" element={
              <ProtectedRoute role="instructor">
                <InstructorDashboard />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="admin" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="admin/users" element={
              <ProtectedRoute role="admin">
                <UsersList />
              </ProtectedRoute>
            } />
            <Route path="admin/users/:id" element={
              <ProtectedRoute role="admin">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="admin/students-overview" element={
              <ProtectedRoute role="admin">
                <StudentsOverview />
              </ProtectedRoute>
            } />
            <Route path="admin/students" element={
              <ProtectedRoute role="admin">
                <StudentsSection />
              </ProtectedRoute>
            } />
            <Route path="admin/students/:id" element={
              <ProtectedRoute role="admin">
                <StudentDashboard />
              </ProtectedRoute>
            } />
          </Route>
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
