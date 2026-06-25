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

    if (!validate()) return;

    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
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
        {error && <div className="auth-global-error">{error}</div>}

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
          {error && (
            <div className="auth-global-error">
              {isLocked && '🔒 '}{error}
            </div>
          )}
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

        {/* Footer link */}
        <p className="auth-footer">
          {t.noAccount}{' '}
          <Link to="/register">{t.createOne}</Link>
        </p>

      </div>
    </div>
  );
}