import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import IncidentMap from '../components/IncidentMap';
import LiveTrackingMap from '../components/LiveTrackingMap';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import '../dashboard.css';
import SkeletonCard from '../components/SkeletonCard';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
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

// Sub-component for Shift Schedule
function ShiftTab() {
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const [schedule, setSchedule] = useState([]);
  const [saving,   setSaving]   = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    API.get('/responder/shift')
      .then(({ data }) => setSchedule(data.shiftSchedule || []))
      .catch(() => {});
  }, []);

  function toggleDay(day) {
    setSchedule(prev =>
      prev.find(s => s.day === day)
        ? prev.filter(s => s.day !== day)
        : [...prev, { day, startTime:'08:00', endTime:'16:00' }]
    );
  }

  function updateTime(day, field, value) {
    setSchedule(prev => prev.map(s => s.day === day ? { ...s, [field]: value } : s));
  }

  async function save() {
    setSaving(true);
    try {
      await API.put('/responder/shift', { shiftSchedule: schedule });
      toast.success('Shift schedule saved.');
    } catch { 
      toast.error('Failed to save shift.'); 
    } finally { 
      setSaving(false); 
    }
  }

  return (
    <div>
      <div className="section-label" style={{ marginBottom:'1rem' }}>📅 My Shift Schedule</div>
      <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:'1.25rem', lineHeight:1.6 }}>
        Set your regular availability. This helps dispatchers assign incidents efficiently.
      </p>
      {DAYS.map(day => {
        const entry = schedule.find(s => s.day === day);
        return (          
          <div key={day} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.6rem 0', borderBottom:'1px solid #111', flexWrap:'wrap' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', minWidth:60 }}>
              <input
                type="checkbox"
                checked={!!entry}
                onChange={() => toggleDay(day)}
                style={{ accentColor:'#f4820a' }}
              />
              <span style={{ fontSize:'0.85rem', fontWeight:600, color:entry?'#f0ede8':'#555' }}>{day}</span>
            </label>
            {entry && (
              <>
                <input type="time" value={entry.startTime} onChange={e => updateTime(day,'startTime',e.target.value)}
                  className="form-input" style={{ width:'auto', marginBottom:0, fontSize:'0.82rem' }} />
                <span style={{ color:'#444', fontSize:'0.8rem' }}>to</span>
                <input type="time" value={entry.endTime} onChange={e => updateTime(day,'endTime',e.target.value)}
                  className="form-input" style={{ width:'auto', marginBottom:0, fontSize:'0.82rem' }} />
              </>
            )}
          </div>
        );
      })}
      <button className="btn-primary" onClick={save} disabled={saving} style={{ marginTop:'1.25rem' }}>
        {saving ? 'Saving…' : 'Save Schedule'}
      </button>
    </div>
  );
}

