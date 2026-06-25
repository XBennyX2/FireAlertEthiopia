import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import '../dashboard.css';

const CATEGORIES = [
  { value:'prevention',          label:'Fire Prevention Tip' },
  { value:'emergency_procedure', label:'Emergency Procedure' },
  { value:'preparedness',        label:'Home Preparedness' },
  { value:'contact',             label:'Emergency Contact' },
];

export default function SafetyContentPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { toast }   = useToast();

  const [myContent, setMyContent] = useState([]);
  const [loading,   setLoading]   = useState(true);

  // Form state
  const [title,     setTitle]     = useState('');
  const [body,      setBody]      = useState('');
  const [category,  setCategory]  = useState('');
  const [language,  setLanguage]  = useState('en');
  const [submitting,setSubmitting]= useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);

  const backLink = user?.role === 'admin' ? '/admin' : '/responder';

  useEffect(() => { loadMyContent(); }, []);

  async function loadMyContent() {
    try {
      const { data } = await API.get('/safety/mine');
      setMyContent(data);
    } catch { toast.error('Failed to load your content.'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !category) {
      return toast.error('Please fill in all required fields.');
    }

    setSubmitting(true);
    try {
      if (editId) {
        await API.put(`/safety/${editId}`, { title, body, category, language });
        toast.success('Content updated and resubmitted for review.');
      } else {
        await API.post('/safety', { title, body, category, language });
        toast.success(user?.role === 'admin'
          ? 'Content published immediately.'
          : 'Submitted for admin review.');
      }
      setShowForm(false); setEditId(null);
      setTitle(''); setBody(''); setCategory(''); setLanguage('en');
      await loadMyContent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit content.');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item) {
    setEditId(item._id);
    setTitle(item.title);
    setBody(item.body);
    setCategory(item.category);
    setLanguage(item.language || 'en');
    setShowForm(true);
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this content?')) return;
    try {
      await API.delete(`/safety/${id}`);
      toast.success('Content deleted.');
      setMyContent(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    }
  }

  const STATUS_COLORS = {
    draft:          '#666',
    pending_review: '#f4820a',
    approved:       '#22c55e',
    rejected:       '#e63c2f',
  };

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

      <div className="dash-content" style={{ maxWidth:700 }}>
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Safety Content</h1>
            <p className="dash-subtitle">Create fire safety tips and procedures for the community.</p>
          </div>
          {!showForm && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + New Content
            </button>
          )}
        </div>

        {/* ── Create/Edit Form ──────────────────────────── */}
        {showForm && (
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div style={{ fontWeight:600, marginBottom:'1rem', color:'var(--text-primary)' }}>
              {editId ? 'Edit Content' : 'New Safety Content'}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Never leave cooking unattended" />
              </div>

              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Language</label>
                  <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
                    <option value="en">English</option>
                    <option value="am">Amharic</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Content Body *</label>
                <textarea className="form-textarea" value={body} onChange={e => setBody(e.target.value)}
                  rows={6} placeholder="Write the safety tip, procedure, or information here…" />
                <span className="form-hint">{body.length} characters</span>
              </div>

              <div style={{ display:'flex', gap:'0.6rem', justifyContent:'flex-end' }}>
                <button type="button" className="btn-secondary"
                  onClick={() => { setShowForm(false); setEditId(null); setTitle(''); setBody(''); setCategory(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting…' : editId ? 'Update & Resubmit' : user?.role === 'admin' ? 'Publish Now' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── My submissions ────────────────────────────── */}
        <div className="section-label">My Submissions</div>

        {loading && <div className="loading-state">Loading…</div>}

        {!loading && myContent.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div>You haven't submitted any safety content yet.</div>
          </div>
        )}

        {myContent.map(item => (
          <div key={item._id} className="card-sm" style={{ marginBottom:'0.6rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:'0.2rem' }}>{item.title}</div>
                <div style={{ fontSize:'0.75rem', color:'#666', marginBottom:'0.35rem' }}>
                  {CATEGORIES.find(c => c.value === item.category)?.label} · {item.language === 'am' ? 'Amharic' : 'English'}
                </div>
                <span style={{
                  fontSize:'0.68rem', padding:'0.1rem 0.5rem', borderRadius:999,
                  background:`${STATUS_COLORS[item.status]}18`,
                  color: STATUS_COLORS[item.status], fontWeight:600, textTransform:'capitalize',
                }}>
                  {item.status.replace('_', ' ')}
                </span>
                {item.rejectionReason && (
                  <div style={{ fontSize:'0.75rem', color:'#f87c74', marginTop:'0.4rem' }}>
                    Rejection reason: {item.rejectionReason}
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:'0.4rem', flexShrink:0 }}>
                {item.status !== 'approved' && (
                  <button className="btn-secondary" style={{ fontSize:'0.72rem', padding:'0.3rem 0.7rem' }}
                    onClick={() => startEdit(item)}>Edit</button>
                )}
                {item.status !== 'approved' && (
                  <button className="btn-danger" style={{ fontSize:'0.72rem', padding:'0.3rem 0.7rem' }}
                    onClick={() => handleDelete(item._id)}>Delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}