import { useState, useEffect } from 'react';
import IncidentMap from '../components/IncidentMap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import '../dashboard.css';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useToast } from '../context/ToastContext';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });
}

const ROLE_OPTIONS = ['user', 'responder', 'admin'];

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState('users'); // 'users' | 'applications' | 'logs' | 'map'

  const [users,    setUsers]    = useState([]);
  const [apps,     setApps]     = useState([]); // responder applications
  const [logs,     setLogs]     = useState([]);
  const [allIncidents, setAllIncidents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [actionId, setActionId] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [uRes, aRes, lRes, iRes] = await Promise.all([
        API.get('/admin/users'),
        API.get('/admin/applications'),
        API.get('/admin/logs'),
        API.get('/incidents/all'),
      ]);
      setUsers(uRes.data);
      setApps(aRes.data);
      setLogs(lRes.data);
      setAllIncidents(iRes.data);
    } catch (err) {
      console.error('Admin load error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnban(userId) {
    setActionId(userId + 'unban');
    try {
      await API.put(`/admin/users/${userId}/unban`);
      toast.success('User unbanned successfully.');
      await loadAll();
    } catch (err) {
      toast.error('Failed to unban user.');
    } finally {
      setActionId('');
    }
  }

  async function changeRole(userId, newRole) {
    setActionId(userId + 'role');
    try {
      await API.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole}.`);
    } catch (err) { 
      toast.error('Failed to change role.'); 
    } finally { 
      setActionId(''); 
    }
  }

  async function toggleActive(userId, isActive) {
    setActionId(userId + 'active');
    try {
      await API.put(`/admin/users/${userId}/status`, { isActive: !isActive });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: !isActive } : u));
      toast.success(`User ${isActive ? 'deactivated' : 'activated'} successfully.`);
    } catch (err) { 
      toast.error('Failed to update user status.'); 
    } finally { 
      setActionId(''); 
    }
  }

  async function handleApplication(appId, action) {
    setActionId(appId);
    try {
      await API.put(`/admin/applications/${appId}/${action}`);
      setApps(prev => prev.filter(a => a._id !== appId));
      
      if (action === 'approve') {
        toast.success('Application approved. User promoted to responder.');
      } else {
        toast.success('Application rejected.');
      }
    } catch (err) { 
      if (action === 'approve') {
        toast.error('Failed to approve application.');
      } else {
        toast.error('Failed to reject application.');
      }
    } finally { 
      setActionId(''); 
    }
  }

  const TAB_STYLE = (targetTab) => ({
    padding: '0.5rem 1.1rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    borderBottom: `2px solid ${tab === targetTab ? 'var(--fire-orange)' : 'transparent'}`,
    background: 'transparent',
    color: tab === targetTab ? 'var(--text-primary)' : 'var(--text-muted)',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'color 0.2s',
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
          <span className="dash-role-badge">{t.admin}</span>
          <span className="dash-user-name">{user?.name}</span>

          <Link to="/analytics" className="btn-secondary" style={{ fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}>📊 {t.analyticsTitle}</Link>
          <button className="dash-logout-btn" onClick={() => { logout(); navigate('/'); }}>{t.signOut}</button>
        </div>
      </nav>

      <div className="dash-content">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">{t.adminDashboard}</h1>
            <p className="dash-subtitle">{t.adminSub}</p>
          </div>
        </div>

        {/* ── Stats ────────────────────────────────────────────── */}
        <div className="stat-grid" style={{ marginBottom:'2rem' }}>
          <div className="stat-card">
            <div className="stat-label">{t.totalUsers}</div>
            <div className="stat-value">{users.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t.responders}</div>
            <div className="stat-value">{users.filter(u => u.role === 'responder').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t.pendingApps}</div>
            <div className="stat-value stat-accent">{apps.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t.auditLogs}</div>
            <div className="stat-value">{logs.length}</div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:'1.5rem' }}>
          <button style={TAB_STYLE('users')} onClick={() => setTab('users')}>
            {t.users}
          </button>
          <button style={TAB_STYLE('applications')} onClick={() => setTab('applications')}>
            {t.applications}{apps.length > 0 && (
              <span style={{ marginLeft:4, background:'var(--fire-red)', color:'#fff', borderRadius:999, fontSize:'0.65rem', padding:'1px 6px' }}>
                {apps.length}
              </span>
            )}
          </button>
          <button style={TAB_STYLE('logs')}  onClick={() => setTab('logs')}>
            {t.auditLogs}
          </button>
          <button style={TAB_STYLE('map')}   onClick={() => setTab('map')}>
            🗺️ Incident Map
          </button>
        </div>

        {loading && <div className="loading-state">{t.loading}</div>}

        {/* ── Users Tab ────────────────────────────────────────── */}
        {!loading && tab === 'users' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            {users.length === 0 && <div className="empty-state"><div className="empty-state-icon">👤</div><div>{t.noUsers}</div></div>}
            {users.map(u => (
              <div key={u._id} className="card-sm" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.15rem' }}>
                    <div style={{ fontWeight:600, fontSize:'0.875rem', color:'var(--text-primary)' }}>
                      {u.name}
                    </div>
                    {/* Status badges */}
                    {u.isBanned && (
                      <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.5rem', background:'rgba(127,29,29,0.2)', color:'#f87c74', borderRadius:999, fontWeight:600 }}>
                        ⛔ BANNED
                      </span>
                    )}
                    {!u.isBanned && u.isRestricted && (
                      <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.5rem', background:'rgba(230,60,47,0.12)', color:'#e63c2f', borderRadius:999, fontWeight:600 }}>
                        🚫 RESTRICTED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                    {u.email}
                  </div>
                  {/* Reputation score bar */}
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.35rem' }}>
                    <div style={{ flex:1, height:3, background:'#1e1e1e', borderRadius:99, overflow:'hidden', maxWidth:80 }}>
                      <div style={{
                        height:     '100%',
                        width:      `${u.reputationScore ?? 100}%`,
                        background: (u.reputationScore ?? 100) >= 80 ? '#22c55e' : (u.reputationScore ?? 100) >= 60 ? '#f4820a' : '#e63c2f',
                        borderRadius: 99,
                      }} />
                    </div>
                    <span style={{ fontSize:'0.68rem', color:'var(--text-dim)' }}>
                      Rep: {u.reputationScore ?? 100}
                    </span>
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'0.7rem', color:'var(--text-dim)' }}>
                    {t.joined} {fmtDate(u.createdAt)}
                  </span>

                  {/* Role selector */}
                  <select
                    className="form-select"
                    value={u.role}
                    onChange={e => changeRole(u._id, e.target.value)}
                    disabled={actionId === u._id + 'role' || u._id === user?._id}
                    style={{ padding:'0.35rem 0.65rem', fontSize:'0.78rem', width:'auto' }}
                  >
                    {['user','responder','admin'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>

                  {/* Unban button — only shown if banned */}
                  {u.isBanned && u._id !== user?._id && (
                    <button
                      className="btn-action"
                      style={{ fontSize:'0.75rem', color:'#22c55e', borderColor:'rgba(34,197,94,0.25)' }}
                      onClick={() => handleUnban(u._id)}
                      disabled={actionId === u._id + 'unban'}
                    >
                      ✓ Unban
                    </button>
                  )}

                  {/* Activate/Deactivate */}
                  <button
                    className={u.isActive ? 'btn-danger' : 'btn-action'}
                    onClick={() => toggleActive(u._id, u.isActive)}
                    disabled={actionId === u._id + 'active' || u._id === user?._id}
                    style={{ fontSize:'0.75rem', padding:'0.35rem 0.75rem' }}
                  >
                    {u.isActive ? t.deactivate : t.activate}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Applications Tab ─────────────────────────────────── */}
        {!loading && tab === 'applications' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            {apps.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📬</div>
                <div>{t.noPendingApps}</div>
              </div>
            )}
            {apps.map(app => (
              <div key={app._id} className="card-sm" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'0.875rem', color:'var(--text-primary)' }}>{app.name || app.applicantName}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{app.email} — Applied {fmtDate(app.createdAt)}</div>
                </div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button className="btn-primary" style={{ fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}
                    onClick={() => handleApplication(app._id, 'approve')} disabled={actionId === app._id}>
                    {t.approve}
                  </button>
                  <button className="btn-danger" style={{ fontSize:'0.78rem' }}
                    onClick={() => handleApplication(app._id, 'reject')} disabled={actionId === app._id}>
                    {t.reject}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Audit Logs Tab ───────────────────────────────────── */}
        {!loading && tab === 'logs' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {logs.length === 0 && <div className="empty-state"><div className="empty-state-icon">📋</div><div>{t.noLogs}</div></div>}
            {logs.map((log, i) => (
              <div key={log._id || i} className="notif-item">
                <div className="notif-dot" />
                <div>
                  <div className="notif-text">{log.action}</div>
                  {log.details && <div style={{ fontSize:'0.78rem', color:'var(--text-dim)', marginTop:'0.15rem' }}>{log.details}</div>}
                  <div className="notif-time">{fmtDate(log.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Map Tab ──────────────────────────────────────────────── */}
        {!loading && tab === 'map' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'1rem', color:'var(--text-primary)' }}>
                  System-Wide Incident Map
                </div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:'0.15rem' }}>
                  {allIncidents.length} total incidents plotted
                </div>
              </div>
              {/* Filter legend */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.6rem' }}>
                {['pending','verified','dispatched','resolved','rejected'].map(status => (
                  <div key={status} style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', color:'#666' }}>
                    <div style={{
                      width:8, height:8, borderRadius:'50%',
                      background: {
                        pending:    '#f4820a',
                        verified:   '#3b82f6',
                        dispatched: '#a855f7',
                        resolved:   '#22c55e',
                        rejected:   '#e63c2f',
                      }[status]
                    }} />
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                ))}
              </div>
            </div>
            
            <IncidentMap
              key={allIncidents.map(i => i._id + i.status).join('-')}
              incidents={allIncidents}
              height={520}
            />
            
            {/* Stats below map */}
            <div className="stat-grid" style={{ marginTop:'1.25rem' }}>
              {['pending','verified','dispatched','resolved','rejected'].map(status => (
                <div key={status} className="stat-card">
                  <div className="stat-label">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
                  <div className="stat-value" style={{
                    color: {
                      pending:    '#f4820a',
                      verified:   '#3b82f6',
                      dispatched: '#a855f7',
                      resolved:   '#22c55e',
                      rejected:   '#e63c2f',
                    }[status],
                    fontSize: '1.5rem'
                  }}>
                    {allIncidents.filter(i => i.status === status).length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}