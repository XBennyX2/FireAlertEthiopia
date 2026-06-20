import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import NotificationBell from '../components/NotificationBell';
import API from '../api/axios';
import { getReputationLevel, getReputationTips } from '../utils/reputationLevel';
import { useToast } from '../context/ToastContext';
import '../dashboard.css';

// ── Role-aware dashboard link ─────────────────────────────────────
function getDashboardLink(role) {
  if (role === 'admin')     return '/admin';
  if (role === 'responder') return '/responder';
  return '/dashboard';
}

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { t }                         = useLanguage();
  const navigate                      = useNavigate();
  const photoRef                      = useRef(null);
  const { toast }                     = useToast();

  // ── Profile fields ────────────────────────────────────────────────
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [phone,   setPhone]   = useState('');
  const [photo,   setPhoto]   = useState('');

  // ── Email change flow ─────────────────────────────────────────────
  const [newEmail,         setNewEmail]         = useState('');
  const [emailCode,        setEmailCode]        = useState('');
  const [emailStep,        setEmailStep]        = useState('idle'); // idle | codeSent | verified
  const [sendingCode,      setSendingCode]      = useState(false);
  const [verifyingCode,    setVerifyingCode]    = useState(false);
  const [codeCountdown,    setCodeCountdown]    = useState(0);

  // ── Password fields ───────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── UI state ──────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState('profile');
  const [saving,         setSaving]         = useState(false);
  const [savingPhoto,    setSavingPhoto]    = useState(false);
  const [savingPass,     setSavingPass]     = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting,       setDeleting]       = useState(false);

  // ── Load profile ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const { data } = await API.get('/profile');
        setName(data.name         || '');
        setEmail(data.email       || '');
        setPhone(data.phone       || '');
        setPhoto(data.profilePhoto || '');
      } catch (err) {
        console.error('Failed to load profile:', err.message);
      }
    }
    load();
  }, []);

  // ── Countdown timer for resend ────────────────────────────────────
  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setTimeout(() => setCodeCountdown(v => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeCountdown]);

  const repLevel = getReputationLevel(user?.reputationScore ?? 100);
  const repTips  = getReputationTips(user?.reputationScore ?? 100);

  // ── Save profile (name + phone only) ──────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await API.put('/profile', { name, phone });
      await refreshUser();
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  // ── Request email change code ──────────────────────────────────────
  async function handleRequestEmailCode() {
    if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
      return toast.error('Please enter a valid email address.');
    }
    if (newEmail.toLowerCase() === email.toLowerCase()) {
      return toast.error('This is already your current email address.');
    }
    setSendingCode(true);
    try {
      const { data } = await API.post('/profile/email/request', { newEmail });
      setEmailStep('codeSent');
      toast.success(data.message || 'Verification code sent to your new email.');
      setCodeCountdown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send code.');
    } finally {
      setSendingCode(false);
    }
  }

  // ── Verify the code ────────────────────────────────────────────────
  async function handleVerifyEmailCode() {
    if (!emailCode || emailCode.length !== 6) {
      return toast.error('Please enter the 6-digit code.');
    }
    setVerifyingCode(true);
    try {
      const { data } = await API.post('/profile/email/verify', { code: emailCode });
      setEmail(data.newEmail);
      setEmailStep('verified');
      toast.success('Email address updated successfully.');
      setNewEmail('');
      setEmailCode('');
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed.');
    } finally {
      setVerifyingCode(false);
    }
  }

  function resetEmailFlow() {
    setEmailStep('idle');
    setNewEmail('');
    setEmailCode('');
  }

  // ── Upload photo ───────────────────────────────────────────────────
  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSavingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);
      const { data } = await API.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPhoto(data.profilePhoto);
      await refreshUser();
      toast.success('Profile photo uploaded successfully.');
    } catch {
      toast.error('Failed to upload photo.');
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    setSavingPhoto(true);
    try {
      await API.delete('/profile/photo');
      setPhoto('');
      await refreshUser();
      toast.success('Profile photo removed.');
    } catch {
      toast.error('Failed to remove photo.');
    } finally {
      setSavingPhoto(false);
    }
  }

  // ── Change password ────────────────────────────────────────────────
  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match.');
    }
    if (newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }
    setSavingPass(true);
    try {
      await API.put('/profile/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPass(false);
    }
  }

  // ── Delete account ─────────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (!deletePassword) return;
    setDeleting(true);
    try {
      await API.delete('/profile', { data: { password: deletePassword } });
      toast.success('Account permanently deleted.');
      logout();
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account.');
      setDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  // ── Tab style ──────────────────────────────────────────────────────
  const TAB = (key) => ({
    padding:      '0.55rem 1.1rem',
    fontSize:     '0.8125rem',
    fontWeight:   activeTab === key ? 600 : 400,
    cursor:       'pointer',
    border:       'none',
    borderBottom: `2px solid ${activeTab === key ? 'var(--fire-orange)' : 'transparent'}`,
    background:   'transparent',
    color:        activeTab === key ? 'var(--text-primary)' : 'var(--text-muted)',
    fontFamily:   "'DM Sans', sans-serif",
    transition:   'color 0.2s',
  });

  const dashLink = getDashboardLink(user?.role);

  return (
   <div className="dash-page">

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">{t.appName}</span>
        </Link>
        <div className="dash-topbar-right">
          <LanguageSwitcher />
          <Link to={dashLink} className="btn-secondary" style={{ fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}>
            ← {user?.role === 'admin' ? 'Admin' : user?.role === 'responder' ? 'Responder' : 'Dashboard'}
          </Link>
          <NotificationBell />
          <button className="dash-logout-btn" onClick={() => { logout(); navigate('/'); }}>
            {t.signOut}
          </button>
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth: 720 }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">My Profile</h1>
            <p className="dash-subtitle">
              {user?.role === 'admin'
                ? 'Administrator account settings.'
                : user?.role === 'responder'
                  ? 'Responder profile and settings.'
                  : 'Manage your account information and settings.'}
            </p>
          </div>
          <span className="dash-role-badge" style={{ textTransform:'capitalize' }}>
            {user?.role}
          </span>
        </div>

        {/* ── Profile Photo + Summary Card ─────────────────────── */}
        <div className="card" style={{ display:'flex', alignItems:'center', gap:'1.5rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>

          {/* Avatar */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{
              width:    80, height:80, borderRadius:'50%',
              background: photo ? 'transparent' : 'linear-gradient(135deg, #e63c2f, #f4820a)',
              display: 'flex', alignItems:'center', justifyContent:'center',
              overflow:'hidden', border:'2px solid #2a2a2a',
            }}>
              {photo
                ? <img src={photo} alt="profile" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.75rem', color:'#fff' }}>
                    {name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
              }
            </div>
            <button
              onClick={() => photoRef.current?.click()}
              disabled={savingPhoto}
              style={{
                position:'absolute', bottom:-4, right:-4,
                width:26, height:26, borderRadius:'50%',
                background:'#161616', border:'1px solid #2a2a2a',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', fontSize:'0.7rem',
              }}
            >
              {savingPhoto ? '…' : '📷'}
            </button>
            <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoChange} />
          </div>

          {/* Info */}
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', color:'var(--text-primary)', marginBottom:'0.2rem' }}>
              {name}
            </div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.5rem' }}>
              {email}
            </div>

            {/* Role-aware status badge */}
            {user?.role === 'user' && (
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'0.4rem',
                padding:'0.25rem 0.75rem', borderRadius:999,
                background: repLevel.background, border:`1px solid ${repLevel.border}`,
                fontSize:'0.72rem', fontWeight:600, color: repLevel.color,
              }}>
                {repLevel.icon} {repLevel.level} — {user?.reputationScore ?? 100} pts
              </div>
            )}

            {user?.role === 'responder' && (
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'0.4rem',
                padding:'0.25rem 0.75rem', borderRadius:999,
                background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)',
                fontSize:'0.72rem', fontWeight:600, color:'#3b82f6',
              }}>
                🚒 Active Responder
              </div>
            )}

            {user?.role === 'admin' && (
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'0.4rem',
                padding:'0.25rem 0.75rem', borderRadius:999,
                background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.25)',
                fontSize:'0.72rem', fontWeight:600, color:'#a855f7',
              }}>
                ⚙️ System Administrator
              </div>
            )}
          </div>

          {photo && (
            <button className="btn-danger" onClick={handleRemovePhoto} disabled={savingPhoto} style={{ fontSize:'0.75rem' }}>
              Remove Photo
            </button>
          )}
        </div>

        {/* ── Tabs — role-aware ────────────────────────────────── */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:'1.5rem' }}>
          <button style={TAB('profile')}  onClick={() => setActiveTab('profile')}>Profile Info</button>
          <button style={TAB('password')} onClick={() => setActiveTab('password')}>Password</button>
          {user?.role === 'user' && (
            <button style={TAB('reputation')} onClick={() => setActiveTab('reputation')}>Reputation</button>
          )}
          {user?.role === 'responder' && (
            <button style={TAB('performance')} onClick={() => setActiveTab('performance')}>Performance</button>
          )}
          <button style={TAB('danger')} onClick={() => setActiveTab('danger')}>Account</button>
        </div>

        {/* ── Tab: Profile Info ─────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

            {/* Name + phone form */}
            <div className="card">
              <div className="section-label" style={{ marginBottom:'1rem' }}>Basic Information</div>
              <form onSubmit={handleSaveProfile} noValidate>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+251 9XX XXX XXX" />
                  <span className="form-hint">Used for SMS notifications.</span>
                </div>
                <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Email change — separate card with verification flow */}
            <div className="card">
              <div className="section-label" style={{ marginBottom:'0.5rem' }}>Email Address</div>
              <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'1rem' }}>
                Current: <strong style={{ color:'var(--text-primary)' }}>{email}</strong>
              </div>

              {/* Step 1 — Enter new email */}
              {emailStep === 'idle' && (
                <div>
                  <div className="form-group" style={{ marginBottom:'0.75rem' }}>
                    <label className="form-label">New Email Address</label>
                    <input
                      className="form-input"
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="new@example.com"
                    />
                    <span className="form-hint">
                      A 6-digit verification code will be sent to the new address.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleRequestEmailCode}
                    disabled={sendingCode || !newEmail}
                  >
                    {sendingCode ? 'Sending Code…' : 'Send Verification Code'}
                  </button>
                </div>
              )}

              {/* Step 2 — Enter verification code */}
              {emailStep === 'codeSent' && (
                <div>
                  <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'1rem', padding:'0.75rem', background:'rgba(244,130,10,0.08)', borderRadius:8, border:'1px solid rgba(244,130,10,0.2)' }}>
                    📧 Code sent to <strong style={{ color:'#f4820a' }}>{newEmail}</strong>. Check your inbox.
                  </div>

                  <div className="form-group" style={{ marginBottom:'0.75rem' }}>
                    <label className="form-label">Enter 6-Digit Code</label>
                    <input
                      className="form-input"
                      value={emailCode}
                      onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      style={{ letterSpacing:'0.3em', fontSize:'1.25rem', textAlign:'center' }}
                      maxLength={6}
                    />
                  </div>

                  <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                    <button type="button" className="btn-primary" onClick={handleVerifyEmailCode} disabled={verifyingCode || emailCode.length !== 6}>
                      {verifyingCode ? 'Verifying…' : 'Confirm Email Change'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleRequestEmailCode}
                      disabled={sendingCode || codeCountdown > 0}
                    >
                      {codeCountdown > 0 ? `Resend in ${codeCountdown}s` : 'Resend Code'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={resetEmailFlow}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 — Success */}
              {emailStep === 'verified' && (
                <div>
                  <div style={{ fontSize:'0.8rem', color:'#22c55e', marginBottom:'1rem' }}>
                    ✅ Email successfully changed to <strong>{email}</strong>
                  </div>
                  <button type="button" className="btn-secondary" onClick={resetEmailFlow}>
                    Change Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Password ─────────────────────────────────────── */}
        {activeTab === 'password' && (
          <div className="card">
            <form onSubmit={handleChangePassword} noValidate>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" />
              </div>

              {/* Strength bar */}
              {newPassword && (
                <div style={{ marginBottom:'1rem' }}>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'0.3rem' }}>Password strength</div>
                  <div style={{ height:4, background:'#1e1e1e', borderRadius:99, overflow:'hidden' }}>
                    <div style={{
                      height:'100%',
                      width: newPassword.length >= 12 ? '100%' : newPassword.length >= 8 ? '66%' : '33%',
                      background: newPassword.length >= 12 ? '#22c55e' : newPassword.length >= 8 ? '#f4820a' : '#e63c2f',
                      borderRadius:99, transition:'width 0.3s',
                    }} />
                  </div>
                  <div style={{ fontSize:'0.7rem', color:'var(--text-dim)', marginTop:'0.2rem' }}>
                    {newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Moderate' : 'Weak'}
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={savingPass} style={{ width:'100%' }}>
                {savingPass ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* ── Tab: Reputation (users only) ──────────────────────── */}
        {activeTab === 'reputation' && user?.role === 'user' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

            <div className="card" style={{ textAlign:'center', padding:'2rem' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'3.5rem', color: repLevel.color, letterSpacing:'-0.04em', lineHeight:1 }}>
                {user?.reputationScore ?? 100}
              </div>
              <div style={{ fontSize:'0.875rem', color:'var(--text-muted)', marginTop:'0.4rem', marginBottom:'1rem' }}>Reputation Score</div>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'0.4rem',
                padding:'0.35rem 1rem', borderRadius:999,
                background: repLevel.background, border:`1px solid ${repLevel.border}`,
                fontSize:'0.8rem', fontWeight:700, color: repLevel.color,
              }}>
                {repLevel.icon} {repLevel.level}
              </div>
              <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.75rem', marginBottom:0 }}>
                {repLevel.description}
              </p>
            </div>

            <div className="card">
              <div className="section-label" style={{ marginBottom:'0.75rem' }}>Score Breakdown</div>
              {[
                { label:'Starting score',        value:'+100',                                                                                   color:'#22c55e' },
                { label:'False report penalties', value:`-${(user?.falseReportCount ?? 0) * 15}`,                                               color:'#e63c2f' },
                { label:'Current score',          value: String(user?.reputationScore ?? 100),                                                   color: repLevel.color },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.6rem' }}>
                  <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color: item.color, fontSize:'0.875rem' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="section-label" style={{ marginBottom:'0.75rem' }}>Score Levels</div>
              {[
                { range:'80–100', level:'Normal',     color:'#22c55e', desc:'Full access, trusted reporter'             },
                { range:'60–79',  level:'Warning',    color:'#f4820a', desc:'Minor violations detected'                 },
                { range:'30–59',  level:'Restricted', color:'#e63c2f', desc:'Reporting frequency limited'               },
                { range:'0–29',   level:'Banned',     color:'#7f1d1d', desc:'Account banned, contact support to appeal' },
              ].map(item => {
                const score     = user?.reputationScore ?? 100;
                const [lo, hi]  = item.range.split('–').map(Number);
                const isCurrent = score >= lo && score <= hi;
                return (
                  <div key={item.level} style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background: item.color, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-primary)' }}>
                        {item.level} <span style={{ color:'var(--text-dim)', fontWeight:400 }}>({item.range})</span>
                      </div>
                      <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                    {isCurrent && <span style={{ fontSize:'0.7rem', color: item.color, fontWeight:600 }}>← You</span>}
                  </div>
                );
              })}
            </div>

            <div className="card">
              <div className="section-label" style={{ marginBottom:'0.75rem' }}>Improvement Tips</div>
              {repTips.map((tip, i) => (
                <div key={i} style={{ display:'flex', gap:'0.6rem', marginBottom:'0.6rem', alignItems:'flex-start' }}>
                  <span style={{ color:'var(--fire-orange)', flexShrink:0 }}>→</span>
                  <span style={{ fontSize:'0.8rem', color:'var(--text-muted)', lineHeight:1.6 }}>{tip}</span>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ── Tab: Performance (responders only) ───────────────── */}
        {activeTab === 'performance' && user?.role === 'responder' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div className="card" style={{ textAlign:'center', padding:'2rem' }}>
              <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>🚒</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', color:'var(--text-primary)', marginBottom:'0.4rem' }}>
                Responder Performance
              </div>
              <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:0 }}>
                Performance metrics are tracked automatically as you handle incidents.
                Verify reports accurately and respond quickly to maintain a strong performance record.
              </p>
            </div>

            <div className="stat-grid">
              {[
                { label:'Role',           value:'Responder',   color:'#3b82f6' },
                { label:'Status',         value:'Active',      color:'#22c55e' },
                { label:'Account Since',  value: new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', { month:'short', year:'numeric' }), color:'var(--text-primary)' },
              ].map(item => (
                <div key={item.label} className="stat-card">
                  <div className="stat-label">{item.label}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'1rem', color: item.color, marginTop:'0.25rem' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="section-label" style={{ marginBottom:'0.75rem' }}>Responder Guidelines</div>
              {[
                'Only verify incidents you have genuinely reviewed.',
                'Add notes when rejecting a report to help the user understand why.',
                'Keep your availability status accurate so dispatchers know when you are on duty.',
                'Respond to dispatched incidents promptly — response time is tracked.',
              ].map((tip, i) => (
                <div key={i} style={{ display:'flex', gap:'0.6rem', marginBottom:'0.6rem' }}>
                  <span style={{ color:'#3b82f6', flexShrink:0 }}>→</span>
                  <span style={{ fontSize:'0.8rem', color:'var(--text-muted)', lineHeight:1.6 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Account / Danger Zone ────────────────────────── */}
        {activeTab === 'danger' && (
          <div className="card" style={{ border:'1px solid rgba(230,60,47,0.25)' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'0.9375rem', color:'#f87c74', marginBottom:'0.4rem' }}>
              ⚠️ Delete Account
            </div>
            <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'1rem', lineHeight:1.6 }}>
              Permanently deletes your account and all associated data. This cannot be undone.
            </p>

            {!deleteConfirm ? (
              <button className="btn-danger" onClick={() => setDeleteConfirm(true)}>
                Delete My Account
              </button>
            ) : (
              <div>
                <div className="form-group">
                  <label className="form-label">Enter your password to confirm</label>
                  <input
                    className="form-input"
                    type="password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    placeholder="Your current password"
                  />
                </div>
                <div style={{ display:'flex', gap:'0.6rem' }}>
                  <button className="btn-danger" onClick={handleDeleteAccount} disabled={deleting || !deletePassword}>
                    {deleting ? 'Deleting…' : 'Yes, Delete Permanently'}
                  </button>
                  <button className="btn-secondary" onClick={() => { setDeleteConfirm(false); setDeletePassword(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}