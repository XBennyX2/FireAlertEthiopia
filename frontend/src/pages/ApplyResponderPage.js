import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import '../dashboard.css';

const STATIONS = [
  'Bole Fire Station',
  'Kirkos Fire Station',
  'Yeka Fire Station',
  'Arada Fire Station',
  'Akaki Kaliti Fire Station',
  'Nifas Silk-Lafto Fire Station',
  'Gulele Fire Station',
  'Lideta Fire Station',
  'Kolfe Keranio Fire Station',
  'Addis Ketema Fire Station',
];

const AVAILABILITY_OPTIONS = [
  { value: 'full_time',     label: 'Full-time' },
  { value: 'part_time',     label: 'Part-time' },
  { value: 'on_call',       label: 'On-call / As needed' },
  { value: 'weekends_only', label: 'Weekends only' },
];

export default function ApplyResponderPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking]   = useState(true);
  const [existing, setExisting]   = useState(null); // existing pending/rejected/approved app

  const [phone,              setPhone]              = useState('');
  const [yearsExperience,    setYearsExperience]     = useState('');
  const [previousTraining,   setPreviousTraining]    = useState('');
  const [currentOccupation,  setCurrentOccupation]   = useState('');
  const [preferredStation,   setPreferredStation]    = useState('');
  const [availability,       setAvailability]        = useState('');
  const [motivation,         setMotivation]          = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error,       setError]     = useState('');
  const [success,     setSuccess]   = useState(false);

  // Already a responder? bounce them out
  useEffect(() => {
    if (user?.role === 'responder') {
      navigate('/responder');
      return;
    }
    checkExisting();
    // eslint-disable-next-line
  }, []);

  async function checkExisting() {
    try {
      const { data } = await API.get('/admin/applications/mine');
      setExisting(data);
    } catch (err) {
      // fine if it fails — just let them apply
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!phone.trim())             return setError('Phone number is required.');
    if (yearsExperience === '')    return setError('Years of experience is required.');
    if (Number(yearsExperience) < 0) return setError('Years of experience cannot be negative.');
    if (!preferredStation)         return setError('Please select a preferred station.');
    if (!availability)             return setError('Please select your availability.');
    if (!motivation.trim())        return setError('Please tell us why you want to become a responder.');

    setSubmitting(true);
    try {
      await API.post('/admin/applications', {
        phone,
        yearsExperience: Number(yearsExperience),
        previousTraining,
        currentOccupation,
        preferredStation,
        availability,
        motivation,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading state ─────────────────────────────────────
  if (checking) {
    return (
      <div className="dash-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div className="loading-state">Checking application status…</div>
      </div>
    );
  }

  // ── Already has a pending application ─────────────────
  if (existing && existing.status === 'pending' && !success) {
    return (
      <div className="dash-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div style={{ textAlign:'center', padding:'2rem', maxWidth:440 }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>⏳</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.25rem', color:'#f0ede8', marginBottom:'0.5rem' }}>
            Application Under Review
          </h2>
          <p style={{ color:'#666', fontSize:'0.875rem', lineHeight:1.6, marginBottom:'1.5rem' }}>
            You submitted a responder application on {new Date(existing.createdAt).toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' })}.
            An admin will review it soon — you'll be notified once a decision is made.
          </p>
          <Link to="/dashboard" className="btn-secondary">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  // ── Success screen ─────────────────────────────────────
  if (success) {
    return (
      <div className="dash-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div style={{ textAlign:'center', padding:'2rem', maxWidth:440 }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>✅</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.25rem', color:'#f0ede8', marginBottom:'0.5rem' }}>
            Application Submitted
          </h2>
          <p style={{ color:'#666', fontSize:'0.875rem', lineHeight:1.6, marginBottom:'1.5rem' }}>
            Thank you for applying to become a fire responder. An admin will review your application and you'll be notified of the decision.
          </p>
          <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  // ── Was previously rejected — let them know but allow reapply ──
  const wasRejected = existing && existing.status === 'rejected';

  return (
    <div className="dash-page">

      {/* ── Top Bar ───────────────────────────────────────── */}
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">FireAlert</span>
        </Link>
        <div className="dash-topbar-right">
          <span className="dash-user-name">{user?.name}</span>
          <button className="dash-logout-btn" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth: 680 }}>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Apply to Become a Responder</h1>
            <p className="dash-subtitle">Tell us about your background and availability. Admins review every application.</p>
          </div>
          <Link to="/dashboard" className="btn-secondary">← Back</Link>
        </div>

        {wasRejected && (
          <div style={{ background:'rgba(244,130,10,0.1)', border:'1px solid rgba(244,130,10,0.25)', borderRadius:8, padding:'0.85rem 1.1rem', fontSize:'0.85rem', color:'#f4820a', marginBottom:'1.5rem' }}>
            Your previous application was not approved{existing.rejectionReason ? `: "${existing.rejectionReason}"` : '.'} You're welcome to apply again with updated information.
          </div>
        )}

        {/* ── Form ────────────────────────────────────────── */}
        <div className="card">
          {error && (
            <div style={{ background:'rgba(230,60,47,0.1)', border:'1px solid rgba(230,60,47,0.25)', borderRadius:8, padding:'0.75rem 1rem', fontSize:'0.85rem', color:'#f87c74', marginBottom:'1.25rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" placeholder="09xx xxx xxx" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Years of Relevant Experience</label>
                <input className="form-input" type="number" min="0" placeholder="e.g. 2" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Current Occupation (optional)</label>
              <input className="form-input" placeholder="e.g. Construction worker, paramedic, student…" value={currentOccupation} onChange={e => setCurrentOccupation(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Previous Training / Certifications (optional)</label>
              <textarea className="form-textarea" placeholder="First aid certification, firefighting course, military service, etc." value={previousTraining} onChange={e => setPreviousTraining(e.target.value)} rows={3} />
            </div>

            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Preferred Station</label>
                <select className="form-select" value={preferredStation} onChange={e => setPreferredStation(e.target.value)}>
                  <option value="">Select a station…</option>
                  {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Availability</label>
                <select className="form-select" value={availability} onChange={e => setAvailability(e.target.value)}>
                  <option value="">Select availability…</option>
                  {AVAILABILITY_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Why do you want to become a responder?</label>
              <textarea className="form-textarea" placeholder="Tell us about your motivation, relevant skills, and commitment to community safety…" value={motivation} onChange={e => setMotivation(e.target.value)} rows={5} />
              <span className="form-hint">{motivation.length} characters</span>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting} style={{ width:'100%', padding:'0.9rem' }}>
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}