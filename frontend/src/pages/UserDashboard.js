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
import SearchFilterBar from '../components/SearchFilterBar';

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
  const { user, logout, refreshUser } = useAuth();
  const { t }            = useLanguage();
  const navigate         = useNavigate();

  const [incidents,        setIncidents]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [watchingIncidentId, setWatchingIncidentId] = useState(null);
  const [search,     setSearch]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterFireType, setFilterFireType] = useState('');
  const [sortBy,     setSortBy]     = useState('newest');

  useEffect(() => {
    async function load() {
      try {
        // Refresh both incidents and user reputation score simultaneously
        const [incidentRes] = await Promise.all([
          API.get('/incidents/mine'),
          refreshUser(),
        ]);
        setIncidents(incidentRes.data);
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

  // Process data locally based on state inputs
  const filteredIncidents = incidents
    .filter(i => {
      const matchSearch = !search ||
        i.description?.toLowerCase().includes(search.toLowerCase()) ||
        i._id?.toLowerCase().includes(search.toLowerCase()) ||
        i.location?.address?.toLowerCase().includes(search.toLowerCase());

      const matchStatus   = !filterStatus   || i.status    === filterStatus;
      const matchFireType = !filterFireType || i.fire_type === filterFireType;

      return matchSearch && matchStatus && matchFireType;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')   return new Date(b.reportedAt) - new Date(a.reportedAt);
      if (sortBy === 'oldest')   return new Date(a.reportedAt) - new Date(b.reportedAt);
      if (sortBy === 'severity') {
        const order = { High: 3, Medium: 2, Low: 1 };
        return (order[b.severity] || 0) - (order[a.severity] || 0);
      }
      return 0;
    });

  const hasActiveFilters = search || filterStatus || filterFireType;

  return (
    <div className="dash-page">

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <nav className="dash-topbar">

        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">{t.appName}</span>
        </Link>
        <Link to="/forum" className="btn-secondary" style={{ fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}>
          💬 Forum
        </Link>
        <div className="dash-topbar-right">
          <LanguageSwitcher />
          <span className="dash-role-badge">{t.citizen}</span>
          <span className="dash-user-name">{user?.name}</span>
          <Link
            to="/profile"
            style={{
              width:          32,
              height:         32,
              borderRadius:   '50%',
              background:     user?.profilePhoto ? 'transparent' : 'linear-gradient(135deg, #e63c2f, #f4820a)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              overflow:       'hidden',
              border:         '1px solid #2a2a2a',
              textDecoration: 'none',
              flexShrink:     0,
              fontSize:       '0.75rem',
              fontFamily:     "'Syne',sans-serif",
              fontWeight:     800,
              color:          '#fff',
            }}
          >
            {user?.profilePhoto
              ? <img src={user.profilePhoto} alt="profile" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : user?.name?.charAt(0)?.toUpperCase() || '?'
            }
          </Link>
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

        {/* ── Search and Filter Controls ───────────────────────── */}
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Search by description, ID, or address…"
          filters={[
            {
              key:         'status',
              value:       filterStatus,
              onChange:    setFilterStatus,
              placeholder: 'All Statuses',
              options: [
                { value:'pending',    label:'Pending'    },
                { value:'verified',   label:'Verified'   },
                { value:'dispatched', label:'Dispatched' },
                { value:'resolved',   label:'Resolved'   },
                { value:'rejected',   label:'Rejected'   },
              ],
            },
            {
              key:         'fireType',
              value:       filterFireType,
              onChange:    setFilterFireType,
              placeholder: 'All Fire Types',
              options: [
                { value:'residential', label:'Residential' },
                { value:'commercial',  label:'Commercial'  },
                { value:'vehicle',     label:'Vehicle'     },
                { value:'industrial',  label:'Industrial'  },
                { value:'wildland',    label:'Wildland'    },
                { value:'other',       label:'Other'       },
              ],
            },
          ]}
          sortOptions={[
            { value:'newest',   label:'Sort: Newest First'  },
            { value:'oldest',   label:'Sort: Oldest First'  },
            { value:'severity', label:'Sort: High Severity' },
          ]}
          sortValue={sortBy}
          onSortChange={setSortBy}
        />

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
              incidents={filteredIncidents}
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

        {/* ── Empty States (No data OR no matching search queries) ── */}
        {!loading && !error && filteredIncidents.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div>{hasActiveFilters ? 'No reports match your filters.' : t.noReports}</div>
            
            {!hasActiveFilters ? (
              <Link
                to="/report"
                className="btn-primary"
                style={{ marginTop:'1rem', display:'inline-block' }}
              >
                {t.submitFirst}
              </Link>
            ) : (
              <button
                className="btn-secondary"
                style={{ marginTop:'1rem' }}
                onClick={() => { setSearch(''); setFilterStatus(''); setFilterFireType(''); }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ── Incident Render Cards ───────────────────────────── */}
        {!loading && filteredIncidents.length > 0 && (
          <div className="incident-grid">
            {filteredIncidents.map(incident => {
              const rawType        = incident.fire_type?.toLowerCase() || 'other';
              const translatedType = t.fireTypes?.[rawType] || incident.fire_type || t.fireTypes?.other;
              const isWatching     = watchingIncidentId === incident._id;

              return (
                <div
                  key={incident._id}
                  className="card"
                  style={{ 
                    display:'flex', 
                    flexDirection:'column', 
                    gap:'0.75rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, transform 0.2s'
                  }}
                  onClick={() => navigate(`/incidents/${incident._id}`)}
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
                    <div onClick={(e) => e.stopPropagation()}>
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