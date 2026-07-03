import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
// Make sure to import your API instance here:
import API from '../api/axios';

// ── Styles ────────────────────────────────────────────────────────
const S = {
  wrap: { position: 'relative', display: 'inline-flex', alignItems: 'center' },
  btn: {
    position: 'relative', background: 'transparent', border: '1px solid #2a2a2a',
    borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', fontSize: '1rem',
    transition: 'border-color 0.2s', color: '#f0ede8',
  },
  badge: {
    position: 'absolute', top: -5, right: -5, background: '#e63c2f',
    color: '#fff', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700,
    minWidth: 16, height: 16, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '0 4px', fontFamily: "'Syne', sans-serif",
    pointerEvents: 'none',
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320,
    background: '#111', border: '1px solid #1e1e1e', borderRadius: 12,
    boxShadow: '0 16px 40px rgba(0,0,0,0.5)', zIndex: 200, overflow: 'hidden',
    animation: 'dropIn 0.18s cubic-bezier(0.16,1,0.3,1) both',
  },
  dropHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.85rem 1rem', borderBottom: '1px solid #1e1e1e',
  },
  dropTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: '#f0ede8' },
  viewAll: { fontSize: '0.72rem', color: '#f4820a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 },
  filterWrap: { display: 'flex', gap: '0.4rem', padding: '0.55rem 1rem', borderBottom: '1px solid #1e1e1e', overflowX: 'auto', whiteSpace: 'nowrap' },
  filterBtn: (active) => ({
    background: active ? '#f4820a' : 'transparent',
    color: active ? '#fff' : '#888',
    border: `1px solid ${active ? '#f4820a' : '#2a2a2a'}`,
    borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 500,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s'
  }),
  item: { display: 'flex', gap: '0.75rem', padding: '0.85rem 1rem', borderBottom: '1px solid #161616', cursor: 'pointer', transition: 'background 0.15s' },
  dot: (read) => ({ width: 7, height: 7, borderRadius: '50%', background: read ? '#2a2a2a' : '#f4820a', marginTop: 5, flexShrink: 0 }),
  itemText: { fontSize: '0.8rem', color: '#c0bdb8', lineHeight: 1.5 },
  itemTime: { fontSize: '0.7rem', color: '#444', marginTop: '0.15rem' },
  empty: { padding: '2rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: '#444' },
  footer: { padding: '0.65rem 1rem', borderTop: '1px solid #1e1e1e', textAlign: 'center' },
  footerBtn: { background: 'none', border: 'none', color: '#f4820a', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }
};

// Inject dropdown animation and CSS-based hover/scrollbar states once
if (typeof document !== 'undefined' && !document.getElementById('bell-style')) {
  const style = document.createElement('style');
  style.id = 'bell-style';
  style.textContent = `
    @keyframes dropIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    .notif-item:hover { background-color: #161616 !important; }
    .filter-scroll::-webkit-scrollbar { display: none; }
    .filter-scroll { -ms-overflow-style: none; scrollbar-width: none; }
  `;
  document.head.appendChild(style);
}

function fmtTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function NotificationBell() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifs] = useState([]);
  const [filter, setFilter] = useState('all');
  const wrapRef = useRef(null);

  const SOCKET_URL = window.env?.REACT_APP_SOCKET_URL || import.meta.env?.VITE_SOCKET_URL || 'http://localhost:5000';

  // ── Functions ───────────────────────────────────────────────────
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));

  const markRead = (id) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const handleViewAll = () => {
    setOpen(false);
    markAllRead();
    navigate('/notifications');
  };

  async function subscribeToPush() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      const { data } = await API.get('/auth/push-key');
      const sw = await navigator.serviceWorker.ready;

      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      await API.post('/auth/push-subscribe', { subscription });
    } catch (err) {
      console.warn('Push subscription failed:', err.message);
    }
  }

  // ── Native Push Request & Subscription ──────────────────────────
  useEffect(() => {
    if (!user) return;
    const key = `push_asked_${user._id}`;
    
    if (!localStorage.getItem(key) && 'Notification' in window) {
      const timer = setTimeout(async () => {
        try {
          const permission = await Notification.requestPermission();
          localStorage.setItem(key, '1');
          if (permission === 'granted') {
            console.log('Push notification permission granted');
            await subscribeToPush();
          }
        } catch (error) {
          console.warn('Failed to request notification permission:', error);
        }
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  // ── Socket connection ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      if (user._id) socket.emit('join', user._id);
    });
    
    const addNotif = (type, data) => {
      setNotifs(prev => [{
        id: Date.now(),
        type,
        message: data.message || 'New notification.',
        timestamp: new Date().toISOString(),
        read: false,
        incidentId: data.incidentId || null,
        postId: data.postId || null,
      }, ...prev.slice(0, 19)]);

      if (['verified', 'resolved', 'rejected', 'applicationApproved', 'applicationRejected'].includes(type)) {
        refreshUser();
      }
    };

    socket.on('newMessage', (data) => addNotif('message', {
      message: `New message from ${data.fromName}`,
      incidentId: null,
      postId: null,
    }));

    socket.on('infoRequest', (data) => addNotif('infoRequest', { 
      message: data.message, incidentId: data.incidentId 
    }));

    socket.on('incidentUpdate', d => addNotif('incidentUpdate', d));
    
    ['verified', 'dispatched', 'resolved', 'rejected'].forEach(ev => {
      socket.on(ev, d => addNotif(ev, d));
    });

    socket.on('forumReply', (data) => addNotif('forumReply', {
      message: data.message,
      incidentId: null,
      postId: data.postId,
    }));

    socket.on('applicationRejected', (data) => {
      addNotif('applicationRejected', { message: data.message, incidentId: null });
    });

    socket.on('applicationApproved', (data) => {
      addNotif('applicationApproved', { message: data.message, incidentId: null });
    });

    return () => socket.disconnect();
  }, [user, SOCKET_URL, refreshUser]);

  // ── Close dropdown when clicking outside ───────────────────────
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(isOpen => {
          if (isOpen) markAllRead(); 
          return false;
        });
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Filter local notifications before slicing and displaying
  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  return (
    <div style={S.wrap} ref={wrapRef}>

      {/* ── Bell Button ─────────────────────────────────────────── */}
      <button
        style={{
          ...S.btn,
          borderColor: open ? '#e63c2f' : '#2a2a2a'
        }}
        onClick={() => { 
          setOpen(prev => {
            const nextState = !prev;
            if (!nextState) markAllRead(); 
            return nextState;
          });
        }}
        title="Notifications"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        🔔
        {unreadCount > 0 && (
          <span style={S.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* ── Dropdown ────────────────────────────────────────────── */}
      {open && (
        <div style={S.dropdown}>

          {/* Header */}
          <div style={S.dropHeader}>
            <span style={S.dropTitle}>Notifications</span>
            <button style={S.viewAll} onClick={handleViewAll}>View all →</button>
          </div>

          {/* Filter Submenu */}
          <div style={S.filterWrap} className="filter-scroll">
            {['all','verified','dispatched','resolved','rejected','forumReply','applicationApproved','applicationRejected'].map(type => (
              <button 
                key={type} 
                style={S.filterBtn(filter === type)}
                onClick={() => setFilter(type)}
              >
                {type === 'all'                 ? 'All' 
                 : type === 'forumReply'        ? 'Forum' 
                 : type === 'applicationApproved' ? 'App ✅' 
                 : type === 'applicationRejected' ? 'App ✕' 
                 : type}
              </button>
            ))}
          </div>

          {/* Items */}
          {filteredNotifications.length === 0 ? (
            <div style={S.empty}>No notifications yet</div>
          ) : (
            filteredNotifications.slice(0, 5).map(n => (
              <div
                key={n.id}
                className="notif-item"
                style={{
                  ...S.item,
                  background: n.read ? 'transparent' : 'rgba(244,130,10,0.04)',
                }}
                onClick={() => {
                  markRead(n.id);
                  setOpen(false);
                  if (n.incidentId) {
                    navigate(`/incidents/${n.incidentId}`);
                  } else if (n.postId) {
                    navigate(`/forum/${n.postId}`);
                  }
                }}
              >
                <div style={S.dot(n.read)} />
                <div>
                  <div style={S.itemText}>{n.message}</div>
                  <div style={S.itemTime}>{fmtTime(n.timestamp)}</div>
                </div>
              </div>
            ))
          )}

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div style={S.footer}>
              <button style={S.footerBtn} onClick={handleViewAll}>
                See all {filteredNotifications.length} notifications
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}