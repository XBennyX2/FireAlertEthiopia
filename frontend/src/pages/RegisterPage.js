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
  const [phone,           setPhone]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── UI state ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // ── Field-level errors ────────────────────────────────────────────
  const [errors, setErrors] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '', terms: ''
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // ── Validation ────────────────────────────────────────────────────
  function validate() {
    const newErrors = { name: '', email: '', password: '', confirmPassword: '', phone: '', terms: '' };
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

    if (phone && !/^[\d\s\+\-\(\)]{7,15}$/.test(phone)) {
      newErrors.phone = 'Enter a valid phone number.';
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
      const { data } = await API.post('/auth/register', { name, email, password, phone });

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

          {/* Phone number (optional) */}
          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              Phone Number
              <span style={{ fontSize:'0.72rem', color:'#555', marginLeft:'0.4rem', fontWeight:400 }}>
                (optional)
              </span>
            </label>
            <input
              id="phone"
              type="tel"
              className={`form-input ${errors.phone ? 'error' : ''}`}
              placeholder="09xx xxx xxx"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9+\-\s]/g, ''))}
              autoComplete="tel"
            />
            {errors.phone && <span className="form-error">{errors.phone}</span>}
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
          {t.alreadyHaveAccount || 'Already have an account?'}{' '}
          <Link to="/login">{t.signIn}</Link>
        </p>

      </div>
    </div>
  );
}