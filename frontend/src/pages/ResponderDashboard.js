import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import IncidentMap from '../components/IncidentMap';
import API from '../api/axios';
import '../dashboard.css';
import LiveTrackingMap from '../components/LiveTrackingMap';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function StatusBadge({ status, t }) {
  const normalized = status?.toLowerCase() || 'pending';
  const label = t[normalized] || status || 'Pending';
  return (
    <span className={`status-badge status-${normalized}`}>
      {label}
    </span>
  );
}

function getActions(status) {
  if (status === 'pending')    return ['verify', 'reject'];
  if (status === 'verified')   return ['dispatch'];
  if (status === 'dispatched') return ['resolve'];
  return [];
}

const STATUS_COLORS = {
  pending:    '#f4820a',
  verified:   '#3b82f6',
  dispatched: '#a855f7',
  resolved:   '#22c55e',
};

export default function ResponderDashboard() {
  const { user, logout } = useAuth();
  const { t }            = useLanguage();
  const navigate         = useNavigate();

  const [incidents,     setIncidents]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [onDuty,        setOnDuty]        = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [showMap,       setShowMap]       = useState(true);

  // ── Action labels using dot notation ─────────────────────────────
  const ACTION_LABELS = {
    verify:   { label: t.verify,   style: 'btn-action'  },
    dispatch: { label: t.dispatch, style: 'btn-primary' },
    resolve:  { label: t.resolve,  style: 'btn-action'  },
    reject:   { label: t.reject,   style: 'btn-danger'  },
  };

  useEffect(() => { loadIncidents(); }, []);

  async function loadIncidents() {
    setLoading(true);
    try {
      const { data } = await API.get('/responder/incidents');
      setIncidents(data);
    } catch (err) {
      setError('Could not load incident queue.');
    } finally {
      setLoading(false);
    }
  }

  async function takeAction(incidentId, action) {
    setActionLoading(incidentId + action);
    try {
      await API.put(`/responder/incidents/${incidentId}/${action}`);
      await loadIncidents();
    } catch (err) {
      alert(err.response?.data?.message || `Action "${action}" failed.`);
    } finally {
      setActionLoading('');
    }
  }

  const counts = {
    total:      incidents.length,
    pending:    incidents.filter(i => i.status === 'pending').length,
    verified:   incidents.filter(i => i.status === 'verified').length,
    dispatched: incidents.filter(i => i.status === 'dispatched').length,
  };

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

          {/* Availability Toggle */}
          <div className="toggle-wrap" onClick={() => setOnDuty(v => !v)}>
            <div className={`toggle-track ${onDuty ? 'on' : ''}`}>
              <div className="toggle-thumb" />
            </div>
            <span className="toggle-label">
              {onDuty ? t.onDuty : t.offDuty}
            </span>
          </div>

          <span className="dash-role-badge">{t.responder}</span>
          <span className="dash-user-name">{user?.name}</span>
          <button className="dash-logout-btn" onClick={() => { logout(); navigate('/'); }}>
            {t.signOut}
          </button>
        </div>
      </nav>

      <div className="dash-content">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">{t.incidentQueue}</h1>
            <p className="dash-subtitle">{t.incidentQueueSub}</p>
          </div>
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button
              className="btn-secondary"
              onClick={() => setShowMap(v => !v)}
              style={{ fontSize:'0.8rem' }}
            >
              {showMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
            </button>
            <button className="btn-secondary" onClick={loadIncidents}>
              {t.refresh}
            </button>
          </div>
        </div>

        {/* ── Stats ────────────────────────────────────────────── */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">{t.totalActive}</div>
            <div className="stat-value">{counts.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t.awaitingReview}</div>
            <div className="stat-value" style={{ color:'var(--status-pending)' }}>
              {counts.pending}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t.verified}</div>
            <div className="stat-value" style={{ color:'var(--status-verified)' }}>
              {counts.verified}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t.dispatched}</div>
            <div className="stat-value" style={{ color:'var(--status-dispatched)' }}>
              {counts.dispatched}
            </div>
          </div>
        </div>

        {/* ── Incident Map ─────────────────────────────────────── */}
        {!loading && incidents.length > 0 && showMap && (
  <div style={{ marginBottom:'2rem', position:'relative', zIndex:1 }}>
    <div className="section-label" style={{ marginBottom:'0.75rem' }}>
      🗺️ Active Incident Locations
    </div>
    <IncidentMap
      key={incidents.map(i => i._id + i.status).join('-')}
      incidents={incidents}
      height={380}
    />
            {/* Status legend */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', marginTop:'0.75rem' }}>
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', color:'#666' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: color }} />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Incident Cards ───────────────────────────────────── */}
        <div className="section-label">{t.activeIncidents}</div>

        {loading && <div className="loading-state">{t.loading}</div>}
        {error   && <div className="loading-state" style={{ color:'#f87c74' }}>{error}</div>}

        {!loading && incidents.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div>{t.noActiveIncidents}</div>
          </div>
        )}

        {!loading && incidents.length > 0 && (
          <div className="incident-grid">
            {incidents.map(incident => {
              const actions        = getActions(incident.status);
              const rawType        = incident.fire_type?.toLowerCase() || 'other';
              const translatedType = t.fireTypes?.[rawType] || incident.fire_type || t.fireTypes?.other;

              return (
                <div key={incident._id} className="card" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

                  {/* Top row */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <span style={{ fontSize:'0.7rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#444' }}>
                        {translatedType}
                      </span>
                      <div style={{ marginTop:'0.2rem' }}>
                        <StatusBadge status={incident.status} t={t} />
                      </div>
                    </div>
                    {/* AI Trust Score */}
                    {incident.ai_trust_score !== undefined && (
                      <div style={{
                        padding:    '0.25rem 0.6rem',
                        background: incident.ai_trust_score >= 75 ? 'rgba(34,197,94,0.12)' : 'rgba(244,130,10,0.12)',
                        border:     `1px solid ${incident.ai_trust_score >= 75 ? 'rgba(34,197,94,0.25)' : 'rgba(244,130,10,0.25)'}`,
                        borderRadius: 6,
                        fontSize:   '0.7rem',
                        fontWeight: 600,
                        color:      incident.ai_trust_score >= 75 ? '#22c55e' : '#f4820a',
                      }}>
                        AI {incident.ai_trust_score}%
                      </div>
                    )}
                  </div>

                  {/* Media preview */}
                  {incident.mediaFiles?.length > 0 && (
                    <img
                      src={`http://localhost:5000/${incident.mediaFiles[0]}`}
                      alt="incident"
                      style={{ width:'100%', height:140, objectFit:'cover', borderRadius:8, display:'block' }}
                      onError={e => e.target.style.display = 'none'}
                    />
                  )}

                  {/* Description */}
                  <p style={{ fontSize:'0.875rem', color:'#c0bdb8', lineHeight:1.55, margin:0,
                    overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>
                    {incident.description}
                  </p>

                  {/* AI flags */}
                  {incident.ai_flags?.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'0.3rem' }}>
                      {incident.ai_flags.map(flag => (
                        <span key={flag} style={{ fontSize:'0.65rem', padding:'0.15rem 0.5rem', background:'rgba(230,60,47,0.1)', color:'#f87c74', borderRadius:4, letterSpacing:'0.03em' }}>
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Location + Time */}
                  <div style={{ borderTop:'1px solid #1e1e1e', paddingTop:'0.65rem', fontSize:'0.72rem', color:'#555', display:'flex', justifyContent:'space-between' }}>
                    <span>
                      📍 {incident.location?.address || `${Number(incident.location?.lat).toFixed(4)}, ${Number(incident.location?.lng).toFixed(4)}`}
                    </span>
                    <span>{fmtDate(incident.reportedAt)}</span>
                  </div>

                  {/* Action Buttons */}
                  {actions.length > 0 && (
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      {actions.map(action => {
                        const cfg       = ACTION_LABELS[action];
                        const isLoading = actionLoading === incident._id + action;
                        return (
                          <button
                            key={action}
                            className={cfg.style}
                            onClick={() => takeAction(incident._id, action)}
                            disabled={!!actionLoading}
                          >
                            {isLoading ? '…' : cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}