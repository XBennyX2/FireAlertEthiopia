import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import '../auth.css';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { t } = useLanguage();
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const { toast } = useToast();

  // ── Form state ────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // ── UI state ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [isBanned,     setIsBanned]     = useState(false);
  const [appealReason, setAppealReason] = useState('');

  // ── Field-level errors ────────────────────────────────────────────
  const [errors, setErrors] = useState({ email: '', password: '' });

  // ── Validation ────────────────────────────────────────────────────
  function validate() {
    const newErrors = { email: '', password: '' };
    let valid = true;

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email address.';
      valid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required.';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  }

  // ── Submit handler ────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsBanned(false); // Reset ban view on fresh submission attempt

    if (!validate()) return;

    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      
      // 2FA required — redirect to OTP screen
      if (data.requiresTwoFactor) {
        navigate('/two-factor', { state: { userId: data.userId, email: data.email } });
        return;
      }

      // Normal login
      login(data);

      // Toast on successful login
      toast.success('Welcome back!');

      if (data.role === 'admin')          navigate('/admin');
      else if (data.role === 'responder') navigate('/responder');
      else                                navigate('/dashboard');

    } catch (err) {
      const status  = err.response?.status;
      const message = err.response?.data?.message || 'Login failed. Please try again.';

      // Unverified account — send to verification page instead of showing error
      if (err.response?.data?.requiresVerification) {
        navigate('/verify-email', {
          state: {
            userId: err.response.data.userId,
            email:  err.response.data.email,
          },
        });
        return;
      }

      // Toast on error block
      toast.error(message);

      // Ban handler
      if (status === 403 && message.includes('banned')) {
        setIsBanned(true);
      }

      if (status === 423) {
        // Account locked
        setError(message);
        setIsLocked(true);
      } else {
        setError(message);
        setIsLocked(false);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      {/* Language Switcher placement inside the layout view */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10 }}>
        <LanguageSwitcher />
      </div>

      <div className="auth-card">

        {/* Logo */}
        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon">🔥</div>
          <span className="auth-logo-text">{t.appName}</span>
        </Link>

        {/* Heading */}
        <h1 className="auth-heading">{t.welcomeBack}</h1>
        <p className="auth-subheading">{t.signInSubtitle}</p>

        {/* Global error */}
        {error && (
          <div className="auth-global-error">
            {isLocked && '🔒 '}{error}
          </div>
        )}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>

          {/* Email field */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">{t.emailLabel}</label>
            <input
              id="email"
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          {/* Password field */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">{t.passwordLabel}</label>
            <input
              id="password"
              type="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div style={{ textAlign:'right', marginTop:'-0.5rem', marginBottom:'0.25rem' }}>
            <Link
              to="/forgot-password"
              style={{ fontSize:'0.78rem', color:'var(--fire-orange)', textDecoration:'none' }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t.signingIn : t.signIn}
          </button>

        </form>

        {/* Appeal section — shown when banned */}
        {isBanned && (
          <div style={{ marginTop:'1.25rem', background:'rgba(230,60,47,0.06)', border:'1px solid rgba(230,60,47,0.15)', borderRadius:8, padding:'1rem' }}>
            <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#f0ede8', marginBottom:'0.5rem' }}>Appeal your ban</div>
            <textarea
              className="form-textarea"
              placeholder="Explain why your ban should be lifted…"
              value={appealReason}
              onChange={e => setAppealReason(e.target.value)}
              rows={3}
              style={{ fontSize:'0.8rem', marginBottom:'0.5rem' }}
            />
            <button
              className="btn-secondary"
              style={{ fontSize:'0.78rem', width:'100%' }}
              onClick={async () => {
                try {
                  await API.post('/auth/appeal', { email, reason: appealReason });
                  toast.success('Appeal submitted. An admin will review it.');
                  setAppealReason('');
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to submit appeal.');
                }
              }}
            >
              Submit Appeal
            </button>
          </div>
        )}

        {/* ── Divider ───────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', margin:'1.25rem 0' }}>
          <div style={{ flex:1, height:1, background:'#1e1e1e' }} />
          <span style={{ fontSize:'0.75rem', color:'#444' }}>or continue with</span>
          <div style={{ flex:1, height:1, background:'#1e1e1e' }} />
        </div>

        {/* ── Google Sign In ─────────────────────────────────── */}
        <a
          href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/google`}
          style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            gap:'0.6rem', width:'100%', padding:'0.75rem',
            background:'#fff', border:'1px solid #ddd', borderRadius:8,
            color:'#333', fontWeight:600, fontSize:'0.875rem',
            textDecoration:'none', cursor:'pointer',
            transition:'background 0.15s',
            boxSizing: 'border-box'
          }}
          onMouseEnter={e => e.currentTarget.style.background='#f5f5f5'}
          onMouseLeave={e => e.currentTarget.style.background='#fff'}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </a>

        {/* Footer link */}
        <p className="auth-footer" style={{ marginTop: '1.25rem' }}>
          {t.noAccount}{' '}
          <Link to="/register">{t.createOne}</Link>
        </p>

      </div>
    </div>
  );
}