import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import '../dashboard.css';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

function fmtDate(iso) {
  if (!iso) return 'Just now';
  return new Date(iso).toLocaleString('en-US', {
    day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
  });
}

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // Event-type → human label + color mapping using translation keys
  const EVENT_META = {
    incidentUpdate: { label: t.incidentUpdate || 'Incident Update', color: '#3b82f6' },
    verified:       { label: t.reportVerified || 'Report Verified',  color: '#22c55e' },
    dispatched:     { label: t.unitsDispatched || 'Units Dispatched', color: '#a855f7' },
    resolved:       { label: t.incidentResolved || 'Incident Resolved', color: '#22c55e' },
    rejected:       { label: t.reportRejected || 'Report Rejected',  color: '#e63c2f' },
    forumReply: { label: 'Forum Reply', color: '#3b82f6' },
  };

  function getEventMeta(type) {
    return EVENT_META[type] || { label: type || t.notification || 'Notification', color: '#f4820a' };
    
  }

  const [notifications, setNotifications] = useState([
    // Seed with a static welcome message localized through your dictionary
    {
      id: 'welcome',
      type: 'system',
      message: t.welcomeNotification || 'You are now connected to real-time incident updates.',
      timestamp: new Date().toISOString(),
      read: false,
    }
  ]);
  const [connected, setConnected] = useState(false);

  // ── Socket.io setup ───────────────────────────────────────────────
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      if (user?._id) {
        socket.emit('join', user._id);
      }
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('incidentUpdate', (data) => {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'incidentUpdate',
        message: data.message || `Incident #${data.incidentId} was updated.`,
        timestamp: new Date().toISOString(),
        read: false,
        incidentId: data.incidentId,
      }, ...prev]);
    });

    ['verified', 'dispatched', 'resolved', 'rejected'].forEach(event => {
      socket.on(event, (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          type: event,
          message: data.message || `Your report has been ${event}.`,
          timestamp: new Date().toISOString(),
          read: false,
          incidentId: data.incidentId,
        }, ...prev]);
      });
    });

    return () => socket.disconnect();
  }, [user]);

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  function clearAll() {
    setNotifications([]);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

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
          {/* Live connection indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#22c55e' : '#e63c2f' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {connected ? (t.liveConnection || 'Live') : (t.reconnecting || 'Reconnecting…')}
            </span>
          </div>
          <span className="dash-user-name">{user?.name}</span>
          <button className="dash-logout-btn" onClick={() => { logout(); navigate('/'); }}>{t.signOut}</button>
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth: 720 }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">
              {t.notifications || 'Notifications'}
              {unreadCount > 0 && (
                <span style={{ marginLeft:'0.6rem', background:'var(--fire-red)', color:'#fff', borderRadius:999, fontSize:'0.75rem', padding:'2px 8px', fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="dash-subtitle">{t.notificationsSub || 'Real-time updates about your reports and system activity.'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {unreadCount > 0 && <button className="btn-secondary" onClick={markAllRead}>{t.markAllRead || 'Mark all read'}</button>}
            {notifications.length > 0 && <button className="btn-secondary" onClick={clearAll}>{t.clearAll || 'Clear all'}</button>}
          </div>
        </div>

        {/* ── Notification List ────────────────────────────────── */}
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div>{t.noNotifications || 'No notifications yet.'}</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {notifications.map(notif => {
              const meta = getEventMeta(notif.type);
              return (
                <div
                  key={notif.id}
                  className="notif-item"
                  style={{ background: notif.read ? 'transparent' : 'rgba(244,130,10,0.03)' }}
                  onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                >
                  {/* Color dot */}
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: notif.read ? 'var(--border-2)' : meta.color, marginTop: 5, flexShrink: 0 }} />

                  <div style={{ flex: 1 }}>
                    {/* Event type label */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: meta.color }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{fmtDate(notif.timestamp)}</span>
                    </div>

                    {/* Message */}
                    <div className="notif-text">{notif.message}</div>

                    {/* Link to incident if available */}
                    {notif.incidentId && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--fire-orange)' }}>
                        {t.incident || 'Incident'} #{notif.incidentId}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}