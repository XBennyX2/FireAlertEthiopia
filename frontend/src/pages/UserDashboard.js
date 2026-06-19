import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import NotificationBell from '../components/NotificationBell';
import IncidentMap from '../components/IncidentMap';
import LiveTrackingMap from '../components/LiveTrackingMap';
import API from '../api/axios';
import '../dashboard.css';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function StatusBadge({ status, t }) {
  const normalized = status?.toLowerCase() || 'pending';
  const label      = t[normalized] || status || 'Pending';
  return (
    <span className={`status-badge status-${normalized}`}>
      {label}
    </span>
  );
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const { t }            = useLanguage();
  const navigate         = useNavigate();

  const [incidents,        setIncidents]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [watchingIncidentId, setWatchingIncidentId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await API.get('/incidents/mine');
        setIncidents(data);
      } catch (err) {
        setError('Could not load your reports. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const counts = {
    total:    incidents.length,
    pending:  incidents.filter(i => i.status === 'pending').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
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
          <span className="dash-role-badge">{t.citizen}</span>
          <span className="dash-user-name">{user?.name}</span>
          <NotificationBell />
          <button
            className="dash-logout-btn"
            onClick={() => { logout(); navigate('/'); }}
          >
            {t.signOut}
          </button>
        </div>
      </nav>

      <div className="dash-content">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">{t.hello}, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="dash-subtitle">{t.activitySummary}</p>
          </div>
          <Link to="/report" className="btn-primary">🚨 {t.reportAFire}</Link>
        </div>

        {/* ── Stats Row ───────────────────────────────────────── */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">{t.reputationScore}</div>
            <div className="stat-value stat-accent">{user?.reputationScore ?? 100}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t.totalReports}</div>
            <div className="stat-value">{counts.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t.pending}</div>
            <div className="stat-value">{counts.pending}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t.resolved}</div>
            <div className="stat-value">{counts.resolved}</div>
          </div>
        </div>

        {/* ── Overview Incident Map ────────────────────────────── */}
        {!loading && incidents.length > 0 && (
          <div style={{ marginBottom:'2rem' }}>
            <div className="section-label" style={{ marginBottom:'0.75rem' }}>
              📍 My Report Locations
            </div>
            <IncidentMap
              key={incidents.map(i => i._id + i.status).join('-')}
              incidents={incidents}
              height={320}
            />
          </div>
        )}

        {/* ── My Reports List ──────────────────────────────────── */}
        <div className="section-label">{t.myReports}</div>

        {loading && <div className="loading-state">{t.loading}</div>}
        {error   && (
          <div className="loading-state" style={{ color:'#f87c74' }}>{error}</div>
        )}

        {!loading && !error && incidents.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div>{t.noReports}</div>
            <Link
              to="/report"
              className="btn-primary"
              style={{ marginTop:'1rem', display:'inline-block' }}
            >
              {t.submitFirst}
            </Link>
          </div>
        )}

        {!loading && incidents.length > 0 && (
          <div className="incident-grid">
            {incidents.map(incident => {
              const rawType        = incident.fire_type?.toLowerCase() || 'other';
              const translatedType = t.fireTypes?.[rawType] || incident.fire_type || t.fireTypes?.other;
              const isWatching     = watchingIncidentId === incident._id;

              return (
                <div
                  key={incident._id}
                  className="card"
                  style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}
                >

                  {/* ── Card top row ──────────────────────────── */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem' }}>
                    <span style={{ fontSize:'0.7rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#444' }}>
                      {translatedType}
                    </span>
                    <StatusBadge status={incident.status} t={t} />
                  </div>

                  {/* ── Description ───────────────────────────── */}
                  <p style={{
                    fontSize:        '0.875rem',
                    color:           '#c0bdb8',
                    lineHeight:      1.55,
                    margin:          0,
                    overflow:        'hidden',
                    display:         '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {incident.description}
                  </p>

                  {/* ── AI Trust Score ────────────────────────── */}
                  {incident.ai_trust_score !== undefined && (
                    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                      <div style={{ flex:1, height:3, background:'#1e1e1e', borderRadius:99, overflow:'hidden' }}>
                        <div style={{
                          height:     '100%',
                          width:      `${incident.ai_trust_score}%`,
                          background: incident.ai_trust_score >= 75
                            ? '#22c55e'
                            : incident.ai_trust_score >= 50
                              ? '#f4820a'
                              : '#e63c2f',
                          borderRadius: 99,
                          transition:   'width 0.6s',
                        }} />
                      </div>
                      <span style={{ fontSize:'0.68rem', color:'#666' }}>
                        {t.trust} {incident.ai_trust_score}%
                      </span>
                    </div>
                  )}

                  {/* ── Footer ───────────────────────────────── */}
                  <div style={{
                    borderTop:     '1px solid #1e1e1e',
                    paddingTop:    '0.65rem',
                    display:       'flex',
                    justifyContent:'space-between',
                    alignItems:    'center',
                  }}>
                    <span style={{ fontSize:'0.72rem', color:'#555' }}>
                      📍 {incident.location?.address || `${incident.location?.lat?.toFixed(4)}, ${incident.location?.lng?.toFixed(4)}`}
                    </span>
                    <span style={{ fontSize:'0.72rem', color:'#444' }}>
                      {fmtDate(incident.reportedAt)}
                    </span>
                  </div>

                  {/* ── Live Tracking — dispatched only ──────── */}
                  {incident.status === 'dispatched' && (
                    <div>
                      <button
                        className="btn-secondary"
                        style={{
                          width:         '100%',
                          fontSize:      '0.78rem',
                          marginBottom:  isWatching ? '0.75rem' : 0,
                          borderColor:   isWatching ? 'var(--fire-orange)' : undefined,
                          color:         isWatching ? 'var(--fire-orange)' : undefined,
                        }}
                        onClick={() => setWatchingIncidentId(isWatching ? null : incident._id)}
                      >
                        {isWatching
                          ? '🔴 Stop Watching'
                          : '🚒 Track Responder Live'}
                      </button>

                      {isWatching && (
                        <LiveTrackingMap
                          key={incident._id}
                          incident={incident}
                          mode="user"
                          height={300}
                        />
                      )}
                    </div>
                  )}

                  {/* ── Resolved indicator ───────────────────── */}
                  {incident.status === 'resolved' && (
                    <div style={{
                      display:        'flex',
                      alignItems:     'center',
                      gap:            '0.4rem',
                      fontSize:       '0.75rem',
                      color:          '#22c55e',
                      padding:        '0.4rem 0.75rem',
                      background:     'rgba(34,197,94,0.08)',
                      borderRadius:   6,
                      border:         '1px solid rgba(34,197,94,0.15)',
                    }}>
                      ✅ This incident has been resolved. Thank you for reporting.
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