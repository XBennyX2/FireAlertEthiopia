import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

// ── Styles ────────────────────────────────────────────────────────
const S = {
  wrap: {
    position: 'relative',
    display:  'inline-flex',
    alignItems: 'center',
  },
  btn: {
    position:        'relative',
    background:      'transparent',
    border:          '1px solid #2a2a2a',
    borderRadius:    8,
    width:           36,
    height:          36,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    cursor:          'pointer',
    fontSize:        '1rem',
    transition:      'border-color 0.2s',
    color:           '#f0ede8',
  },
  badge: {
    position:        'absolute',
    top:             -5,
    right:           -5,
    background:      '#e63c2f',
    color:           '#fff',
    borderRadius:    999,
    fontSize:        '0.6rem',
    fontWeight:      700,
    minWidth:        16,
    height:          16,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         '0 4px',
    fontFamily:      "'Syne', sans-serif",
    pointerEvents:   'none',
  },
  dropdown: {
    position:        'absolute',
    top:             'calc(100% + 8px)',
    right:           0,
    width:           320,
    background:      '#111',
    border:          '1px solid #1e1e1e',
    borderRadius:    12,
    boxShadow:       '0 16px 40px rgba(0,0,0,0.5)',
    zIndex:          200,
    overflow:        'hidden',
    animation:       'dropIn 0.18s cubic-bezier(0.16,1,0.3,1) both',
  },
  dropHeader: {
    display:         'flex',
    justifyContent:  'space-between',
    alignItems:      'center',
    padding:         '0.85rem 1rem',
    borderBottom:    '1px solid #1e1e1e',
  },
  dropTitle: {
    fontFamily:      "'Syne', sans-serif",
    fontWeight:      700,
    fontSize:        '0.875rem',
    color:           '#f0ede8',
  },
  viewAll: {
    fontSize:        '0.72rem',
    color:           '#f4820a',
    background:      'none',
    border:          'none',
    cursor:          'pointer',
    fontFamily:      "'DM Sans', sans-serif",
    fontWeight:      500,
  },
  item: {
    display:         'flex',
    gap:             '0.75rem',
    padding:         '0.85rem 1rem',
    borderBottom:    '1px solid #161616',
    cursor:          'pointer',
    transition:      'background 0.15s',
  },
  dot: (read) => ({
    width:           7,
    height:          7,
    borderRadius:    '50%',
    background:      read ? '#2a2a2a' : '#f4820a',
    marginTop:       5,
    flexShrink:      0,
  }),
  itemText: {
    fontSize:        '0.8rem',
    color:           '#c0bdb8',
    lineHeight:      1.5,
  },
  itemTime: {
    fontSize:        '0.7rem',
    color:           '#444',
    marginTop:       '0.15rem',
  },
  empty: {
    padding:         '2rem 1rem',
    textAlign:       'center',
    fontSize:        '0.8rem',
    color:           '#444',
  },
  footer: {
    padding:         '0.65rem 1rem',
    borderTop:       '1px solid #1e1e1e',
    textAlign:       'center',
  },
  footerBtn: {
    background:      'none',
    border:          'none',
    color:           '#f4820a',
    fontSize:        '0.78rem',
    cursor:          'pointer',
    fontFamily:      "'DM Sans', sans-serif",
    fontWeight:      500,
  }
};

// Inject dropdown animation once
if (!document.getElementById('bell-style')) {
  const style       = document.createElement('style');
  style.id          = 'bell-style';
  style.textContent = `
    @keyframes dropIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function fmtTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { user, refreshUser } = useAuth();
  const navigate    = useNavigate();
  const [open, setOpen]            = useState(false);
  const [notifications, setNotifs] = useState([]);
  const wrapRef     = useRef(null);

  // ── Socket connection ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      if (user._id) socket.emit('join', user._id);
    });

    // ── addNotif: stores type, message, incidentId, postId ───────
    const addNotif = (type, data) => {
      setNotifs(prev => [{
        id:         Date.now(),
        type,
        message:    data.message || 'New notification.',
        timestamp:  new Date().toISOString(),
        read:       false,
        incidentId: data.incidentId || null,
        postId:     data.postId     || null,
      }, ...prev.slice(0, 19)]);

      if (['verified', 'resolved', 'rejected'].includes(type)) {
        refreshUser();
      }
    };

    socket.on('incidentUpdate', d => addNotif('incidentUpdate', d));
    ['verified', 'dispatched', 'resolved', 'rejected'].forEach(ev => {
      socket.on(ev, d => addNotif(ev, d));
    });

    // ── forumReply: replies and likes on forum posts ──────────────
    socket.on('forumReply', (data) => {
      addNotif('forumReply', {
        message:    data.message,
        incidentId: null,
        postId:     data.postId,
      });
    });

    return () => socket.disconnect();
  }, [user]);

  // ── Close dropdown when clicking outside ───────────────────────
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  function markRead(id) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  function handleViewAll() {
    setOpen(false);
    markAllRead();
    navigate('/notifications');
  }

  return (
    <div style={S.wrap} ref={wrapRef}>

      {/* ── Bell Button ─────────────────────────────────────────── */}
      <button
        style={{
          ...S.btn,
          borderColor: open ? '#e63c2f' : '#2a2a2a'
        }}
        onClick={() => { setOpen(v => !v); if (unread > 0) markAllRead(); }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={S.badge}>{unread > 9 ? '9+' : unread}</span>
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

          {/* Items */}
          {notifications.length === 0 ? (
            <div style={S.empty}>No notifications yet</div>
          ) : (
            notifications.slice(0, 5).map(n => (
              <div
                key={n.id}
                style={{
                  ...S.item,
                  background: n.read ? 'transparent' : 'rgba(244,130,10,0.04)',
                }}
                onClick={() => {
                  markRead(n.id);
                  if (n.incidentId) {
                    setOpen(false);
                    navigate(`/incidents/${n.incidentId}`);
                  } else if (n.postId) {
                    setOpen(false);
                    navigate(`/forum/${n.postId}`);
                  }
                }}
                onMouseOver={e => e.currentTarget.style.background = '#161616'}
                onMouseOut={e  => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(244,130,10,0.04)'}
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
          {notifications.length > 0 && (
            <div style={S.footer}>
              <button style={S.footerBtn} onClick={handleViewAll}>
                See all {notifications.length} notifications
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}