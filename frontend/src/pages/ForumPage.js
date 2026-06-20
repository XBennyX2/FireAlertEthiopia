import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import NotificationBell from '../components/NotificationBell';
import API from '../api/axios';
import '../dashboard.css';

const CATEGORIES = [
  { value:'',                 label:'All Categories',     icon:'📋' },
  { value:'general',          label:'General',            icon:'💬' },
  { value:'fire_safety',      label:'Fire Safety',        icon:'🔥' },
  { value:'incident_reports', label:'Incident Reports',   icon:'📍' },
  { value:'announcements',    label:'Announcements',      icon:'📢' },
  { value:'questions',        label:'Questions',          icon:'❓' },
];

function fmtDate(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ForumPage() {
  const { user, logout } = useAuth();
  const { t }            = useLanguage();
  const { toast }        = useToast();
  const navigate         = useNavigate();

  const [posts,          setPosts]          = useState([]);
  const [total,          setTotal]          = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [category,       setCategory]       = useState('');
  const [search,         setSearch]         = useState('');
  const [page,           setPage]           = useState(1);
  const [showNewPost,    setShowNewPost]    = useState(false);

  // New post form
  const [newTitle,    setNewTitle]    = useState('');
  const [newContent,  setNewContent]  = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newImage,    setNewImage]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    loadPosts();
  }, [category, search, page]);

  async function loadPosts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit:15 });
      if (category) params.set('category', category);
      if (search)   params.set('search',   search);

      const { data } = await API.get(`/forum?${params}`);
      setPosts(data.posts);
      setTotal(data.total);
    } catch (err) {
      toast.error('Failed to load forum posts.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitPost(e) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      return toast.error('Title and content are required.');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title',    newTitle.trim());
      formData.append('content',  newContent.trim());
      formData.append('category', newCategory);
      if (newImage) formData.append('image', newImage);

      await API.post('/forum', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Post created successfully.');
      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
      setNewImage(null);
      setShowNewPost(false);
      loadPosts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create post.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(postId) {
    try {
      const { data } = await API.post(`/forum/${postId}/like`);
      setPosts(prev => prev.map(p =>
        p._id === postId
          ? { ...p, likes: data.liked
              ? [...(p.likes || []), user._id]
              : (p.likes || []).filter(l => l !== user._id)
            }
          : p
      ));
    } catch {
      toast.error('Failed to like post.');
    }
  }

  const totalPages = Math.ceil(total / 15);

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
          <Link to="/dashboard" className="btn-secondary" style={{ fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}>
            ← Dashboard
          </Link>
          <NotificationBell />
          <button className="dash-logout-btn" onClick={() => { logout(); navigate('/'); }}>
            {t.signOut}
          </button>
        </div>
      </nav>

      <div className="dash-content">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Community Forum</h1>
            <p className="dash-subtitle">Discuss fire safety, share updates, and ask questions.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowNewPost(v => !v)}>
            {showNewPost ? '✕ Cancel' : '+ New Post'}
          </button>
        </div>

        {/* ── New Post Form ────────────────────────────────────── */}
        {showNewPost && (
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div className="section-label" style={{ marginBottom:'1rem' }}>Create New Post</div>
            <form onSubmit={handleSubmitPost} noValidate>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  {CATEGORIES.slice(1).map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  placeholder="Post title (max 200 characters)"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  maxLength={200}
                />
                <span className="form-hint">{newTitle.length}/200</span>
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea
                  className="form-textarea"
                  placeholder="Share your thoughts, tips, or questions…"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  rows={5}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Attach Image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={e => setNewImage(e.target.files[0])}
                  style={{ padding:'0.5rem' }}
                />
              </div>
              <div style={{ display:'flex', gap:'0.6rem', justifyContent:'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewPost(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Posting…' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Category Filters ─────────────────────────────────── */}
        <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setPage(1); }}
              style={{
                padding:      '0.35rem 0.85rem',
                borderRadius: 999,
                border:       `1px solid ${category === cat.value ? 'var(--fire-orange)' : 'var(--border-2)'}`,
                background:   category === cat.value ? 'rgba(244,130,10,0.12)' : 'transparent',
                color:        category === cat.value ? 'var(--fire-orange)' : 'var(--text-muted)',
                fontSize:     '0.75rem',
                fontWeight:   category === cat.value ? 600 : 400,
                cursor:       'pointer',
                fontFamily:   "'DM Sans', sans-serif",
                transition:   'all 0.15s',
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* ── Search ───────────────────────────────────────────── */}
        <div style={{ position:'relative', marginBottom:'1.25rem' }}>
          <span style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-dim)', fontSize:'0.85rem', pointerEvents:'none' }}>🔍</span>
          <input
            className="form-input"
            style={{ paddingLeft:'2.2rem' }}
            placeholder="Search forum posts…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* ── Posts List ───────────────────────────────────────── */}
        {loading && <div className="loading-state">{t.loading}</div>}

        {!loading && posts.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div>{search || category ? 'No posts match your filters.' : 'No posts yet. Be the first to post!'}</div>
          </div>
        )}

        {!loading && posts.map(post => {
          const hasLiked = post.likes?.map(l => l?.toString()).includes(user?._id?.toString());
          const catCfg   = CATEGORIES.find(c => c.value === post.category) || CATEGORIES[0];

          return (
            <div
              key={post._id}
              className="card"
              style={{ marginBottom:'0.75rem', cursor:'pointer', transition:'border-color 0.15s' }}
              onClick={() => navigate(`/forum/${post._id}`)}
              onMouseOver={e  => e.currentTarget.style.borderColor = 'var(--border-2)'}
              onMouseOut={e   => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem' }}>
                <div style={{ flex:1, minWidth:0 }}>

                  {/* Top row: category + verified + pinned */}
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.4rem', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'0.68rem', color:'var(--text-dim)', fontWeight:500 }}>
                      {catCfg.icon} {catCfg.label}
                    </span>
                    {post.isPinned && (
                      <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.45rem', background:'rgba(59,130,246,0.1)', color:'#3b82f6', borderRadius:999, fontWeight:600 }}>
                        📌 Pinned
                      </span>
                    )}
                    {post.isVerified && (
                      <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.45rem', background:'rgba(34,197,94,0.1)', color:'#22c55e', borderRadius:999, fontWeight:600 }}>
                        ✓ Verified
                      </span>
                    )}
                    {post.isFlagged && ['admin','responder'].includes(user?.role) && (
                      <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.45rem', background:'rgba(230,60,47,0.1)', color:'#f87c74', borderRadius:999, fontWeight:600 }}>
                        🚩 Flagged
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'0.9375rem', color:'var(--text-primary)', marginBottom:'0.35rem', lineHeight:1.3 }}>
                    {post.title}
                  </div>

                  {/* Preview */}
                  <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', lineHeight:1.55, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', marginBottom:'0.6rem' }}>
                    {post.content}
                  </div>

                  {/* Footer */}
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                    {/* Author */}
                    <div style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
                      <div style={{ width:20, height:20, borderRadius:'50%', background:'linear-gradient(135deg,#e63c2f,#f4820a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', color:'#fff', fontWeight:800, overflow:'hidden' }}>
                        {post.author?.profilePhoto
                          ? <img src={post.author.profilePhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : post.author?.name?.charAt(0)?.toUpperCase()
                        }
                      </div>
                      <span style={{ fontSize:'0.72rem', color:'var(--text-dim)' }}>{post.author?.name}</span>
                    </div>

                    <span style={{ fontSize:'0.72rem', color:'var(--text-dim)' }}>{fmtDate(post.createdAt)}</span>
                    {post.editedAt && <span style={{ fontSize:'0.68rem', color:'var(--text-dim)' }}>(edited)</span>}

                    {/* Stats */}
                    <div style={{ display:'flex', gap:'0.75rem', marginLeft:'auto' }}>
                      <span
                        style={{ fontSize:'0.75rem', color: hasLiked ? 'var(--fire-orange)' : 'var(--text-dim)', cursor:'pointer' }}
                        onClick={e => { e.stopPropagation(); handleLike(post._id); }}
                      >
                        {hasLiked ? '❤️' : '🤍'} {post.likes?.length || 0}
                      </span>
                      <span style={{ fontSize:'0.75rem', color:'var(--text-dim)' }}>
                        💬 {post.replies?.length || 0}
                      </span>
                      <span style={{ fontSize:'0.75rem', color:'var(--text-dim)' }}>
                        👁 {post.views || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thumbnail */}
                {post.image && (
                  <img
                    src={post.image}
                    alt="post"
                    style={{ width:64, height:64, objectFit:'cover', borderRadius:8, flexShrink:0 }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* ── Pagination ───────────────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', marginTop:'1.5rem', flexWrap:'wrap' }}>
            <button
              className="btn-secondary"
              onClick={() => setPage(v => Math.max(1, v - 1))}
              disabled={page === 1}
              style={{ fontSize:'0.8rem' }}
            >
              ← Previous
            </button>
            <span style={{ padding:'0.5rem 0.75rem', fontSize:'0.8rem', color:'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn-secondary"
              onClick={() => setPage(v => Math.min(totalPages, v + 1))}
              disabled={page === totalPages}
              style={{ fontSize:'0.8rem' }}
            >
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}