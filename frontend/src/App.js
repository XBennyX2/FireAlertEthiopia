import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import { LanguageProvider } from './context/LanguageContext';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { ToastProvider } from './context/ToastContext';
import IncidentDetailPage from './pages/IncidentDetailPage';
import ForumPage from './pages/ForumPage';
import ForumPostPage from './pages/ForumPostPage';
import ApplyResponderPage from './pages/ApplyResponderPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import SafetyPage from './pages/SafetyPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import TwoFactorPage from './pages/TwoFactorPage';
import ServerErrorPage from './pages/ServerErrorPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PublicFeedPage from './pages/PublicFeedPage';
import UserDetailPage from './pages/UserDetailPage';
import MessagingPage from './pages/MessagingPage';
import GuestReportPage from './pages/GuestReportPage';

// Public route — no auth needed



// ── M1: Skip-to-content link ─────────────────────────────────────
// Rendered inside the Router so it's present on every page.
// Each page's main region must have id="main-content" to receive focus.
function SkipToContent() {
  return (
    <a
      href="#main-content"
      style={{
        position:     'absolute',
        top:          -50,
        left:         0,
        background:   '#f4820a',
        color:        '#fff',
        padding:      '0.5rem 1rem',
        zIndex:       99999,
        borderRadius: '0 0 8px 0',
        fontWeight:   700,
        fontSize:     '0.875rem',
        transition:   'top 0.15s',
        textDecoration: 'none',
      }}
      onFocus={e  => { e.currentTarget.style.top = '0'; }}
      onBlur={e   => { e.currentTarget.style.top = '-50px'; }}
    >
      Skip to content
    </a>
  );
}

// ── M2: Announce route changes to screen readers ─────────────────
// A visually-hidden live region that updates whenever the route changes,
// so screen-reader users know a navigation has occurred.
function RouteAnnouncer() {
  const location = useLocation();

  // Derive a human-readable page name from the pathname
  const pageName = (() => {
    const p = location.pathname;
    if (p === '/')               return 'Home';
    if (p === '/login')          return 'Sign in';
    if (p === '/register')       return 'Register';
    if (p === '/dashboard')      return 'Dashboard';
    if (p === '/report')         return 'Report a fire';
    if (p === '/responder')      return 'Responder dashboard';
    if (p === '/admin')          return 'Admin dashboard';
    if (p === '/analytics')      return 'Analytics';
    if (p === '/notifications')  return 'Notifications';
    if (p === '/profile')        return 'Profile';
    if (p === '/forum')          return 'Community forum';
    if (p === '/safety')         return 'Safety awareness';
    if (p === '/feed')           return 'Public feed';
    if (p.startsWith('/forum/')) return 'Forum post';
    if (p.startsWith('/incidents/')) return 'Incident details';
    if (p.startsWith('/admin/users/')) return 'User details';
    return 'Page';
  })();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position:   'absolute',
        width:      1,
        height:     1,
        overflow:   'hidden',
        clip:       'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
      }}
    >
      {`Navigated to ${pageName}`}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            {/* ── M1: Skip link — before any nav, visible on :focus ── */}
            <SkipToContent />

            {/* ── M2: Screen-reader route announcer ─────────────────── */}
            <RouteAnnouncer />

            <Routes>
              {/* ── Public routes ──────────────────────────────────── */}
              <Route path="/"                element={<LandingPage />} />
              <Route path="/login"           element={<LoginPage />} />
              <Route path="/register"        element={<RegisterPage />} />
              <Route path="/safety"          element={<SafetyPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password"  element={<ResetPasswordPage />} />
              <Route path="/verify-email"    element={<VerifyEmailPage />} />
              <Route path="/oauth-callback"  element={<OAuthCallbackPage />} />
              <Route path="/two-factor"      element={<TwoFactorPage />} />
              <Route path="/500"             element={<ServerErrorPage />} />
              <Route path="/feed"            element={<PublicFeedPage />} />
              <Route path="/report-guest" element={<GuestReportPage />} />

              {/* ── Auth-required routes ────────────────────────────── */}
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
              <Route path="/notifications" element={
                <ProtectedRoute allowedRoles={['user', 'responder', 'admin']}>
                  <NotificationsPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute allowedRoles={['user', 'responder', 'admin']}>
                  <ProfilePage />
                </ProtectedRoute>
              } />

              {/* ── User-only routes ────────────────────────────────── */}
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
              <Route path="/apply-responder" element={
                <ProtectedRoute allowedRoles={['user']}>
                  <ApplyResponderPage />
                </ProtectedRoute>
              } />

              {/* ── Responder-only routes ───────────────────────────── */}
              <Route path="/responder" element={
                <ProtectedRoute allowedRoles={['responder']}>
                  <ResponderDashboard />
                </ProtectedRoute>
              } />

              {/* ── Admin-only routes ───────────────────────────────── */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/users/:id" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute allowedRoles={['responder', 'admin']}>
                  <MessagingPage />
                </ProtectedRoute>
              } />
            </Routes>

            <PWAInstallPrompt />
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ToastProvider>
  );
}

export default App;