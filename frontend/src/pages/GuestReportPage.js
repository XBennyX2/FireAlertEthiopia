import { useState } from 'react';
import { Link }     from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import MapPicker    from '../components/MapPicker';
// Import the dynamic server URL configuration to replace hardcoded localhost strings
import { SERVER_URL } from '../config';
import '../dashboard.css';
import '../auth.css';

const FIRE_TYPES = ['residential','commercial','vehicle','industrial','wildland','other'];

export default function GuestReportPage() {
  const { t } = useLanguage();

  const [step,        setStep]        = useState(1); // 1=contact, 2=incident, 3=success
  const [guestEmail,  setGuestEmail]  = useState('');
  const [guestPhone,  setGuestPhone]  = useState('');
  const [description, setDescription] = useState('');
  const [fireType,    setFireType]    = useState('');
  const [severity,    setSeverity]    = useState('Medium');
  const [location,    setLocation]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [incidentId,  setIncidentId]  = useState('');

  function validateContact() {
    if (!guestEmail.trim() || !/\S+@\S+\.\S+/.test(guestEmail)) {
      setError('Please enter a valid email address.'); return false;
    }
    if (!guestPhone.trim() || guestPhone.replace(/\D/g,'').length < 7) {
      setError('Please enter a valid phone number.'); return false;
    }
    setError(''); return true;
  }

  function validateIncident() {
    if (!fireType)              { setError('Please select a fire type.');     return false; }
    if (!description.trim() || description.trim().length < 10) {
      setError('Description must be at least 10 characters.'); return false;
    }
    if (!location)              { setError('Please pin the fire location on the map.'); return false; }
    setError(''); return true;
  }

  async function handleSubmit() {
    if (!validateIncident()) return;
    setSubmitting(true);
    try {
      // Use dynamic SERVER_URL route path template
      const res = await fetch(`${SERVER_URL}/api/incidents/guest`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestEmail,
          guestPhone,
          description,
          fire_type: fireType,
          severity,
          location,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Submission failed.'); return; }
      setIncidentId(data.incidentId);
      setStep(3);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ───────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>✅</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.25rem', color:'#f0ede8', marginBottom:'0.5rem' }}>
            Report Submitted
          </h2>
          <p style={{ color:'#666', fontSize:'0.875rem', lineHeight:1.6, marginBottom:'0.5rem' }}>
            Emergency responders have been notified. Your reference ID:
          </p>
          <div style={{ fontFamily:'monospace', fontSize:'0.75rem', color:'#f4820a', background:'#111', padding:'0.5rem', borderRadius:6, marginBottom:'1.5rem', wordBreak:'break-all' }}>
            {incidentId}
          </div>
          <p style={{ color:'#555', fontSize:'0.8rem', marginBottom:'1.5rem', lineHeight:1.6 }}>
            If the fire is life-threatening, call <strong style={{ color:'#e63c2f' }}>939</strong> immediately.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            <Link to="/register" className="btn-primary">Create an account to track your report</Link>
            <Link to="/" className="btn-secondary">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">FireAlert</span>
        </Link>
        <div className="dash-topbar-right">
          <Link to="/login"    className="btn-secondary" style={{ fontSize:'0.78rem' }}>Sign In</Link>
          <Link to="/register" className="btn-primary"   style={{ fontSize:'0.78rem' }}>Register</Link>
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth:600 }}>

        {/* Emergency banner */}
        <div style={{
          background:'rgba(230,60,47,0.1)', border:'1px solid rgba(230,60,47,0.3)',
          borderRadius:10, padding:'0.85rem 1.1rem', marginBottom:'1.5rem',
          display:'flex', alignItems:'center', gap:'0.75rem',
        }}>
          <span style={{ fontSize:'1.5rem' }}>🚨</span>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.875rem', color:'#f0ede8' }}>
              Life-threatening emergency? Call 939 first.
            </div>
            <div style={{ fontSize:'0.78rem', color:'#888', marginTop:'0.15rem' }}>
              Use this form to report fire incidents and help responders find the location.
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.5rem', alignItems:'center' }}>
          {[1,2].map(s => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
              <div style={{
                width:28, height:28, borderRadius:'50%',
                background: step >= s ? 'linear-gradient(135deg,#e63c2f,#f4820a)' : '#1e1e1e',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.75rem', fontWeight:800, color: step >= s ? '#fff' : '#444',
              }}>
                {s}
              </div>
              {s < 2 && <div style={{ flex:1, height:2, width:40, background: step > s ? '#f4820a' : '#1e1e1e' }} />}
            </div>
          ))}
          <span style={{ fontSize:'0.78rem', color:'#555', marginLeft:'0.5rem' }}>
            {step === 1 ? 'Your contact details' : 'Incident details'}
          </span>
        </div>

        {error && (
          <div style={{ background:'rgba(230,60,47,0.1)', border:'1px solid rgba(230,60,47,0.25)', borderRadius:8, padding:'0.75rem 1rem', fontSize:'0.85rem', color:'#f87c74', marginBottom:'1.25rem' }}>
            {error}
          </div>
        )}

        {/* ── Step 1: Contact ──────────────────────────────── */}
        {step === 1 && (
          <div className="card">
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'#f0ede8', marginBottom:'1.25rem' }}>
              Your Contact Details
            </div>
            <p style={{ fontSize:'0.82rem', color:'#666', marginBottom:'1.25rem', lineHeight:1.6 }}>
              We need your contact info so responders can reach you for more details if needed. This information is kept private.
            </p>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                className="form-input"
                type="tel"
                placeholder="09xx xxx xxx"
                value={guestPhone}
                onChange={e => setGuestPhone(e.target.value.replace(/[^0-9+\-\s]/g, ''))}
              />
              <span className="form-hint">In case responders need to call you directly.</span>
            </div>

            <button
              className="btn-primary"
              style={{ width:'100%', padding:'0.9rem' }}
              onClick={() => { if (validateContact()) setStep(2); }}
            >
              Continue →
            </button>

            <p style={{ textAlign:'center', fontSize:'0.78rem', color:'#555', marginTop:'1rem' }}>
              Have an account?{' '}
              <Link to="/login" style={{ color:'#f4820a', textDecoration:'none' }}>Sign in to report</Link>
            </p>
          </div>
        )}

        {/* ── Step 2: Incident ─────────────────────────────── */}
        {step === 2 && (
          <div className="card">
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'#f0ede8', marginBottom:'1.25rem' }}>
              Incident Details
            </div>

            <div className="form-group">
              <label className="form-label">Type of Fire *</label>
              <select
                className="form-select"
                value={fireType}
                onChange={e => setFireType(e.target.value)}
              >
                <option value="">Select fire type…</option>
                {FIRE_TYPES.map(t => (
                  <option key={t} value={t} style={{ textTransform:'capitalize' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Severity *</label>
              <select className="form-select" value={severity} onChange={e => setSeverity(e.target.value)}>
                <option value="Low">Low — small, contained, no immediate danger</option>
                <option value="Medium">Medium — spreading, risk to property</option>
                <option value="High">High — large fire, people in danger</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-textarea"
                placeholder="Describe what you see — size of fire, people in danger, nearby landmarks…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.2rem' }}>
                {description.length > 0 && description.length < 10
                  ? <span style={{ fontSize:'0.72rem', color:'#e63c2f' }}>{10 - description.length} more characters needed</span>
                  : <span />
                }
                <span style={{ fontSize:'0.72rem', color:'#444' }}>{description.length} chars</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Fire Location *</label>
              <p style={{ fontSize:'0.78rem', color:'#666', marginBottom:'0.6rem' }}>
                Click the map to pin the exact fire location.
              </p>
              <MapPicker
                position={location || { lat: 9.03, lng: 38.74 }}
                onPositionChange={loc => setLocation(loc)}
              />
              {location && (
                <div style={{ fontSize:'0.72rem', color:'#22c55e', marginTop:'0.35rem' }}>
                  ✓ Location pinned: {location.address || `${location.lat?.toFixed(4)}, ${location.lng?.toFixed(4)}`}
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:'0.6rem' }}>
              <button
                className="btn-secondary"
                style={{ flex:1 }}
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                className="btn-primary"
                style={{ flex:2, padding:'0.9rem' }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : '🚨 Submit Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}