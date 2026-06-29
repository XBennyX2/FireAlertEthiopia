import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../auth.css';

export default function TwoFactorPage() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { login }     = useAuth();
  const { toast }     = useToast();

  const { userId, email } = location.state || {};

  const [code,       setCode]       = useState('');
  const [error,      setError]      = useState('');
  const [verifying,  setVerifying]  = useState(false);
  const [resending,  setResending]  = useState(false);
  const [resendMsg,  setResendMsg]  = useState('');
  const [cooldown,   setCooldown]   = useState(0);

  useEffect(() => {
    if (!userId) navigate('/login');
  }, [userId, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    if (code.trim().length !== 6) {
      return setError('Please enter the 6-digit code.');
    }

    setVerifying(true);
    try {
      const { data } = await API.post('/auth/2fa/verify', { userId, code: code.trim() });
      login(data);
      toast.success('Welcome back!');
      if (data.role === 'admin')          navigate('/admin');
      else if (data.role === 'responder') navigate('/responder');
      else                                navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResendMsg('');
    setError('');
    setResending(true);
    try {
      const { data } = await API.post('/auth/2fa/resend', { userId });
      setResendMsg(data.message);
      setCooldown(30);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon">🔥</div>
          <span className="auth-logo-text">FireAlert</span>
        </Link>

        <h1 className="auth-heading">Two-Factor Authentication</h1>
        <p className="auth-subheading">
          A 6-digit code was sent to <strong>{email}</strong>. Enter it below to continue.
        </p>

        {error && <div className="auth-global-error">{error}</div>}
        {resendMsg && (
          <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:8, padding:'0.75rem 1rem', fontSize:'0.85rem', color:'#22c55e', marginBottom:'1rem' }}>
            {resendMsg}
          </div>
        )}

        <form className="auth-form" onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label">Verification Code</label>
            <input
              className="form-input"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
              placeholder="000000"
              inputMode="numeric"
              autoFocus
              style={{ textAlign:'center', fontSize:'1.5rem', letterSpacing:'0.5rem', fontFamily:'monospace' }}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify & Sign In'}
          </button>
        </form>

        <button
          className="auth-btn"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          style={{ marginTop:'0.75rem', background:'transparent', border:'1px solid #2a2a2a', color:'#666' }}
        >
          {cooldown > 0 ? `Resend code (${cooldown}s)` : resending ? 'Sending…' : 'Resend Code'}
        </button>

        <p className="auth-footer" style={{ marginTop:'1.25rem' }}>
          <Link to="/login">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}