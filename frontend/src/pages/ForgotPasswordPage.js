import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import '../auth.css';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return toast.error('Please enter a valid email address.');
    }

    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Password reset link dispatched!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div style={{ textAlign:'center', padding:'1rem 0' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>📧</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.25rem', color:'#f0ede8', margin:'0 0 0.5rem' }}>
              Check Your Email
            </h2>
            <p style={{ fontSize:'0.875rem', color:'#666', lineHeight:1.6, margin:'0 0 1.5rem' }}>
              If an account with <strong style={{ color:'#f0ede8' }}>{email}</strong> exists,
              a password reset link has been sent. Check your inbox and spam folder.
            </p>
            <p style={{ fontSize:'0.78rem', color:'#555', margin:'0 0 1.5rem' }}>
              The link expires in 1 hour.
            </p>
            <Link to="/login" className="btn-primary" style={{ display:'inline-block', textDecoration:'none' }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo + language switcher */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <Link to="/" className="auth-logo" style={{ marginBottom:0 }}>
            <div className="auth-logo-icon">🔥</div>
            <span className="auth-logo-text">{t.appName}</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <h1 className="auth-heading">Forgot Password?</h1>
        <p className="auth-subheading">
          Enter your email address and we will send you a link to reset your password.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">{t.emailLabel}</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-footer">
          Remember your password?{' '}
          <Link to="/login">{t.signIn}</Link>
        </p>

      </div>
    </div>
  );
}