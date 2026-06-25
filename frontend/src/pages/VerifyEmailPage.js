import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import '../dashboard.css';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const { userId, email } = location.state || {};

  const [code, setCode]           = useState('');
  const [error, setError]         = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [cooldown, setCooldown]   = useState(0);

  useEffect(() => {
    if (!userId) navigate('/register');
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
      setError('Please enter the 6-digit code.');
      return;
    }

    setVerifying(true);
    try {
      const { data } = await API.post('/auth/verify-email', { userId, code: code.trim() });
      login(data); // stores token + user, same shape as a normal login response
      navigate('/dashboard');
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
      const { data } = await API.post('/auth/resend-verification', { userId });
      setResendMsg(data.message);
      setCooldown(30);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="dash-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ maxWidth: 420, width:'100%', padding:'2rem' }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>📧</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.25rem', color:'#f0ede8', marginBottom:'0.5rem' }}>
            Verify Your Email
          </h2>
          <p style={{ color:'#666', fontSize:'0.875rem', lineHeight:1.6 }}>
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below to activate your account.
          </p>
        </div>

        <div className="card">
          {error && (
            <div style={{ background:'rgba(230,60,47,0.1)', border:'1px solid rgba(230,60,47,0.25)', borderRadius:8, padding:'0.75rem 1rem', fontSize:'0.85rem', color:'#f87c74', marginBottom:'1.25rem' }}>
              {error}
            </div>
          )}
          {resendMsg && (
            <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', borderRadius:8, padding:'0.75rem 1rem', fontSize:'0.85rem', color:'#22c55e', marginBottom:'1.25rem' }}>
              {resendMsg}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <input
                className="form-input"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                style={{ textAlign:'center', fontSize:'1.4rem', letterSpacing:'0.5rem', fontFamily:'monospace' }}
                autoFocus
              />
            </div>

            <button type="submit" className="btn-primary" disabled={verifying} style={{ width:'100%', padding:'0.9rem', marginBottom:'0.75rem' }}>
              {verifying ? 'Verifying…' : 'Verify & Continue'}
            </button>
          </form>

          <button
            className="btn-secondary"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            style={{ width:'100%' }}
          >
            {cooldown > 0 ? `Resend code (${cooldown}s)` : resending ? 'Sending…' : 'Resend Code'}
          </button>
        </div>

        <div style={{ textAlign:'center', marginTop:'1.25rem' }}>
          <Link to="/login" style={{ fontSize:'0.8rem', color:'#666' }}>← Back to login</Link>
        </div>
      </div>
    </div>
  );
}