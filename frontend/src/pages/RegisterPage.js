import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import '../auth.css';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function RegisterPage() {
  const { t } = useLanguage();
  const navigate  = useNavigate();
  const { login } = useAuth();

  // ── Form state ────────────────────────────────────────────────────
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── UI state ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // ── Field-level errors ────────────────────────────────────────────
  const [errors, setErrors] = useState({
    name: '', email: '', password: '', confirmPassword: ''
  });

  // ── Validation ────────────────────────────────────────────────────
  function validate() {
    const newErrors = { name: '', email: '', password: '', confirmPassword: '' };
    let valid = true;

    if (!name.trim()) {
      newErrors.name = t.errorNameRequired || 'Full name is required.';
      valid = false;
    }

    if (!email.trim()) {
      newErrors.email = t.errorEmailRequired || 'Email is required.';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t.errorEmailInvalid || 'Enter a valid email address.';
      valid = false;
    }

    if (!password) {
      newErrors.password = t.errorPasswordRequired || 'Password is required.';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = t.errorPasswordLength || 'Password must be at least 6 characters.';
      valid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t.errorConfirmPasswordRequired || 'Please confirm your password.';
      valid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t.errorPasswordsMismatch || 'Passwords do not match.';
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
      const { data } = await API.post('/auth/register', { name, email, password });

      // Auto login after successful registration
      login(data);

      // Registered users always go to /dashboard
      navigate('/dashboard');

    } catch (err) {
      const msg = err.response?.data?.message || t.errorRegisterFailed || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      {/* Language Switcher alignment container */}
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
        <h1 className="auth-heading">{t.createAccount}</h1>
        <p className="auth-subheading">{t.registerSubtitle || 'Join the community fire reporting network.'}</p>

        {/* Global error */}
        {error && <div className="auth-global-error">{error}</div>}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>

          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name">{t.fullNameLabel || 'Full Name'}</label>
            <input
              id="name"
              type="text"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="Abebe Girma"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Email */}
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

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">{t.passwordLabel}</label>
            <input
              id="password"
              type="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder={t.passwordPlaceholder || 'Min. 6 characters'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">{t.confirmPasswordLabel || 'Confirm Password'}</label>
            <input
              id="confirmPassword"
              type="password"
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder={t.confirmPasswordPlaceholder || 'Repeat your password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <span className="form-error">{errors.confirmPassword}</span>
            )}
          </div>

          {/* Submit */}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (t.creatingAccount || 'Creating account…') : t.createAccount}
          </button>

        </form>

        {/* Footer link */}
        <p className="auth-footer">
          {t.alreadyHaveAccount || 'Already have an account?'}{' '}
          <Link to="/login">{t.signIn}</Link>
        </p>

      </div>
    </div>
  );
}