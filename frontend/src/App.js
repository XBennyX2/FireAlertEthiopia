import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProfilePage from './pages/ProfilePage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import ReportForm from './pages/ReportForm';
import ResponderDashboard from './pages/ResponderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotificationsPage from './pages/NotificationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SafetyAwarenessPage from './pages/SafetyAwarenessPage';
import { LanguageProvider } from './context/LanguageContext';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';
import { ToastProvider } from './context/ToastContext';
import IncidentDetailPage from './pages/IncidentDetailPage';
import ForumPage     from './pages/ForumPage';
import ForumPostPage from './pages/ForumPostPage';
import ApplyResponderPage from './pages/ApplyResponderPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import SafetyPage from './pages/SafetyPage';


function App() {
  return (
    <ToastProvider>
    <LanguageProvider>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/safety" element={<SafetyAwarenessPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/incidents/:id" element={
            <ProtectedRoute allowedRoles={['user', 'responder', 'admin']}>
              <IncidentDetailPage />
            </ProtectedRoute>
          } />
          <Route path="/forum" element={
  <ProtectedRoute allowedRoles={['user', 'responder', 'admin']}>
    <ForumPage />
  </ProtectedRoute>
} />
<Route path="/forum/:id" element={
  <ProtectedRoute allowedRoles={['user', 'responder', 'admin']}>
    <ForumPostPage />
  </ProtectedRoute>
} />
<Route
  path="/apply-responder"
  element={
    <ProtectedRoute allowedRoles={['user']}>
      <ApplyResponderPage />
    </ProtectedRoute>
  }
/>
<Route path="/verify-email" element={<VerifyEmailPage />} />

<Route path="/safety" element={<SafetyPage />} />

          {/* User-only routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserDashboard />
            </ProtectedRoute>
          } />
          <Route path="/report" element={
            <ProtectedRoute allowedRoles={['user']}>
              <ReportForm />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute allowedRoles={['user', 'responder', 'admin']}>
              <NotificationsPage />
            </ProtectedRoute>
          } />

          {/* Responder-only routes */}
          <Route path="/responder" element={
            <ProtectedRoute allowedRoles={['responder']}>
              <ResponderDashboard />
            </ProtectedRoute>
          } />

          {/* Admin-only routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['user', 'responder', 'admin']}>
              <ProfilePage />
            </ProtectedRoute>
          } />
        </Routes>
        {/* Public routes */}

      </Router>
    </AuthProvider>
    </LanguageProvider>
    </ToastProvider>
  );
}

export default App;