import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import NotificationBell from '../components/NotificationBell';
import API from '../api/axios';
import '../dashboard.css';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    day:'numeric', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

const STATUS_CONFIG = {
  pending:    { color:'#f4820a', icon:'⏳', label:'Pending Review'   },
  verified:   { color:'#3b82f6', icon:'✔',  label:'Verified'         },
  dispatched: { color:'#a855f7', icon:'🚒', label:'Units Dispatched' },
  resolved:   { color:'#22c55e', icon:'✅', label:'Resolved'         },
  rejected:   { color:'#e63c2f', icon:'✕',  label:'Rejected'         },
};

const ALL_STATUSES = ['pending', 'verified', 'dispatched', 'resolved'];

export default function IncidentDetailPage() {
  const { id }             = useParams();
  const { user, logout }   = useAuth();
  const { t }              = useLanguage();
  const navigate           = useNavigate();

  const [incident,    setIncident]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await API.get(`/incidents/${id}`);
        setIncident(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load incident.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const dashLink = user?.role === 'admin'
    ? '/admin'
    : user?.role === 'responder'
      ? '/responder'
      : '/dashboard';

  if (loading) {
    return (
      <div className="dash-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>Loading incident…</div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="dash-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>⚠️</div>
          <div style={{ color:'#f87c74', marginBottom:'1rem' }}>{error || 'Incident not found'}</div>
          <Link to={dashLink} className="btn-secondary">← Back</Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[incident.status] || STATUS_CONFIG.pending;
  const isRejected = incident.status === 'rejected';

  // Build the timeline — always starts with pending
  const pendingEntry = {
    status:    'pending',
    timestamp: incident.reportedAt,
    note:      'Report submitted by user',
  };

  const timelineEntries = [
    pendingEntry,
    ...(incident.statusHistory || []).filter(h => h.status !== 'pending'),
  ];

  return (
    <div className="dash-page">

      {/* Lightbox for full-size image */}
      {lightboxImg && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="full size" style={{ maxWidth:'100%', maxHeight:'90vh', objectFit:'contain', borderRadius:8 }} />
          <button
            onClick={() => setLightboxImg(null)}
            style={{ position:'absolute', top:'1rem', right:'1rem', background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', width:36, height:36, borderRadius:'50%', cursor:'pointer', fontSize:'1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">{t.appName}</span>
        </Link>
        <div className="dash-topbar-right">
          <LanguageSwitcher />
          <Link to={dashLink} className="btn-secondary" style={{ fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}>
            ← Back
          </Link>
          <NotificationBell />
          <button className="dash-logout-btn" onClick={() => { logout(); navigate('/'); }}>
            {t.signOut}
          </button>
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth:760 }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Incident Report</h1>
            <p className="dash-subtitle" style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'var(--text-dim)' }}>
              #{incident._id}
            </p>
          </div>
          <span style={{
            display:'inline-flex', alignItems:'center', gap:'0.4rem',
            padding:'0.4rem 1rem', borderRadius:999,
            background:`${statusCfg.color}18`,
            border:`1px solid ${statusCfg.color}40`,
            color: statusCfg.color,
            fontSize:'0.8rem', fontWeight:700,
          }}>
            {statusCfg.icon} {statusCfg.label}
          </span>
        </div>

        {/* ── Rejection notice ─────────────────────────────────── */}
        {isRejected && (
          <div style={{ padding:'1rem 1.25rem', background:'rgba(230,60,47,0.08)', border:'1px solid rgba(230,60,47,0.2)', borderRadius:10, marginBottom:'1.5rem' }}>
            <div style={{ fontWeight:600, color:'#f87c74', fontSize:'0.875rem', marginBottom:'0.3rem' }}>
              ✕ This report was rejected
            </div>
            <div style={{ fontSize:'0.8rem', color:'#888', lineHeight:1.6 }}>
              {incident.rejectionReason || 'The report could not be verified by responders.'}
            </div>
          </div>
        )}

        {/* ── Status Timeline ──────────────────────────────────── */}
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <div className="section-label" style={{ marginBottom:'1.25rem' }}>Status Timeline</div>

          <div style={{ position:'relative', paddingLeft:'1.5rem' }}>
            {/* Vertical line */}
            <div style={{
              position:   'absolute',
              left:       7,
              top:        8,
              bottom:     8,
              width:      2,
              background: 'var(--border)',
              borderRadius: 99,
            }} />

            {(isRejected ? [...ALL_STATUSES.slice(0, 1), 'rejected'] : ALL_STATUSES).map((status, index) => {
              const entry     = timelineEntries.find(e => e.status === status);
              const reached   = !!entry;
              const isCurrent = incident.status === status;
              const cfg       = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

              return (
                <div
                  key={status}
                  style={{ display:'flex', alignItems:'flex-start', gap:'1rem', marginBottom: index < ALL_STATUSES.length - 1 ? '1.25rem' : 0 }}
                >
                  {/* Dot */}
                  <div style={{
                    position:       'absolute',
                    left:           0,
                    width:          16,
                    height:         16,
                    borderRadius:   '50%',
                    background:     reached ? cfg.color : 'var(--border)',
                    border:         `2px solid ${reached ? cfg.color : 'var(--border-2)'}`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       '0.55rem',
                    color:          '#fff',
                    flexShrink:     0,
                    boxShadow:      isCurrent ? `0 0 0 4px ${cfg.color}25` : 'none',
                    transition:     'all 0.2s',
                    marginTop:      2,
                  }}>
                    {reached ? '✓' : ''}
                  </div>

                  {/* Content */}
                  <div style={{ paddingLeft:'1.25rem', flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'0.875rem', fontWeight: reached ? 600 : 400, color: reached ? cfg.color : 'var(--text-dim)' }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.5rem', background:`${cfg.color}18`, color: cfg.color, borderRadius:999, fontWeight:600 }}>
                          Current
                        </span>
                      )}
                    </div>
                    {entry ? (
                      <>
                        <div style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginTop:'0.15rem' }}>
                          {fmtDate(entry.timestamp)}
                        </div>
                        {entry.note && (
                          <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.15rem' }}>
                            {entry.note}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginTop:'0.15rem' }}>
                        Not yet reached
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Incident Info ────────────────────────────────────── */}
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <div className="section-label" style={{ marginBottom:'1rem' }}>Incident Details</div>

          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            {[
              { label:'Fire Type',   value: incident.fire_type ? incident.fire_type.charAt(0).toUpperCase() + incident.fire_type.slice(1) : '—' },
              { label:'Severity',    value: incident.severity || '—',
                valueStyle: {
                  color: incident.severity === 'High' ? '#e63c2f' : incident.severity === 'Medium' ? '#f4820a' : '#22c55e',
                  fontWeight: 600,
                }
              },
              { label:'Location',    value: incident.location?.address || `${incident.location?.lat?.toFixed(5)}, ${incident.location?.lng?.toFixed(5)}` },
              { label:'Reported At', value: fmtDate(incident.reportedAt) },
              { label:'Reported By', value: incident.reportedBy?.name || 'Unknown' },
              ...(incident.assignedResponder ? [{ label:'Assigned Responder', value: incident.assignedResponder?.name }] : []),
              ...(incident.resolvedAt ? [{ label:'Resolved At', value: fmtDate(incident.resolvedAt) }] : []),
            ].map(item => (
              <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', borderBottom:'1px solid var(--border)', paddingBottom:'0.75rem' }}>
                <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', flexShrink:0 }}>{item.label}</span>
                <span style={{ fontSize:'0.8375rem', color:'var(--text-primary)', textAlign:'right', ...item.valueStyle }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Description ──────────────────────────────────────── */}
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <div className="section-label" style={{ marginBottom:'0.75rem' }}>Description</div>
          <p style={{ fontSize:'0.9rem', color:'var(--text-primary)', lineHeight:1.7, margin:0 }}>
            {incident.description}
          </p>
        </div>

        {/* ── AI Analysis ──────────────────────────────────────── */}
        {incident.ai_trust_score !== undefined && (
          <div className="card" style={{ marginBottom:'1.25rem' }}>
            <div className="section-label" style={{ marginBottom:'1rem' }}>AI Analysis</div>

            <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1rem', flexWrap:'wrap' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'0.3rem' }}>Trust Score</div>
                <div style={{ height:6, background:'#1e1e1e', borderRadius:99, overflow:'hidden' }}>
                  <div style={{
                    height:     '100%',
                    width:      `${incident.ai_trust_score}%`,
                    background: incident.ai_trust_score >= 75 ? '#22c55e' : incident.ai_trust_score >= 50 ? '#f4820a' : '#e63c2f',
                    borderRadius: 99,
                    transition: 'width 0.6s',
                  }} />
                </div>
              </div>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.25rem', color: incident.ai_trust_score >= 75 ? '#22c55e' : incident.ai_trust_score >= 50 ? '#f4820a' : '#e63c2f' }}>
                {incident.ai_trust_score}%
              </span>
            </div>

            {incident.ai_flags?.length > 0 && (
              <div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'0.4rem' }}>Flags</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.3rem' }}>
                  {incident.ai_flags.map(flag => (
                    <span key={flag} style={{ fontSize:'0.68rem', padding:'0.2rem 0.55rem', background:'rgba(230,60,47,0.1)', color:'#f87c74', borderRadius:5, letterSpacing:'0.03em' }}>
                      {flag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Media Gallery ────────────────────────────────────── */}
        {incident.mediaFiles?.length > 0 && (
          <div className="card" style={{ marginBottom:'1.25rem' }}>
            <div className="section-label" style={{ marginBottom:'0.75rem' }}>
              Media Attachments ({incident.mediaFiles.length})
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'0.6rem' }}>
              {incident.mediaFiles.map((file, i) => {
                const url      = `http://localhost:5000/${file}`;
                const isImage  = /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
                const isVideo  = /\.(mp4|mov|avi|webm)$/i.test(file);

                return (
                  <div
                    key={i}
                    style={{ borderRadius:8, overflow:'hidden', border:'1px solid var(--border)', cursor: isImage ? 'pointer' : 'default', position:'relative', aspectRatio:'1' }}
                    onClick={() => isImage && setLightboxImg(url)}
                  >
                    {isImage ? (
                      <img
                        src={url}
                        alt={`attachment ${i + 1}`}
                        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : isVideo ? (
                      <video
                        src={url}
                        style={{ width:'100%', height:'100%', objectFit:'cover' }}
                        controls
                      />
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)', fontSize:'0.75rem' }}>
                        📎 File {i + 1}
                      </div>
                    )}

                    {/* Image verified badge */}
                    {i === 0 && incident.image_verified !== undefined && (
                      <div style={{
                        position:'absolute', bottom:4, left:4,
                        padding:'0.15rem 0.5rem', borderRadius:999,
                        background: incident.image_verified ? 'rgba(34,197,94,0.9)' : 'rgba(230,60,47,0.9)',
                        color:'#fff', fontSize:'0.62rem', fontWeight:700,
                      }}>
                        {incident.image_verified ? '✓ Fire Confirmed' : '⚠ No Fire Detected'}
                      </div>
                    )}

                    {isImage && (
                      <div style={{ position:'absolute', top:4, right:4, background:'rgba(0,0,0,0.5)', borderRadius:4, padding:'0.1rem 0.35rem', fontSize:'0.65rem', color:'#fff' }}>
                        🔍
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}