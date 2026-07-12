import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api/axios';
import '../dashboard.css';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function UserDetailPage() {
  const { id }     = useParams();
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('incidents');

  useEffect(() => {
    API.get(`/admin/users/${id}/detail`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="dash-page"><div className="dash-content"><div className="loading-state">Loading…</div></div></div>;
  if (!data)   return <div className="dash-page"><div className="dash-content"><div className="empty-state">User not found.</div></div></div>;

  const { user, incidents, forumPosts, application, auditLogs } = data;

  return (
    <div className="dash-page">
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo"><div className="dash-topbar-logo-icon">🔥</div><span className="dash-topbar-logo-text">FireAlert</span></Link>
        <div className="dash-topbar-right">
          <Link to="/admin" className="btn-secondary" style={{ fontSize:'0.78rem' }}>← Admin</Link>
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth:740 }}>

        {/* User header card */}
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1rem', flexWrap:'wrap' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#e63c2f,#f4820a)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {user.profilePhoto
                ? <img src={`http://localhost:5000/${user.profilePhoto}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:'1.25rem', fontWeight:800, color:'#fff' }}>{user.name?.charAt(0)}</span>
              }
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', color:'#f0ede8', marginBottom:'0.2rem' }}>{user.name}</div>
              <div style={{ fontSize:'0.78rem', color:'#666' }}>{user.email} · {user.role}</div>
              <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.35rem', flexWrap:'wrap' }}>
                {user.isBanned    && <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.5rem', borderRadius:999, background:'rgba(127,29,29,0.2)', color:'#f87c74', fontWeight:700 }}>⛔ BANNED</span>}
                {user.isRestricted && <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.5rem', borderRadius:999, background:'rgba(230,60,47,0.1)', color:'#e63c2f', fontWeight:700 }}>🚫 RESTRICTED</span>}
                {!user.isVerified  && <span style={{ fontSize:'0.65rem', padding:'0.1rem 0.5rem', borderRadius:999, background:'rgba(244,130,10,0.1)', color:'#f4820a', fontWeight:700 }}>⚠ UNVERIFIED</span>}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'1.25rem', fontWeight:800, color: user.reputationScore >= 80 ? '#22c55e' : user.reputationScore >= 60 ? '#f4820a' : '#e63c2f' }}>
                {user.reputationScore}
              </div>
              <div style={{ fontSize:'0.7rem', color:'#555' }}>reputation</div>
            </div>
          </div>

          <div className="two-col" style={{ fontSize:'0.78rem' }}>
            <div><span style={{ color:'#555' }}>Phone:</span> {user.phone || '—'}</div>
            <div><span style={{ color:'#555' }}>Joined:</span> {fmtDate(user.createdAt)}</div>
            <div><span style={{ color:'#555' }}>Last login:</span> {fmtDate(user.lastLogin)}</div>
            <div><span style={{ color:'#555' }}>False reports:</span> {user.falseReportCount || 0}</div>
            <div><span style={{ color:'#555' }}>2FA:</span> {user.twoFactorEnabled ? '✅ On' : '❌ Off'}</div>
            <div><span style={{ color:'#555' }}>Google auth:</span> {user.googleId ? '✅ Linked' : '—'}</div>
            <div>
              <span style={{ color:'#555' }}>Station:</span>{' '}
              <span style={{ color: user.station && user.station !== 'Unassigned' ? '#3b82f6' : '#f4820a' }}>
                {user.station || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:'1.25rem', flexWrap:'wrap' }}>
          {[['incidents','🚨 Reports'],['forum','💬 Forum'],['application','📋 Application'],['audit','📜 Audit']].map(([key,label])=>(
            <button key={key}
              style={{ padding:'0.5rem 1rem', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', border:'none',
                borderBottom:`2px solid ${tab===key?'#f4820a':'transparent'}`,
                background:'transparent', color:tab===key?'#f0ede8':'#555' }}
              onClick={()=>setTab(key)}
            >{label}</button>
          ))}
        </div>

        {/* Incidents */}
        {tab === 'incidents' && (
          <div>
            {incidents.length === 0 && <div className="empty-state"><div className="empty-state-icon">🚨</div><div>No reports submitted.</div></div>}
            {incidents.map(i => (
              <Link key={i._id} to={`/incidents/${i._id}`} style={{ textDecoration:'none', display:'block', marginBottom:'0.5rem' }}>
                <div className="card-sm" style={{ cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:'0.5rem' }}>
                    <span style={{ fontSize:'0.85rem', fontWeight:600, color:'#f0ede8', textTransform:'capitalize' }}>{i.fire_type} · {i.severity}</span>
                    <span style={{ fontSize:'0.72rem', color:'#555' }}>{fmtDate(i.reportedAt)}</span>
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'#666', marginTop:'0.2rem', textTransform:'capitalize' }}>{i.status} · AI Score: {i.ai_trust_score ?? '—'}%</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Forum posts */}
        {tab === 'forum' && (
          <div>
            {forumPosts.length === 0 && <div className="empty-state"><div className="empty-state-icon">💬</div><div>No forum posts.</div></div>}
            {forumPosts.map(p => (
              <Link key={p._id} to={`/forum/${p._id}`} style={{ textDecoration:'none', display:'block', marginBottom:'0.5rem' }}>
                <div className="card-sm">
                  <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#f0ede8', marginBottom:'0.2rem' }}>{p.title}</div>
                  <div style={{ fontSize:'0.72rem', color:'#555' }}>{fmtDate(p.createdAt)} · {p.replies?.length || 0} replies · {p.likes?.length || 0} likes</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Application */}
        {tab === 'application' && (
          <div>
            {!application && <div className="empty-state"><div className="empty-state-icon">📋</div><div>No application on record.</div></div>}
            {application && (
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem' }}>
                  <div style={{ fontWeight:600 }}>Responder Application</div>
                  <span style={{ fontSize:'0.72rem', padding:'0.15rem 0.6rem', borderRadius:999, fontWeight:700,
                    background: application.status==='approved'?'rgba(34,197,94,0.1)':application.status==='pending'?'rgba(244,130,10,0.1)':'rgba(230,60,47,0.1)',
                    color:      application.status==='approved'?'#22c55e':application.status==='pending'?'#f4820a':'#e63c2f',
                  }}>
                    {application.status}
                  </span>
                </div>
                <div className="two-col" style={{ fontSize:'0.82rem', gap:'0.75rem' }}>
                  <div><div style={{ color:'#555', fontSize:'0.7rem' }}>Phone</div>{application.phone}</div>
                  <div><div style={{ color:'#555', fontSize:'0.7rem' }}>Experience</div>{application.yearsExperience} years</div>
                  <div><div style={{ color:'#555', fontSize:'0.7rem' }}>Station</div>{application.preferredStation}</div>
                  <div><div style={{ color:'#555', fontSize:'0.7rem' }}>Availability</div>{application.availability?.replace(/_/g,' ')}</div>
                </div>
                <div style={{ marginTop:'0.75rem', fontSize:'0.82rem', color:'#666', lineHeight:1.6 }}>
                  <div style={{ color:'#555', fontSize:'0.7rem', marginBottom:'0.2rem' }}>Motivation</div>
                  {application.motivation}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit logs */}
        {tab === 'audit' && (
          <div>
            {auditLogs.length === 0 && <div className="empty-state"><div className="empty-state-icon">📜</div><div>No audit logs for this user.</div></div>}
            {auditLogs.map(l => (
              <div key={l._id} className="card-sm" style={{ marginBottom:'0.4rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:'0.5rem' }}>
                  <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#f4820a' }}>{l.action}</span>
                  <span style={{ fontSize:'0.7rem', color:'#555' }}>{fmtDate(l.createdAt)}</span>
                </div>
                <div style={{ fontSize:'0.78rem', color:'#666', marginTop:'0.2rem' }}>{l.details}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}