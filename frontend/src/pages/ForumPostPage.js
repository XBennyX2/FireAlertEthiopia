import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import NotificationBell from '../components/NotificationBell';
import API from '../api/axios';
import '../dashboard.css';

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    day:'numeric', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

const EDIT_WINDOW = 15 * 60 * 1000;

function Avatar({ user, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius:'50%',
      background:'linear-gradient(135deg,#e63c2f,#f4820a)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: size * 0.38, color:'#fff', fontWeight:800,
      overflow:'hidden', flexShrink:0,
    }}>
      {user?.profilePhoto
        ? <img src={user.profilePhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        : user?.name?.charAt(0)?.toUpperCase() || '?'
      }
    </div>
  );
}

export default function ForumPostPage() {
  const { id }           = useParams();
  const { user, logout } = useAuth();
  const { t }            = useLanguage();
  const { toast }        = useToast();
  const navigate         = useNavigate();
  const replyRef         = useRef(null);

  const [post,          setPost]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [replyContent,  setReplyContent]  = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [editingPost,   setEditingPost]   = useState(false);
  const [editTitle,     setEditTitle]     = useState('');
  const [editContent,   setEditContent]   = useState('');
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    loadPost();
  }, [id]);

  async function loadPost() {
    try {
      const { data } = await API.get(`/forum/${id}`);
      setPost(data);
    } catch (err) {
      toast.error('Could not load post.');
      navigate('/forum');
    } finally {
      setLoading(false);
    }
  }

  async function handleLikePost() {
    try {
      const { data } = await API.post(`/forum/${id}/like`);
      setPost(prev => ({
        ...prev,
        likes: data.liked
          ? [...(prev.likes || []), user._id]
          : (prev.likes || []).filter(l => l !== user._id),
      }));
    } catch {
      toast.error('Failed to like post.');
    }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await API.post(`/forum/${id}/replies`, { content: replyContent });
      setPost(prev => ({ ...prev, replies: [...(prev.replies || []), data] }));
      setReplyContent('');
      toast.success('Reply posted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post reply.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePost() {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await API.delete(`/forum/${id}`);
      toast.success('Post deleted.');
      navigate('/forum');
    } catch {
      toast.error('Failed to delete post.');
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await API.put(`/forum/${id}`, { title: editTitle, content: editContent });
      setPost(prev => ({ ...prev, title: editTitle, content: editContent, editedAt: new Date() }));
      setEditingPost(false);
      toast.success('Post updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update post.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteReply(replyId) {
    try {
      await API.delete(`/forum/${id}/replies/${replyId}`);
      setPost(prev => ({
        ...prev,
        replies: prev.replies.map(r =>
          r._id === replyId ? { ...r, content:'[Reply removed]', isRemoved:true } : r
        ),
      }));
      toast.success('Reply removed.');
    } catch {
      toast.error('Failed to remove reply.');
    }
  }

  async function handleLikeReply(replyId) {
    try {
      const { data } = await API.post(`/forum/${id}/replies/${replyId}/like`);
      setPost(prev => ({
        ...prev,
        replies: prev.replies.map(r =>
          r._id === replyId
            ? { ...r, likes: data.liked
                ? [...(r.likes || []), user._id]
                : (r.likes || []).filter(l => l !== user._id)
              }
            : r
        ),
      }));
    } catch {
      toast.error('Failed to like reply.');
    }
  }

  async function handleFlagPost() {
    const reason = window.prompt('Reason for flagging this post (optional):');
    if (reason === null) return; // user cancelled
    try {
      await API.post(`/forum/${id}/flag`, { reason });
      toast.success('Post flagged for moderation review.');
    } catch {
      toast.error('Failed to flag post.');
    }
  }

  async function handleVerifyPost() {
    try {
      const { data } = await API.put(`/forum/${id}/verify`);
      setPost(prev => ({ ...prev, isVerified: data.post.isVerified }));
      toast.success(data.message);
    } catch {
      toast.error('Failed to update verification.');
    }
  }

  if (loading) {
    return (
      <div className="dash-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>Loading post…</div>
      </div>
    );
  }

  if (!post) return null;

  const isAuthor       = post.author?._id === user?._id || post.author?.toString() === user?._id;
  const isMod          = ['admin','responder'].includes(user?.role);
  const canEdit        = isAuthor && (Date.now() - new Date(post.createdAt).getTime() < EDIT_WINDOW);
  const hasLikedPost   = post.likes?.map(l => l?.toString()).includes(user?._id?.toString());

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
          <Link to="/forum" className="btn-secondary" style={{ fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}>
            ← Forum
          </Link>
          <NotificationBell />
          <button className="dash-logout-btn" onClick={() => { logout(); navigate('/'); }}>
            {t.signOut}
          </button>
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth:760 }}>

        {/* ── Post ────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom:'1.25rem' }}>

          {/* Badges */}
          <div style={{ display:'flex', gap:'0.4rem', marginBottom:'0.75rem', flexWrap:'wrap' }}>
            {post.isPinned && (
              <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.5rem', background:'rgba(59,130,246,0.1)', color:'#3b82f6', borderRadius:999, fontWeight:600 }}>📌 Pinned</span>
            )}
            {post.isVerified && (
              <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.5rem', background:'rgba(34,197,94,0.1)', color:'#22c55e', borderRadius:999, fontWeight:600 }}>✓ Verified by Responder</span>
            )}
            {post.isFlagged && isMod && (
              <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.5rem', background:'rgba(230,60,47,0.1)', color:'#f87c74', borderRadius:999, fontWeight:600 }}>🚩 Flagged: {post.flagReason}</span>
            )}
          </div>

          {/* Title */}
          {editingPost ? (
            <div>
              <input
                className="form-input"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ marginBottom:'0.75rem', fontFamily:"'Syne',sans-serif", fontWeight:700 }}
              />
              <textarea
                className="form-textarea"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={6}
                style={{ marginBottom:'0.75rem' }}
              />
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button className="btn-secondary" onClick={() => setEditingPost(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.375rem', letterSpacing:'-0.02em', color:'var(--text-primary)', margin:'0 0 1rem', lineHeight:1.3 }}>
                {post.title}
              </h1>
              <p style={{ fontSize:'0.9rem', color:'var(--text-primary)', lineHeight:1.7, margin:'0 0 1rem', whiteSpace:'pre-wrap' }}>
                {post.content}
              </p>
            </>
          )}

          {/* Image */}
          {post.image && !editingPost && (
            <img src={post.image} alt="post" style={{ width:'100%', maxHeight:360, objectFit:'cover', borderRadius:8, marginBottom:'1rem', display:'block' }} />
          )}

          {/* Author + meta */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', paddingTop:'0.75rem', borderTop:'1px solid var(--border)' }}>
            <Avatar user={post.author} size={28} />
            <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{post.author?.name}</span>
            <span style={{ fontSize:'0.75rem', color:'var(--text-dim)' }}>{fmtDate(post.createdAt)}</span>
            {post.editedAt && <span style={{ fontSize:'0.7rem', color:'var(--text-dim)' }}>(edited)</span>}
            <span style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginLeft:'auto' }}>👁 {post.views}</span>
          </div>

          {/* Actions */}
          {!editingPost && (
            <div style={{ display:'flex', gap:'0.6rem', marginTop:'0.75rem', flexWrap:'wrap' }}>
              {/* Like */}
              <button
                className="btn-secondary"
                style={{ fontSize:'0.78rem', color: hasLikedPost ? 'var(--fire-orange)' : undefined, borderColor: hasLikedPost ? 'var(--fire-orange)' : undefined }}
                onClick={handleLikePost}
              >
                {hasLikedPost ? '❤️' : '🤍'} {post.likes?.length || 0} {hasLikedPost ? 'Liked' : 'Like'}
              </button>

              {/* Reply */}
              <button className="btn-secondary" style={{ fontSize:'0.78rem' }} onClick={() => replyRef.current?.focus()}>
                💬 Reply
              </button>

              {/* Edit — author only within 15 min */}
              {canEdit && (
                <button
                  className="btn-secondary"
                  style={{ fontSize:'0.78rem' }}
                  onClick={() => { setEditingPost(true); setEditTitle(post.title); setEditContent(post.content); }}
                >
                  ✏️ Edit
                </button>
              )}

              {/* Delete */}
              {(isAuthor || isMod) && (
                <button className="btn-danger" style={{ fontSize:'0.78rem' }} onClick={handleDeletePost}>
                  🗑 Delete
                </button>
              )}

              {/* Flag — non-authors */}
              {!isAuthor && (
                <button className="btn-secondary" style={{ fontSize:'0.78rem' }} onClick={handleFlagPost}>
                  🚩 Report
                </button>
              )}

              {/* Verify — mods only */}
              {isMod && (
                <button
                  className="btn-secondary"
                  style={{ fontSize:'0.78rem', color: post.isVerified ? '#22c55e' : undefined }}
                  onClick={handleVerifyPost}
                >
                  {post.isVerified ? '✓ Verified' : '✓ Verify'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Replies ─────────────────────────────────────────── */}
        <div className="section-label" style={{ marginBottom:'0.75rem' }}>
          {post.replies?.filter(r => !r.isRemoved).length || 0} Replies
        </div>

        {post.replies?.map(reply => {
          if (reply.isRemoved) return null;
          const hasLikedReply  = reply.likes?.map(l => l?.toString()).includes(user?._id?.toString());
          const isReplyAuthor  = reply.author?._id === user?._id || reply.author?.toString() === user?._id;

          return (
            <div key={reply._id} className="card" style={{ marginBottom:'0.6rem', padding:'1rem 1.25rem' }}>
              <div style={{ display:'flex', gap:'0.75rem', alignItems:'flex-start' }}>
                <Avatar user={reply.author} size={28} />
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.35rem', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-primary)' }}>
                      {reply.author?.name}
                    </span>
                    {reply.author?.role === 'responder' && (
                      <span style={{ fontSize:'0.62rem', padding:'0.1rem 0.4rem', background:'rgba(59,130,246,0.1)', color:'#3b82f6', borderRadius:999, fontWeight:600 }}>
                        🚒 Responder
                      </span>
                    )}
                    {reply.author?.role === 'admin' && (
                      <span style={{ fontSize:'0.62rem', padding:'0.1rem 0.4rem', background:'rgba(168,85,247,0.1)', color:'#a855f7', borderRadius:999, fontWeight:600 }}>
                        ⚙️ Admin
                      </span>
                    )}
                    <span style={{ fontSize:'0.7rem', color:'var(--text-dim)' }}>{fmtDate(reply.createdAt)}</span>
                  </div>

                  <p style={{ fontSize:'0.875rem', color:'var(--text-primary)', lineHeight:1.65, margin:'0 0 0.6rem', whiteSpace:'pre-wrap' }}>
                    {reply.content}
                  </p>

                  <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                    <button
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.78rem', color: hasLikedReply ? 'var(--fire-orange)' : 'var(--text-dim)', padding:0 }}
                      onClick={() => handleLikeReply(reply._id)}
                    >
                      {hasLikedReply ? '❤️' : '🤍'} {reply.likes?.length || 0}
                    </button>

                    {(isReplyAuthor || isMod) && (
                      <button
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.75rem', color:'var(--text-dim)', padding:0 }}
                        onClick={() => handleDeleteReply(reply._id)}
                      >
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Reply Form ───────────────────────────────────────── */}
        <div className="card" style={{ marginTop:'1.25rem' }}>
          <div className="section-label" style={{ marginBottom:'0.75rem' }}>Add a Reply</div>
          <form onSubmit={handleReply} noValidate>
            <div className="form-group" style={{ marginBottom:'0.75rem' }}>
              <textarea
                ref={replyRef}
                className="form-textarea"
                placeholder="Write your reply…"
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                rows={3}
              />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={submitting || !replyContent.trim()}>
                {submitting ? 'Posting…' : 'Post Reply'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}