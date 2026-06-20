import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import '../auth.css';

export default function ResetPasswordPage() {
  const { t }          = useLanguage();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast }      = useToast();
  const token          = searchParams.get('token');

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [verifying,       setVerifying]       = useState(true);
  const [tokenValid,      setTokenValid]      = useState(false);
  const [tokenError,      setTokenError]      = useState('');
  const [success,         setSuccess]         = useState(false);

  // ── Verify token on page load ─────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenError('No reset token found. Please request a new password reset link.');
      setVerifying(false);
      return;
    }

    async function verify() {
      try {
        const { data } = await API.get(`/auth/reset-password/verify?token=${token}`);
        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenError(data.message);
          toast.error(data.message || 'Reset link is invalid.');
        }
      } catch (err) {
        const msg = 'Failed to verify reset link. Please try again.';
        setTokenError(msg);
        toast.error(msg);
      } finally {
        setVerifying(false);
      }
    }

    verify();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      toast.success('Password reset successfully!');
      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Loading state while verifying token ───────────────────────────
  if (verifying) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign:'center', padding:'3rem' }}>
          <div style={{ fontSize:'1.5rem', marginBottom:'0.75rem' }}>🔐</div>
          <div style={{ color:'#666', fontSize:'0.875rem' }}>Verifying reset link…</div>
        </div>
      </div>
    );
  }

  // ── Invalid token ─────────────────────────────────────────────────
  if (!tokenValid) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>⛔</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', color:'#f0ede8', margin:'0 0 0.5rem' }}>
            Invalid Reset Link
          </h2>
          <p style={{ fontSize:'0.875rem', color:'#666', lineHeight:1.6, margin:'0 0 1.5rem' }}>
            {tokenError}
          </p>
          <Link to="/forgot-password" className="btn-primary" style={{ display:'inline-block', textDecoration:'none', marginBottom:'0.75rem', width:'100%', textAlign:'center' }}>
            Request New Reset Link
          </Link>
          <br />
          <Link to="/login" style={{ fontSize:'0.8rem', color:'#f4820a', textDecoration:'none' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────
  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>✅</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.25rem', color:'#f0ede8', margin:'0 0 0.5rem' }}>
            Password Reset Successful
          </h2>
          <p style={{ fontSize:'0.875rem', color:'#666', lineHeight:1.6, margin:'0 0 1.5rem' }}>
            Your password has been updated. Redirecting you to the sign-in page…
          </p>
          <Link to="/login" className="btn-primary" style={{ display:'inline-block', textDecoration:'none' }}>
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  // ── Reset form ────────────────────────────────────────────────────
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

        <h1 className="auth-heading">Set New Password</h1>
        <p className="auth-subheading">
          Choose a strong password for your FireAlert account.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          {/* Password strength bar */}
          {newPassword && (
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ height:4, background:'#1e1e1e', borderRadius:99, overflow:'hidden' }}>
                <div style={{
                  height:     '100%',
                  width:      newPassword.length >= 12 ? '100%' : newPassword.length >= 8 ? '66%' : '33%',
                  background: newPassword.length >= 12 ? '#22c55e' : newPassword.length >= 8 ? '#f4820a' : '#e63c2f',
                  borderRadius: 99,
                  transition:  'width 0.3s',
                }} />
              </div>
              <div style={{ fontSize:'0.7rem', color:'#555', marginTop:'0.2rem' }}>
                {newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Moderate' : 'Weak'}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <span className="form-error">Passwords do not match.</span>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <span style={{ fontSize:'0.78rem', color:'#22c55e' }}>✓ Passwords match</span>
            )}
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
          >
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>

        </form>

        <p className="auth-footer">
          <Link to="/login">{t.signIn}</Link>
        </p>

      </div>
    </div>
  );
}