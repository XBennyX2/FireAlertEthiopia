import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../api/axios';
import { io } from 'socket.io-client';
// Import the configuration URL profile
import { SERVER_URL } from '../config';
import '../dashboard.css';

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

export default function MessagingPage() {
  const { user }    = useAuth();
  const { toast }   = useToast();
  const navigate    = useNavigate();
  const [params]    = useSearchParams();

  const socketRef   = useRef(null);
  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);

  const [responders,    setResponders]    = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeThread,  setActiveThread]  = useState(null); // { partner, messages }
  const [input,         setInput]         = useState('');
  const [sending,       setSending]       = useState(false);
  const [typing,        setTyping]        = useState(false); // someone is typing to me
  const [typingName,    setTypingName]    = useState('');
  const [view,          setView]          = useState('conversations'); // 'conversations' | 'thread' | 'new'

  const backLink = user?.role === 'admin' ? '/admin' : '/responder';

  // Connect socket
  useEffect(() => {
    // Dynamic integration with Socket.io server
    const socket = io(SERVER_URL, {
      auth: { token: localStorage.getItem('token') },
    });
    socketRef.current = socket;

    socket.emit('join', user._id);

    socket.on('newMessage', ({ message, fromId }) => {
      // If we're in that thread, append
      setActiveThread(prev => {
        if (prev && (prev.partner._id === fromId || prev.partner._id?.toString() === fromId)) {
          return { ...prev, messages: [...prev.messages, message] };
        }
        return prev;
      });
      // Update conversation list
      loadConversations();
    });

    socket.on('typing', ({ fromName }) => {
      setTyping(true);
      setTypingName(fromName);
    });

    socket.on('stopTyping', () => {
      setTyping(false);
      setTypingName('');
    });

    return () => socket.disconnect();
  }, [user._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages?.length, typing]);

  useEffect(() => {
    loadConversations();
    loadResponders();

    // Open thread from URL param ?to=userId
    const to = params.get('to');
    if (to) openThread(to);
  }, []);

  async function loadConversations() {
    try {
      const { data } = await API.get('/messages/conversations');
      setConversations(data);
    } catch {}
  }

  async function loadResponders() {
    try {
      const { data } = await API.get('/messages/responders');
      setResponders(data);
    } catch {}
  }

  async function openThread(partnerId, partnerObj = null) {
    try {
      const { data: messages } = await API.get(`/messages/thread/${partnerId}`);
      const partner = partnerObj || responders.find(r => r._id === partnerId)
        || conversations.find(c => c.partner._id === partnerId)?.partner
        || { _id: partnerId, name: 'Responder' };

      setActiveThread({ partner, messages });
      setView('thread');
      loadConversations(); // refresh unread counts
    } catch {
      toast.error('Failed to open conversation.');
    }
  }

  function handleTyping() {
    if (!activeThread || !socketRef.current) return;
    socketRef.current.emit('typing', {
      to:       activeThread.partner._id,
      fromName: user.name,
    });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { to: activeThread.partner._id });
    }, 1500);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !activeThread || sending) return;

    setSending(true);
    try {
      const { data: message } = await API.post('/messages', {
        to:      activeThread.partner._id,
        content: input.trim(),
      });
      setActiveThread(prev => ({ ...prev, messages: [...prev.messages, message] }));
      setInput('');
      socketRef.current?.emit('stopTyping', { to: activeThread.partner._id });
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="dash-page">
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">FireAlert</span>
        </Link>
        <div className="dash-topbar-right">
          <Link to={backLink} className="btn-secondary" style={{ fontSize:'0.78rem' }}>← Back</Link>
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth:760, padding:'1.5rem 1rem' }}>

        {/* Header */}
        <div className="dash-header" style={{ marginBottom:'1.25rem' }}>
          <div>
            <h1 className="dash-title">
              Messages
              {totalUnread > 0 && (
                <span style={{ marginLeft:'0.5rem', fontSize:'0.75rem', background:'#e63c2f', color:'#fff', borderRadius:999, padding:'2px 8px', fontWeight:700 }}>
                  {totalUnread}
                </span>
              )}
            </h1>
            <p className="dash-subtitle">Direct messages between responders.</p>
          </div>
          <button className="btn-primary" style={{ fontSize:'0.78rem' }} onClick={() => setView('new')}>
            + New Message
          </button>
        </div>

        <div style={{ display:'flex', gap:'1rem', minHeight:500 }}>

          {/* ── Left panel: conversation list ────────────────── */}
          <div style={{
            width:220, flexShrink:0,
            background:'rgba(255,255,255,0.02)',
            border:'1px solid #1e1e1e', borderRadius:10,
            overflow:'hidden', display:'flex', flexDirection:'column',
          }}>
            <div style={{ padding:'0.75rem', borderBottom:'1px solid #111', fontSize:'0.75rem', fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Conversations
            </div>

            {conversations.length === 0 && (
              <div style={{ padding:'1rem', fontSize:'0.78rem', color:'#444', textAlign:'center' }}>
                No conversations yet.
              </div>
            )}

            {conversations.map(c => (
              <div
                key={c.partner._id}
                onClick={() => openThread(c.partner._id, c.partner)}
                style={{
                  padding:'0.75rem',
                  cursor:'pointer',
                  borderBottom:'1px solid #0f0f0f',
                  background: activeThread?.partner._id === c.partner._id
                    ? 'rgba(244,130,10,0.08)' : 'transparent',
                  transition:'background 0.15s',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                  <div style={{
                    width:32, height:32, borderRadius:'50%', flexShrink:0,
                    background:'linear-gradient(135deg,#e63c2f,#f4820a)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.75rem', fontWeight:800, color:'#fff', overflow:'hidden',
                  }}>
                    {c.partner.profilePhoto
                      ? <img src={`${SERVER_URL}/${c.partner.profilePhoto}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : c.partner.name?.charAt(0)
                    }
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:'0.82rem', fontWeight:600, color:'#f0ede8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {c.partner.name}
                      </span>
                      {c.unreadCount > 0 && (
                        <span style={{ background:'#e63c2f', color:'#fff', borderRadius:999, fontSize:'0.6rem', padding:'1px 5px', fontWeight:700, flexShrink:0, marginLeft:4 }}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:'0.7rem', color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {c.lastMessage.fromMe ? 'You: ' : ''}{c.lastMessage.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Right panel ───────────────────────────────────── */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', border:'1px solid #1e1e1e', borderRadius:10, overflow:'hidden' }}>

            {/* New message — pick a responder */}
            {view === 'new' && (
              <div style={{ padding:'1.25rem', flex:1 }}>
                <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#f0ede8', marginBottom:'1rem' }}>
                  Start a new conversation
                </div>
                {responders.length === 0 && (
                  <div style={{ color:'#444', fontSize:'0.82rem' }}>No other responders online.</div>
                )}
                {responders.map(r => (
                  <div
                    key={r._id}
                    onClick={() => openThread(r._id, r)}
                    style={{
                      display:'flex', alignItems:'center', gap:'0.75rem',
                      padding:'0.65rem', borderRadius:8, cursor:'pointer',
                      marginBottom:'0.4rem', border:'1px solid #1e1e1e',
                      transition:'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(244,130,10,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#e63c2f,#f4820a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', fontWeight:800, color:'#fff', overflow:'hidden', flexShrink:0 }}>
                      {r.profilePhoto
                        ? <img src={`${SERVER_URL}/${r.profilePhoto}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : r.name?.charAt(0)
                      }
                    </div>
                    <div>
                      <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#f0ede8' }}>{r.name}</div>
                      <div style={{ fontSize:'0.72rem', color: r.isOnDuty ? '#22c55e' : '#555' }}>
                        {r.isOnDuty ? '🟢 On duty' : '⚫ Off duty'} · Rep: {r.reputationScore}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No thread selected */}
            {view === 'conversations' && !activeThread && (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'0.5rem', color:'#444' }}>
                <div style={{ fontSize:'2rem' }}>💬</div>
                <div style={{ fontSize:'0.85rem' }}>Select a conversation or start a new one</div>
              </div>
            )}

            {/* Active thread */}
            {view === 'thread' && activeThread && (
              <>
                {/* Thread header */}
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.85rem 1rem', borderBottom:'1px solid #111' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#e63c2f,#f4820a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', fontWeight:800, color:'#fff', overflow:'hidden', flexShrink:0 }}>
                    {activeThread.partner.profilePhoto
                      ? <img src={`${SERVER_URL}/${activeThread.partner.profilePhoto}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : activeThread.partner.name?.charAt(0)
                    }
                  </div>
                  <div>
                    <div style={{ fontSize:'0.9rem', fontWeight:700, color:'#f0ede8' }}>{activeThread.partner.name}</div>
                    <div style={{ fontSize:'0.7rem', color:'#555' }}>Responder</div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex:1, overflowY:'auto', padding:'1rem', display:'flex', flexDirection:'column', gap:'0.6rem', minHeight:0 }}>
                  {activeThread.messages.length === 0 && (
                    <div style={{ textAlign:'center', color:'#444', fontSize:'0.82rem', marginTop:'2rem' }}>
                      No messages yet. Say hello!
                    </div>
                  )}

                  {activeThread.messages.map((msg, i) => {
                    const fromMe = msg.from._id?.toString() === user._id || msg.from?.toString() === user._id;
                    return (
                      <div key={i} style={{ display:'flex', justifyContent: fromMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth:'70%',
                          padding:'0.6rem 0.85rem',
                          borderRadius: fromMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                          background: fromMe ? 'linear-gradient(135deg,#e63c2f,#f4820a)' : '#1a1a1a',
                          border: fromMe ? 'none' : '1px solid #2a2a2a',
                        }}>
                          {!fromMe && (
                            <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#f4820a', marginBottom:'0.2rem' }}>
                              {msg.from?.name || activeThread.partner.name}
                            </div>
                          )}
                          <div style={{ fontSize:'0.84rem', color: fromMe ? '#fff' : '#e0ddd8', lineHeight:1.5, wordBreak:'break-word' }}>
                            {msg.content}
                          </div>
                          <div style={{ fontSize:'0.65rem', color: fromMe ? 'rgba(255,255,255,0.6)' : '#444', marginTop:'0.2rem', textAlign:'right' }}>
                            {fmtTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {typing && (
                    <div style={{ display:'flex', justifyContent:'flex-start' }}>
                      <div style={{ padding:'0.6rem 0.85rem', borderRadius:'12px 12px 12px 4px', background:'#1a1a1a', border:'1px solid #2a2a2a' }}>
                        <div style={{ fontSize:'0.75rem', color:'#555' }}>
                          {typingName} is typing…
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} style={{ display:'flex', gap:'0.5rem', padding:'0.75rem', borderTop:'1px solid #111' }}>
                  <input
                    className="form-input"
                    value={input}
                    onChange={e => { setInput(e.target.value); handleTyping(); }}
                    placeholder={`Message ${activeThread.partner.name}…`}
                    style={{ flex:1, marginBottom:0 }}
                    maxLength={1000}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={sending || !input.trim()}
                    style={{ padding:'0.55rem 1rem', flexShrink:0 }}
                  >
                    {sending ? '…' : '→'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}