// Sub-component for Leaderboard
function LeaderboardTab() {
  const [board, setBoard] = useState([]);
  
  useEffect(() => {
    API.get('/responder/leaderboard')
      .then(({ data }) => setBoard(data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="section-label" style={{ marginBottom:'1rem' }}>🏆 Top Responders</div>
      {board.map((r, i) => (
        <div key={r._id} className="card-sm" style={{ display:'flex', alignItems:'center', gap:'0.85rem', marginBottom:'0.5rem' }}>
          <div style={{
            width:28, height:28, borderRadius:'50%', flexShrink:0,
            background: i===0?'#f4820a':i===1?'#888':i===2?'#a0522d':'#1e1e1e',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.75rem', fontWeight:800, color:'#fff',
          }}>
            {i+1}
          </div>
          <div style={{ width:32, height:32, borderRadius:'50%', overflow:'hidden', flexShrink:0, background:'#1e1e1e', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {r.profilePhoto
              ? <img src={`http://localhost:5000/${r.profilePhoto}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontSize:'0.75rem', color:'#888' }}>{r.name?.charAt(0)}</span>
            }
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#f0ede8' }}>{r.name}</div>
            <div style={{ fontSize:'0.72rem', color:'#555' }}>Rep: {r.reputationScore}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'1rem', fontWeight:700, color:'#22c55e' }}>{r.resolvedCount}</div>
            <div style={{ fontSize:'0.68rem', color:'#555' }}>resolved</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ResponderDashboard() {
  const { user, logout } = useAuth();
  const { t }            = useLanguage();
  const navigate         = useNavigate();
  const { toast }        = useToast();

  const [tab,               setTab]               = useState('queue');
  const [incidents,         setIncidents]         = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState('');
  const [onDuty,            setOnDuty]            = useState(true);
  const [actionLoading,     setActionLoading]     = useState('');
  const [showMap,           setShowMap]           = useState(true);
  const [trackingIncidentId, setTrackingIncidentId] = useState(null);
  const [actionNotes,       setActionNotes]       = useState({});

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

  async function takeAction(incidentId, action, extraBody = {}) {
    setActionLoading(incidentId + action);
    try {
      await API.put(`/responder/incidents/${incidentId}/${action}`, {
        note: actionNotes[incidentId] || '',
        ...extraBody,
      });
      setActionNotes(prev => { const n = {...prev}; delete n[incidentId]; return n; });
      if (action === 'resolve' || action === 'reject') {
        setTrackingIncidentId(null);
      }
      await loadIncidents();

      const messages = {
        verify:   'Incident verified successfully.',
        dispatch: 'Units dispatched to incident location.',
        resolve:  'Incident marked as resolved.',
        reject:   'Report rejected. Reporter has been notified.',
      };
      toast.success(messages[action] || 'Action completed.');
    } catch (err) {
      toast.error(err.response?.data?.message || `Action "${action}" failed.`);
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

  const TAB_STYLE = (currentTab) => ({
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    background: tab === currentTab ? '#1e1e1e' : 'transparent',
    color: tab === currentTab ? '#fff' : '#888',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem'
  });

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
          <button
            className="dash-logout-btn"
            onClick={() => { logout(); navigate('/'); }}
          >
            {t.signOut}
          </button>
        </div>
      </nav>

      <div className="dash-content">
        {loading && (
          <>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </>
        )}

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">{t.incidentQueue}</h1>
            <p className="dash-subtitle">{t.incidentQueueSub}</p>
          </div>
          <div style={{ display:'flex', gap:'0.5rem', alignItems: 'center' }}>
            {/* Tab navigation buttons */}
            <div style={{ display: 'flex', gap: '0.25rem', background: '#111', padding: '0.25rem', borderRadius: '8px', marginRight: '0.5rem' }}>
              <button style={TAB_STYLE('queue')} onClick={() => setTab('queue')}>
                📋 {t.incidentQueue || 'Queue'}
              </button>
              <button style={TAB_STYLE('leaderboard')} onClick={() => setTab('leaderboard')}>
                🏆 Leaderboard
              </button>
              <button style={TAB_STYLE('shift')} onClick={() => setTab('shift')}>
                📅 Shift
              </button>
            </div>

            <button
              className="btn-secondary"
              onClick={() => { setShowMap(v => !v); }}
              style={{ fontSize:'0.8rem' }}
            >
              {showMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
            </button>
            <button className="btn-secondary" onClick={loadIncidents}>
              {t.refresh}
            </button>
          </div>
        </div>

        {/* Render Queue Content View */}
        {tab === 'queue' && (
          <>
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

            {/* ── Overview Incident Map ────────────────────────────── */}
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
                    <div
                      key={status}
                      style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', color:'#666' }}
                    >
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
            {error   && (
              <div className="loading-state" style={{ color:'#f87c74' }}>{error}</div>
            )}

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
                  const isTracking     = trackingIncidentId === incident._id;
                  
                  const reporterName   = incident.isAnonymous && incident.reportedBy?.name === 'Anonymous'
                    ? 'Anonymous'
                    : incident.reportedBy?.name || 'Unknown Reporter';

                  return (
                    <div
                      key={incident._id}
                      className="card"
                      style={{ display:'flex', flexDirection:'column', gap:'1rem' }}
                    >
                      {/* ── Top row ──────────────────────────────── */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize:'0.7rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#444' }}>
                              {translatedType}
                            </span>
                            {incident.isAnonymous && (
                              <span style={{
                                fontSize:'0.65rem', padding:'0.1rem 0.5rem', borderRadius:999,
                                background:'rgba(244,130,10,0.1)', color:'#f4820a',
                                fontWeight:700, marginLeft:'0.4rem',
                              }}>
                                Anonymous
                              </span>
                            )}
                          </div>
                          <div style={{ marginTop:'0.2rem' }}>
                            <StatusBadge status={incident.status} t={t} />
                          </div>
                        </div>

                        {/* Meta actions & badges */}
                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                          <button
                            className="btn-secondary"
                            style={{ fontSize:'0.72rem' }}
                            onClick={async () => {
                              const msg = window.prompt('What additional information do you need from the reporter?');
                              if (!msg?.trim()) return;
                              try {
                                await API.post(`/responder/incidents/${incident._id}/request-info`, { message: msg });
                                toast.success('Info request sent to reporter.');
                              } catch (err) {
                                toast.error(err.response?.data?.message || 'Failed to send request.');
                              }
                            }}
                          >
                            ❓ Request Info
                          </button>

                          <Link  
                            to={`/incidents/${incident._id}`}  
                            className="btn-secondary"  
                            style={{ fontSize:'0.75rem', padding:'0.3rem 0.6rem', textDecoration:'none', whiteSpace:'nowrap' }}
                          >  
                            View Details →
                          </Link>

                          {/* 🔄 Reassign Action for Admins */}
                          {user?.role === 'admin' && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize:'0.72rem' }}
                              onClick={async () => {
                                const responderId = window.prompt('Enter Responder User ID to reassign:');
                                if (!responderId?.trim()) return;
                                try {
                                  await API.put(`/responder/incidents/${incident._id}/reassign`, { responderId });
                                  toast.success('Incident reassigned.');
                                  await loadIncidents();
                                } catch (err) {
                                  toast.error(err.response?.data?.message || 'Failed to reassign.');
                                }
                              }}
                            >
                              🔄 Reassign
                            </button>
                          )}

                          {incident.ai_trust_score !== undefined && (
                            <div style={{
                              padding:      '0.25rem 0.6rem',
                              background:   incident.ai_trust_score >= 75 ? 'rgba(34,197,94,0.12)' : 'rgba(244,130,10,0.12)',
                              border:       `1px solid ${incident.ai_trust_score >= 75 ? 'rgba(34,197,94,0.25)' : 'rgba(244,130,10,0.25)'}`,
                              borderRadius: 6,
                              fontSize:     '0.7rem',
                              fontWeight:   600,
                              color:        incident.ai_trust_score >= 75 ? '#22c55e' : '#f4820a',
                            }}>
                              AI {incident.ai_trust_score}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Media preview ────────────────────────── */}
                      {incident.mediaFiles?.length > 0 && (
                        <img
                          src={`http://localhost:5000/${incident.mediaFiles[0]}`}
                          alt="incident"
                          style={{ width:'100%', height:140, objectFit:'cover', borderRadius:8, display:'block' }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      )}

                      {/* ── Description ──────────────────────────── */}
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

                      {/* ── Reporter Info Row ───────────────────── */}
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '-0.25rem' }}>
                        Reporter: <span style={{ fontWeight: 600, color: incident.isAnonymous ? '#f4820a' : '#fff' }}>{reporterName}</span>
                      </div>

                      {/* ── AI flags ─────────────────────────────── */}
                      {incident.ai_flags?.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.3rem' }}>
                          {incident.ai_flags.map(flag => (
                            <span
                              key={flag}
                              style={{ fontSize:'0.65rem', padding:'0.15rem 0.5rem', background:'rgba(230,60,47,0.1)', color:'#f87c74', borderRadius:4, letterSpacing:'0.03em' }}
                            >
                              {flag.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* ── Location + Time ───────────────────────── */}
                      <div style={{ borderTop:'1px solid #1e1e1e', paddingTop:'0.65rem', fontSize:'0.72rem', color:'#555', display:'flex', justifyContent:'space-between' }}>
                        <span>
                          📍 {incident.location?.address || `${Number(incident.location?.lat).toFixed(4)}, ${Number(incident.location?.lng).toFixed(4)}`}
                        </span>
                        <span>{fmtDate(incident.reportedAt)}</span>
                      </div>

                      {/* ── Notes textarea + Action Buttons ──────── */}
                      {actions.length > 0 && (
                        <>
                          <div style={{ marginTop:'0.75rem' }}>
                            <textarea
                              className="form-textarea"
                              placeholder="Add a note (optional — shown in status timeline)…"
                              value={actionNotes[incident._id] || ''}
                              onChange={e => setActionNotes(prev => ({ ...prev, [incident._id]: e.target.value }))}
                              rows={2}
                              style={{ fontSize:'0.78rem', marginBottom:'0.5rem' }}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>

                          <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                            {actions.map(action => {
                              const cfg       = ACTION_LABELS[action];
                              const isLoading = actionLoading === incident._id + action;

                              if (action === 'reject') {
                                return (
                                  <button
                                    key={action}
                                    className="btn-danger"
                                    onClick={e => {
                                      e.stopPropagation();
                                      takeAction(incident._id, 'reject', {
                                        rejectionReason: actionNotes[incident._id] || ''
                                      });
                                    }}
                                    disabled={!!actionLoading}
                                  >
                                    {isLoading ? '…' : '✕ Reject'}
                                  </button>
                                );
                              }

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
                        </>
                      )}

                      {/* ── Live Tracking — dispatched only ──────── */}
                      {incident.status === 'dispatched' && (
                        <div>
                          <button
                            className="btn-secondary"
                            style={{ width:'100%', fontSize:'0.78rem', marginBottom: isTracking ? '0.75rem' : 0 }}
                            onClick={() => setTrackingIncidentId(isTracking ? null : incident._id)}
                          >
                            {isTracking
                              ? '📍 Stop Sharing Location'
                              : '📍 Share My Location & See Route'}
                          </button>

                          {isTracking && (
                            <LiveTrackingMap
                              key={incident._id}
                              incident={incident}
                              mode="responder"
                              height={320}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Render Leaderboard Content View */}
        {tab === 'leaderboard' && (
          <LeaderboardTab />
        )}

        {/* Render Shift Content View */}
        {tab === 'shift' && (
          <ShiftTab />
        )}
      </div>
    </div>
  );
}