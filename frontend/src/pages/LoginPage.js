import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import '../auth.css';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function LoginPage() {
  const { t } = useLanguage();
  const navigate  = useNavigate();
  const { login } = useAuth();

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

      // Save user + token through AuthContext
      login(data);

      // Redirect based on role
      if (data.role === 'admin')     navigate('/admin');
      else if (data.role === 'responder') navigate('/responder');
      else navigate('/dashboard');

    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
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