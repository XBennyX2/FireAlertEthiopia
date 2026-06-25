import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import '../auth.css';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
  const { t } = useLanguage();
  const navigate  = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

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
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
    if (!agreedToTerms) {
  newErrors.terms = 'You must accept the terms to create an account.';
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

      // Toast on successful registration
      toast.success('Account created! Please check your email to verify your address.');

      // Redirect to email verification — no token yet
      navigate('/verify-email', { state: { userId: data.userId, email: data.email } });

    } catch (err) {
      const msg = err.response?.data?.message || t.errorRegisterFailed || 'Registration failed. Please try again.';
      setError(msg);
      
      // Toast on error
      toast.error(msg);
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
            {/* Password strength indicator */}
{password && (
  <div style={{ marginTop:'0.4rem' }}>
    <div style={{ height:3, background:'#1e1e1e', borderRadius:99, overflow:'hidden' }}>
      <div style={{
        height:     '100%',
        width:      password.length >= 12 ? '100%' : password.length >= 8 ? '66%' : '33%',
        background: password.length >= 12 ? '#22c55e' : password.length >= 8 ? '#f4820a' : '#e63c2f',
        borderRadius: 99,
        transition: 'width 0.3s',
      }} />
    </div>
    <div style={{ fontSize:'0.68rem', color:'#555', marginTop:'0.15rem' }}>
      {password.length >= 12 ? 'Strong password' : password.length >= 8 ? 'Moderate — try adding more characters' : 'Weak — use at least 8 characters'}
    </div>
  </div>
)}
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

          {/* Terms acceptance */}
<div style={{ marginBottom:'1rem' }}>
  <label style={{ display:'flex', alignItems:'flex-start', gap:'0.6rem', cursor:'pointer' }}>
    <input
      type="checkbox"
      checked={agreedToTerms}
      onChange={e => setAgreedToTerms(e.target.checked)}
      style={{ marginTop:'0.15rem', accentColor:'#f4820a', flexShrink:0 }}
    />
    <span style={{ fontSize:'0.8rem', color:'#666', lineHeight:1.5 }}>
      I agree to the{' '}
      <Link to="/safety" style={{ color:'#f4820a', textDecoration:'none' }}>
        Terms of Service
      </Link>
      {' '}and confirm that I will only submit genuine fire reports.
    </span>
  </label>
  {errors.terms && <div className="form-error" style={{ marginTop:'0.3rem' }}>{errors.terms}</div>}
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