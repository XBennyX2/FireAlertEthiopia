import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import '../dashboard.css';

const STATUS_COLORS = {
  verified:   '#3b82f6',
  dispatched: '#a855f7',
  resolved:   '#22c55e',
};

const SEVERITY_COLORS = {
  High:   '#e63c2f',
  Medium: '#f4820a',
  Low:    '#22c55e',
};

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function PublicFeedPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [filter,    setFilter]    = useState('');

  useEffect(() => { load(); }, [page, filter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit:20 });
      if (filter) params.set('status', filter);
      const { data } = await API.get(`/incidents/public?${params}`);
      setIncidents(data.incidents);
      setPages(data.pages);
    } catch { setIncidents([]); }
    finally { setLoading(false); }
  }

  return (
    <div className="dash-page">
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">FireAlert</span>
        </Link>
        <div className="dash-topbar-right">
          <Link to="/safety"    className="btn-secondary" style={{ fontSize:'0.78rem' }}>🛡️ Safety</Link>
          <Link to="/login"     className="btn-secondary" style={{ fontSize:'0.78rem' }}>Sign In</Link>
          <Link to="/register"  className="btn-primary"   style={{ fontSize:'0.78rem' }}>Report Fire</Link>
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth:700 }}>
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Live Incident Feed</h1>
            <p className="dash-subtitle">Verified fire incidents in Addis Ababa — updated in real time.</p>
          </div>
        </div>

        {/* Filter */}
        <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
          {['','verified','dispatched','resolved'].map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }} style={{
              fontSize:'0.78rem', padding:'0.3rem 0.85rem', borderRadius:999,
              border:'1px solid', cursor:'pointer',
              borderColor: filter === s ? '#f4820a' : '#2a2a2a',
              background:  filter === s ? 'rgba(244,130,10,0.12)' : 'transparent',
              color:       filter === s ? '#f4820a' : '#555',
            }}>
              {s === '' ? 'All Active' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading && <div className="loading-state">Loading incidents…</div>}

        {!loading && incidents.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div>No active incidents reported right now.</div>
          </div>
        )}

        {incidents.map(i => (
          <div key={i._id} className="card-sm" style={{ marginBottom:'0.6rem', borderLeft:`3px solid ${STATUS_COLORS[i.status] || '#444'}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.3rem', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#f0ede8', textTransform:'capitalize' }}>
                    {i.fire_type} Fire
                  </span>
                  <span style={{
                    fontSize:'0.65rem', padding:'0.1rem 0.5rem', borderRadius:999, fontWeight:700,
                    background:`${SEVERITY_COLORS[i.severity]}18`, color:SEVERITY_COLORS[i.severity],
                  }}>
                    {i.severity}
                  </span>
                  <span style={{
                    fontSize:'0.65rem', padding:'0.1rem 0.5rem', borderRadius:999, fontWeight:700,
                    background:`${STATUS_COLORS[i.status]}18`, color:STATUS_COLORS[i.status], textTransform:'capitalize',
                  }}>
                    {i.status}
                  </span>
                </div>
                <div style={{ fontSize:'0.78rem', color:'#555' }}>
                  📍 {i.address}
                </div>
              </div>
              <div style={{ fontSize:'0.72rem', color:'#444', whiteSpace:'nowrap' }}>
                {fmtDate(i.reportedAt)}
              </div>
            </div>
          </div>
        ))}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', marginTop:'1rem' }}>
            <button className="btn-secondary" disabled={page===1} onClick={() => setPage(p=>p-1)} style={{ fontSize:'0.78rem' }}>← Prev</button>
            <span style={{ fontSize:'0.78rem', color:'#555', padding:'0.4rem' }}>Page {page} of {pages}</span>
            <button className="btn-secondary" disabled={page===pages} onClick={() => setPage(p=>p+1)} style={{ fontSize:'0.78rem' }}>Next →</button>
          </div>
        )}

        <div style={{ textAlign:'center', marginTop:'2rem', padding:'1rem', background:'rgba(230,60,47,0.06)', borderRadius:10, border:'1px solid rgba(230,60,47,0.15)' }}>
          <div style={{ fontWeight:700, fontSize:'0.875rem', color:'#f0ede8', marginBottom:'0.35rem' }}>
            See a fire? Report it now.
          </div>
          <div style={{ fontSize:'0.78rem', color:'#666', marginBottom:'0.75rem' }}>
            Create a free account to submit a report with GPS and photos.
          </div>
          <Link to="/register" className="btn-primary" style={{ fontSize:'0.82rem' }}>
            🚨 Report a Fire
          </Link>
        </div>
      </div>
    </div>
  );
}