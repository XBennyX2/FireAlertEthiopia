import { useState, useEffect } from 'react';
import IncidentMap from '../components/IncidentMap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import '../dashboard.css';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useToast } from '../context/ToastContext';
import { useRef } from 'react';
import SkeletonCard from '../components/SkeletonCard';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState('users'); // 'users' | 'applications' | 'audit' | 'map' | 'analytics' | 'health'

  const [users,    setUsers]    = useState([]);
  const [apps,     setApps]     = useState([]);
  const [allIncidents, setAllIncidents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [actionId, setActionId] = useState('');
  const csvImportRef = useRef(null);
  const [importing, setImporting] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate,   setAnalyticsEndDate]   = useState('');

  // Audit log states
  const [logFilterUser,   setLogFilterUser]   = useState('');
  const [logFilterAction, setLogFilterAction] = useState('');
  const [logStartDate,    setLogStartDate]    = useState('');
  const [logEndDate,      setLogEndDate]      = useState('');
  const [logSearch,       setLogSearch]       = useState('');
  const [auditLogs,       setAuditLogs]       = useState([]);
  const [logPage,         setLogPage]         = useState(1);
  const [logTotalPages,   setLogTotalPages]   = useState(1);
  const [pendingSafety, setPendingSafety] = useState([]);

  // Health state
  const [health, setHealth] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [uRes, aRes, iRes] = await Promise.all([
        API.get('/admin/users'),
        API.get('/admin/applications'),
        API.get('/incidents/all'),
      ]);
      setUsers(uRes.data);
      setApps(aRes.data);
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

  useEffect(() => {
    if (tab !== 'health') return;

    async function loadHealth() {
      try {
        const { data } = await API.get('/admin/health');
        setHealth(data);
      } catch (err) {
        toast.error('Failed to load system health.');
      }
    }

    loadHealth();
    const interval = setInterval(loadHealth, 10000);
    return () => clearInterval(interval);
  }, [tab]);

  async function loadAnalytics() {
    try {
      const params = new URLSearchParams();
      if (analyticsStartDate) params.set('startDate', analyticsStartDate);
      if (analyticsEndDate)   params.set('endDate', analyticsEndDate);
      const { data } = await API.get(`/admin/analytics?${params}`);
      setAnalytics(data);
    } catch (err) {
      toast.error('Failed to load analytics.');
    }
  }

  useEffect(() => {
    if (tab === 'analytics') loadAnalytics();
  }, [tab, analyticsStartDate, analyticsEndDate]);

  async function handleExportCSV() {
    try {
      const res = await API.get('/admin/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `firealert-users-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('User list exported successfully.');
    } catch (err) {
      toast.error('Failed to export users.');
    }
  }

  async function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await API.post('/admin/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(data.message);
      if (data.errors?.length > 0) {
        console.warn('Import errors:', data.errors);
        toast.warning(`${data.errors.length} rows had issues. Check console for details.`);
      }
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
      if (csvImportRef.current) csvImportRef.current.value = '';
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

  async function handleApplicationReject(appId, rejectionReason) {
    setActionId(appId);
    try {
      await API.put(`/admin/applications/${appId}/reject`, { rejectionReason });
      setApps(prev => prev.filter(a => a._id !== appId));
    } catch (err) {
      alert('Failed to reject application.');
    } finally {
      setActionId('');
    }
  }

  async function handleExportAnalyticsCSV() {
    try {
      const params = new URLSearchParams();
      if (analyticsStartDate) params.set('startDate', analyticsStartDate);
      if (analyticsEndDate)   params.set('endDate', analyticsEndDate);
      const res = await API.get(`/admin/analytics/export/csv?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Analytics exported as CSV.');
    } catch {
      toast.error('Failed to export analytics.');
    }
  }

  async function handleExportAnalyticsPDF() {
    try {
      const params = new URLSearchParams();
      if (analyticsStartDate) params.set('startDate', analyticsStartDate);
      if (analyticsEndDate)   params.set('endDate', analyticsEndDate);
      const res = await API.get(`/admin/analytics/export/pdf?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `firealert-analytics-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Analytics exported as PDF.');
    } catch {
      toast.error('Failed to export analytics.');
    }
  }

  async function loadAuditLogs() {
    try {
      const params = new URLSearchParams({ page: logPage, limit: 30 });
      if (logFilterUser)   params.set('user', logFilterUser);
      if (logFilterAction) params.set('action', logFilterAction);
      if (logStartDate)    params.set('startDate', logStartDate);
      if (logEndDate)      params.set('endDate', logEndDate);
      if (logSearch)       params.set('search', logSearch);
      const { data } = await API.get(`/admin/audit-logs?${params}`);
      setAuditLogs(data.logs);
      setLogTotalPages(data.pages);
    } catch (err) {
      toast.error('Failed to load audit logs.');
    }
  }

  useEffect(() => {
    if (tab === 'audit') loadAuditLogs();
  }, [tab, logFilterUser, logFilterAction, logStartDate, logEndDate, logSearch, logPage]);

  useEffect(() => {
    if (tab !== 'safety') return;
    async function loadSafety() {
      try {
        const { data } = await API.get('/safety/pending');
        setPendingSafety(data);
      } catch { toast.error('Failed to load pending safety content.'); }
    }
    loadSafety();
  }, [tab]);

  async function handleApproveContent(id) {
    try {
      await API.put(`/safety/${id}/approve`);
      setPendingSafety(prev => prev.filter(c => c._id !== id));
      toast.success('Content approved and published.');
    } catch { toast.error('Failed to approve.'); }
  }

  async function handleRejectContent(id) {
    const reason = window.prompt('Reason for rejection (shown to author):');
    if (reason === null) return;
    try {
      await API.put(`/safety/${id}/reject`, { rejectionReason: reason });
      setPendingSafety(prev => prev.filter(c => c._id !== id));
      toast.success('Content rejected.');
    } catch { toast.error('Failed to reject.'); }
  }

  async function handleExportLogsCSV() {
    try {
      const params = new URLSearchParams();
      if (logFilterUser)   params.set('user', logFilterUser);
      if (logFilterAction) params.set('action', logFilterAction);
      if (logStartDate)    params.set('startDate', logStartDate);
      if (logEndDate)      params.set('endDate', logEndDate);
      if (logSearch)       params.set('search', logSearch);
      const res = await API.get(`/admin/audit-logs/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit logs exported.');
    } catch (err) {
      toast.error('Failed to export audit logs.');
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
            <div className="stat-value">{auditLogs.length}</div>
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
          <button style={TAB_STYLE('audit')} onClick={() => setTab('audit')}>
            {t.auditLogs}
          </button>
          <button style={TAB_STYLE('map')} onClick={() => setTab('map')}>
            🗺️ Incident Map
          </button>
          <button style={TAB_STYLE('analytics')} onClick={() => setTab('analytics')}>
            📊 Analytics
          </button>
          <button style={TAB_STYLE('safety')} onClick={() => setTab('safety')}>
            Safety Content {pendingSafety.length > 0 && (
              <span style={{ marginLeft:4, background:'#f4820a', color:'#fff', borderRadius:999, fontSize:'0.65rem', padding:'1px 6px' }}>
                {pendingSafety.length}
              </span>
            )}
          </button>
          <button style={TAB_STYLE('health')} onClick={() => setTab('health')}>
            System Health
          </button>
        </div>

        {loading && <div className="loading-state">{t.loading}</div>}

        {/* ── Health Tab ───────────────────────────────────────── */}
        {!loading && tab === 'health' && (
          <div>
            {!health && <div className="loading-state">Loading system health…</div>}

            {health && (
              <>
                {/* Status banner */}
                <div style={{
                  display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.85rem 1.1rem',
                  background: health.database.connected ? 'rgba(34,197,94,0.08)' : 'rgba(230,60,47,0.08)',
                  border: `1px solid ${health.database.connected ? 'rgba(34,197,94,0.2)' : 'rgba(230,60,47,0.2)'}`,
                  borderRadius:10, marginBottom:'1.5rem',
                }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: health.database.connected ? '#22c55e' : '#e63c2f' }} />
                  <span style={{ fontSize:'0.85rem', fontWeight:600, color: health.database.connected ? '#22c55e' : '#f87c74' }}>
                    System {health.database.connected ? 'Operational' : 'Database Disconnected'}
                  </span>
                  <span style={{ fontSize:'0.75rem', color:'var(--text-dim)', marginLeft:'auto' }}>
                    Last updated: {new Date(health.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="stat-grid" style={{ marginBottom:'1.5rem' }}>
                  <div className="stat-card">
                    <div className="stat-label">Uptime</div>
                    <div className="stat-value">{health.uptime.formatted}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Database</div>
                    <div className="stat-value" style={{ color: health.database.connected ? '#22c55e' : '#e63c2f', fontSize:'1rem', textTransform:'capitalize' }}>
                      {health.database.status}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Requests</div>
                    <div className="stat-value">{health.requests.total}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Error Rate</div>
                    <div className="stat-value" style={{ color: health.requests.errorRate > 5 ? '#e63c2f' : '#22c55e' }}>
                      {health.requests.errorRate}%
                    </div>
                  </div>
                </div>

                {/* Memory usage */}
                <div className="card" style={{ marginBottom:'1.25rem' }}>
                  <div className="section-label" style={{ marginBottom:'1rem' }}>Memory Usage</div>

                  <div style={{ marginBottom:'1rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                      <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>System Memory</span>
                      <span style={{ fontSize:'0.78rem', color:'var(--text-primary)' }}>
                        {health.memory.systemUsedPercent}% used ({health.memory.systemTotalGB}GB total, {health.memory.systemFreeGB}GB free)
                      </span>
                    </div>
                    <div style={{ height:8, background:'#1e1e1e', borderRadius:99, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', width:`${health.memory.systemUsedPercent}%`,
                        background: health.memory.systemUsedPercent > 85 ? '#e63c2f' : health.memory.systemUsedPercent > 65 ? '#f4820a' : '#22c55e',
                        borderRadius:99, transition:'width 0.4s',
                      }} />
                    </div>
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Node.js Process Heap</span>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-primary)' }}>
                      {health.memory.processUsedMB}MB / {health.memory.processTotalMB}MB
                    </span>
                  </div>
                </div>

                {/* CPU */}
                <div className="card">
                  <div className="section-label" style={{ marginBottom:'1rem' }}>CPU</div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>CPU Cores</span>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-primary)' }}>{health.cpu.cores}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Load Average (1m, 5m, 15m)</span>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-primary)', fontFamily:'monospace' }}>
                      {health.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Users Tab toolbar ────────────────────────────────── */}
        {!loading && tab === 'users' && (
          <div style={{ display:'flex', gap:'0.6rem', marginBottom:'1rem', flexWrap:'wrap' }}>
            <button className="btn-secondary" onClick={handleExportCSV} style={{ fontSize:'0.78rem' }}>
              ⬇ Export Users CSV
            </button>
            <button
              className="btn-secondary"
              onClick={() => csvImportRef.current?.click()}
              disabled={importing}
              style={{ fontSize:'0.78rem' }}
            >
              {importing ? 'Importing…' : '⬆ Import Users CSV'}
            </button>
            <input
              ref={csvImportRef}
              type="file"
              accept=".csv"
              style={{ display:'none' }}
              onChange={handleImportCSV}
            />
          </div>
        )}
        {loading && (
  <>
    <SkeletonCard lines={3} />
    <SkeletonCard lines={3} />
    <SkeletonCard lines={3} />
  </>
)}

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
              <div key={app._id} className="card" style={{ marginBottom:'0.75rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.75rem', marginBottom:'1rem' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.95rem', color:'var(--text-primary)' }}>{app.name}</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{app.email} · {app.phone}</div>
                    <div style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginTop:'0.15rem' }}>
                      Applied {fmtDate(app.createdAt)}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    <button className="btn-primary" style={{ fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}
                      onClick={() => handleApplication(app._id, 'approve')} disabled={actionId === app._id}>
                      ✔ Approve
                    </button>
                    <button className="btn-danger" style={{ fontSize:'0.78rem' }}
                      onClick={() => {
                        const reason = window.prompt('Optional: reason for rejection (shown to applicant)');
                        if (reason !== null) handleApplicationReject(app._id, reason);
                      }}
                      disabled={actionId === app._id}>
                      ✕ Reject
                    </button>
                  </div>
                </div>

                <div className="two-col" style={{ fontSize:'0.82rem' }}>
                  <div>
                    <div style={{ color:'var(--text-dim)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.2rem' }}>Experience</div>
                    <div style={{ color:'var(--text-primary)' }}>{app.yearsExperience} year{app.yearsExperience === 1 ? '' : 's'}</div>
                  </div>
                  <div>
                    <div style={{ color:'var(--text-dim)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.2rem' }}>Preferred Station</div>
                    <div style={{ color:'var(--text-primary)' }}>{app.preferredStation}</div>
                  </div>
                  <div>
                    <div style={{ color:'var(--text-dim)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.2rem' }}>Availability</div>
                    <div style={{ color:'var(--text-primary)', textTransform:'capitalize' }}>{app.availability?.replace(/_/g, ' ')}</div>
                  </div>
                  <div>
                    <div style={{ color:'var(--text-dim)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.2rem' }}>Current Occupation</div>
                    <div style={{ color:'var(--text-primary)' }}>{app.currentOccupation || '—'}</div>
                  </div>
                </div>

                {app.previousTraining && (
                  <div style={{ marginTop:'0.85rem' }}>
                    <div style={{ color:'var(--text-dim)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.2rem' }}>Previous Training</div>
                    <div style={{ color:'var(--text-primary)', fontSize:'0.82rem', lineHeight:1.5 }}>{app.previousTraining}</div>
                  </div>
                )}

                <div style={{ marginTop:'0.85rem' }}>
                  <div style={{ color:'var(--text-dim)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.2rem' }}>Motivation</div>
                  <div style={{ color:'var(--text-primary)', fontSize:'0.82rem', lineHeight:1.55 }}>{app.motivation}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Audit Logs Tab ───────────────────────────────────── */}
        {!loading && tab === 'audit' && (
          <div>
            <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap', marginBottom:'1.25rem', alignItems:'center' }}>
              <input
                className="form-input"
                placeholder="Search logs…"
                value={logSearch}
                onChange={e => { setLogSearch(e.target.value); setLogPage(1); }}
                style={{ flex:1, minWidth:160, marginBottom:0 }}
              />
              <select
                className="form-select"
                value={logFilterAction}
                onChange={e => { setLogFilterAction(e.target.value); setLogPage(1); }}
                style={{ width:'auto', minWidth:180, marginBottom:0 }}
              >
                <option value="">All Actions</option>
                <option value="ACCOUNT_AUTO_BANNED">Account Auto-Banned</option>
                <option value="ACCOUNT_AUTO_RESTRICTED">Account Auto-Restricted</option>
                <option value="MANUAL_UNBAN">Manual Unban</option>
                <option value="MANUAL_REPUTATION_ADJUSTMENT">Reputation Adjustment</option>
                <option value="SUSPICIOUS_LOGIN_ACTIVITY">Suspicious Activity</option>
                <option value="BULK_USER_IMPORT">Bulk User Import</option>
              </select>
              <input
                type="date"
                className="form-input"
                value={logStartDate}
                onChange={e => { setLogStartDate(e.target.value); setLogPage(1); }}
                style={{ width:'auto', marginBottom:0 }}
              />
              <span style={{ color:'var(--text-dim)', fontSize:'0.8rem' }}>to</span>
              <input
                type="date"
                className="form-input"
                value={logEndDate}
                onChange={e => { setLogEndDate(e.target.value); setLogPage(1); }}
                style={{ width:'auto', marginBottom:0 }}
              />
              <button className="btn-secondary" onClick={handleExportLogsCSV} style={{ fontSize:'0.78rem' }}>
                ⬇ Export CSV
              </button>
              {(logSearch || logFilterAction || logStartDate || logEndDate) && (
                <button
                  className="btn-secondary"
                  onClick={() => { setLogSearch(''); setLogFilterAction(''); setLogStartDate(''); setLogEndDate(''); }}
                  style={{ fontSize:'0.78rem' }}
                >
                  Clear
                </button>
              )}
            </div>
            {auditLogs.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📜</div>
                <div>No audit log entries match your filters.</div>
              </div>
            )}
            {auditLogs.map(log => (
              <div key={log._id} className="card-sm" style={{ marginBottom:'0.5rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.25rem' }}>
                      <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'0.1rem 0.5rem', background:'rgba(244,130,10,0.1)', color:'#f4820a', borderRadius:4 }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize:'0.7rem', color:'var(--text-dim)' }}>
                        {log.performedBy?.email || 'System'}
                      </span>
                    </div>
                    <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{log.details}</div>
                  </div>
                  <span style={{ fontSize:'0.7rem', color:'var(--text-dim)', whiteSpace:'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {logTotalPages > 1 && (
              <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', marginTop:'1rem' }}>
                <button className="btn-secondary" disabled={logPage===1} onClick={() => setLogPage(p => p-1)} style={{ fontSize:'0.78rem' }}>← Prev</button>
                <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', padding:'0.4rem' }}>Page {logPage} of {logTotalPages}</span>
                <button className="btn-secondary" disabled={logPage===logTotalPages} onClick={() => setLogPage(p => p+1)} style={{ fontSize:'0.78rem' }}>Next →</button>
              </div>
            )}
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

        {/* ── Analytics Tab ────────────────────────────────────────── */}
        {!loading && tab === 'analytics' && (
          <div>
            {/* Date range bar + export buttons */}
            <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap', alignItems:'center', marginBottom:'1.5rem' }}>
              <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Date Range:</span>
              <input
                type="date"
                className="form-input"
                value={analyticsStartDate}
                onChange={e => setAnalyticsStartDate(e.target.value)}
                style={{ width:'auto', marginBottom:0 }}
              />
              <span style={{ color:'var(--text-dim)', fontSize:'0.8rem' }}>to</span>
              <input
                type="date"
                className="form-input"
                value={analyticsEndDate}
                onChange={e => setAnalyticsEndDate(e.target.value)}
                style={{ width:'auto', marginBottom:0 }}
              />
              {(analyticsStartDate || analyticsEndDate) && (
                <button
                  className="btn-secondary"
                  onClick={() => { setAnalyticsStartDate(''); setAnalyticsEndDate(''); }}
                  style={{ fontSize:'0.78rem' }}
                >
                  Clear
                </button>
              )}
              <div style={{ marginLeft:'auto', display:'flex', gap:'0.5rem' }}>
                <button className="btn-secondary" onClick={handleExportAnalyticsCSV} style={{ fontSize:'0.78rem' }}>
                  ⬇ Export CSV
                </button>
                <button className="btn-secondary" onClick={handleExportAnalyticsPDF} style={{ fontSize:'0.78rem' }}>
                  ⬇ Export PDF
                </button>
              </div>
            </div>

            {/* Metrics summary cards */}
            <div className="stat-grid" style={{ marginBottom:'1.5rem' }}>
              <div className="stat-card">
                <div className="stat-label">Avg Response Time</div>
                <div className="stat-value">{analytics?.avgResponseTimeMinutes ?? 0} min</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">False Report Rate</div>
                <div className="stat-value" style={{ color:'#e63c2f' }}>{analytics?.falseReportRate ?? 0}%</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Verification Rate</div>
                <div className="stat-value" style={{ color:'#22c55e' }}>{analytics?.verificationRate ?? 0}%</div>
              </div>
            </div>

            {!analytics && (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <div>No analytics data available for the selected range.</div>
              </div>
            )}
          </div>
        )}

        {/* ── Safety Tab ───────────────────────────────────────────── */}
        {!loading && tab === 'safety' && (
          <div>
            {pendingSafety.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div>No pending safety content to review.</div>
              </div>
            )}
            {pendingSafety.map(item => (
              <div key={item._id} className="card" style={{ marginBottom:'0.75rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem', marginBottom:'0.75rem' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.95rem', marginBottom:'0.2rem' }}>{item.title}</div>
                    <div style={{ fontSize:'0.75rem', color:'#666' }}>
                      By {item.author?.name} ({item.author?.role}) ·{' '}
                      {item.category?.replace('_', ' ')} · {item.language === 'am' ? 'Amharic' : 'English'}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
                    <button className="btn-primary" style={{ fontSize:'0.78rem' }}
                      onClick={() => handleApproveContent(item._id)}>✔ Approve</button>
                    <button className="btn-danger" style={{ fontSize:'0.78rem' }}
                      onClick={() => handleRejectContent(item._id)}>✕ Reject</button>
                  </div>
                </div>
                <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', lineHeight:1.65, whiteSpace:'pre-line' }}>
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
