import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import API from '../api/axios';
import '../dashboard.css';

const CATEGORY_LABELS = {
  prevention:          '🔥 Fire Prevention',
  emergency_procedure: '🚨 Emergency Procedure',
  preparedness:        '🏠 Home Preparedness',
  contact:             '📞 Emergency Contacts',
};

const CATEGORY_COLORS = {
  prevention:          '#e63c2f',
  emergency_procedure: '#f4820a',
  preparedness:        '#3b82f6',
  contact:             '#22c55e',
};

const STATIC_CONTACTS = [
  { name: 'Addis Ababa Fire & Emergency',  number: '939',      desc: 'Main fire emergency line' },
  { name: 'Police Emergency',              number: '991',      desc: 'For law enforcement' },
  { name: 'Ambulance / Medical',           number: '907',      desc: 'Medical emergencies' },
  { name: 'Disaster Risk Management',      number: '011-1-23-83-87', desc: 'City disaster office' },
];

export default function SafetyPage() {
  const { user }  = useAuth();
  const { t }     = useLanguage();

  const [content,       setContent]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await API.get('/safety');
        setContent(data);
      } catch {
        // fail silently — static content still renders
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];

  const filtered = activeCategory === 'all'
    ? content
    : content.filter(c => c.category === activeCategory);

  const pinned   = filtered.filter(c => c.isPinned);
  const unpinned = filtered.filter(c => !c.isPinned);
  const displayed = [...pinned, ...unpinned];

  return (
    <div className="dash-page">

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">FireAlert</span>
        </Link>
        <div className="dash-topbar-right">
          <LanguageSwitcher />
          {user && (
            <Link
              to={user.role === 'admin' ? '/admin' : user.role === 'responder' ? '/responder' : '/dashboard'}
              className="btn-secondary"
              style={{ fontSize:'0.78rem' }}
            >
              ← Dashboard
            </Link>
          )}
          {!user && (
            <Link to="/login" className="btn-secondary" style={{ fontSize:'0.78rem' }}>Sign In</Link>
          )}
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth: 720 }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div style={{ marginBottom:'2rem', textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🛡️</div>
          <h1 style={{
            fontFamily:"'Syne',sans-serif", fontWeight:800,
            fontSize:'1.75rem', color:'#f0ede8', margin:'0 0 0.5rem',
          }}>
            Fire Safety Center
          </h1>
          <p style={{ color:'#666', fontSize:'0.9rem', lineHeight:1.6, maxWidth:480, margin:'0 auto' }}>
            Essential fire prevention tips, emergency procedures, and contacts for Addis Ababa.
          </p>
        </div>

        {/* ── Emergency contacts (always visible, static) ─────── */}
        <div className="card" style={{ marginBottom:'1.5rem', borderColor:'rgba(230,60,47,0.2)' }}>
          <div style={{
            fontFamily:"'Syne',sans-serif", fontWeight:800,
            fontSize:'1rem', color:'#e63c2f', marginBottom:'1rem',
          }}>
            🚨 Emergency Numbers — Call Immediately
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'0.75rem' }}>
            {STATIC_CONTACTS.map(c => (
              <div key={c.name} style={{
                background:'rgba(230,60,47,0.06)', border:'1px solid rgba(230,60,47,0.12)',
                borderRadius:8, padding:'0.75rem 1rem',
              }}>
                <div style={{
                  fontFamily:'monospace', fontWeight:800,
                  fontSize:'1.25rem', color:'#e63c2f', marginBottom:'0.2rem',
                }}>
                  {c.number}
                </div>
                <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#f0ede8', marginBottom:'0.15rem' }}>
                  {c.name}
                </div>
                <div style={{ fontSize:'0.72rem', color:'#555' }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Category filter pills ───────────────────────────── */}
        <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                fontSize:'0.78rem', padding:'0.3rem 0.8rem', borderRadius:999,
                border:'1px solid',
                borderColor: activeCategory === cat
                  ? (CATEGORY_COLORS[cat] || '#f4820a')
                  : '#2a2a2a',
                background: activeCategory === cat
                  ? `${CATEGORY_COLORS[cat] || '#f4820a'}18`
                  : 'transparent',
                color: activeCategory === cat
                  ? (CATEGORY_COLORS[cat] || '#f4820a')
                  : '#555',
                cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
                transition:'all 0.15s',
              }}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* ── Loading state ──────────────────────────────────── */}
        {loading && (
          <div className="loading-state">Loading safety content…</div>
        )}

        {/* ── Dynamic content from DB ────────────────────────── */}
        {!loading && displayed.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', marginBottom:'1.5rem' }}>
            {displayed.map(item => (
              <div key={item._id} className="card-sm" style={{
                borderLeft:`3px solid ${CATEGORY_COLORS[item.category] || '#f4820a'}`,
              }}>
                {item.isPinned && (
                  <div style={{ fontSize:'0.65rem', color:'#f4820a', fontWeight:700, marginBottom:'0.3rem' }}>
                    📌 PINNED
                  </div>
                )}
                <div style={{
                  fontSize:'0.78rem', color: CATEGORY_COLORS[item.category] || '#f4820a',
                  fontWeight:700, marginBottom:'0.3rem', textTransform:'uppercase',
                  letterSpacing:'0.05em',
                }}>
                  {CATEGORY_LABELS[item.category] || item.category}
                </div>
                <div style={{
                  fontWeight:600, fontSize:'0.9rem',
                  color:'var(--text-primary)', marginBottom:'0.5rem',
                }}>
                  {item.title}
                </div>
                <div style={{
                  fontSize:'0.82rem', color:'var(--text-muted)',
                  lineHeight:1.7, whiteSpace:'pre-line',
                }}>
                  {item.body}
                </div>
                <div style={{ fontSize:'0.68rem', color:'#333', marginTop:'0.6rem' }}>
                  By {item.author?.name} · {new Date(item.publishedAt || item.createdAt).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state (no community content yet) ─────────── */}
        {!loading && displayed.length === 0 && (
          <div className="empty-state" style={{ marginBottom:'1.5rem' }}>
            <div className="empty-state-icon">📋</div>
            <div>No published safety content in this category yet.</div>
            {user?.role === 'responder' && (
              <Link to="/safety-content" className="btn-secondary" style={{ marginTop:'0.75rem', fontSize:'0.78rem' }}>
                + Submit Safety Content
              </Link>
            )}
          </div>
        )}

        {/* ── Static prevention tips (always shown) ──────────── */}
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', marginBottom:'1rem', color:'#f0ede8' }}>
            🔥 Core Fire Prevention Tips
          </div>
          {[
            { tip:'Never leave cooking fires unattended.', detail:'Kitchen fires are the leading cause of residential fires in Addis Ababa.' },
            { tip:'Keep fire extinguishers accessible.', detail:'Mount one in the kitchen and check its pressure gauge monthly.' },
            { tip:'Test smoke alarms regularly.', detail:'Press the test button monthly and replace batteries annually.' },
            { tip:'Have a family evacuation plan.', detail:'Identify two exits from every room and a meeting point outside.' },
            { tip:'Avoid overloading electrical sockets.', detail:'Electrical faults cause a significant share of urban fires.' },
            { tip:'Store flammable materials safely.', detail:'Keep fuel, charcoal, and gas cylinders away from heat sources and in ventilated areas.' },
          ].map(({ tip, detail }) => (
            <div key={tip} style={{
              display:'flex', gap:'0.75rem',
              padding:'0.75rem 0',
              borderBottom:'1px solid #111',
            }}>
              <div style={{ color:'#f4820a', fontSize:'1rem', flexShrink:0, marginTop:'0.05rem' }}>⚠</div>
              <div>
                <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#f0ede8', marginBottom:'0.2rem' }}>{tip}</div>
                <div style={{ fontSize:'0.78rem', color:'#666', lineHeight:1.55 }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── What to do in a fire ────────────────────────────── */}
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', marginBottom:'1rem', color:'#f0ede8' }}>
            🚒 What To Do If You See a Fire
          </div>
          {[
            { step:'1', action:'Call 939 immediately.', detail:'Give your exact location, describe the fire size, and stay on the line if safe.' },
            { step:'2', action:'Alert everyone nearby.', detail:'Shout clearly — do not assume others know.' },
            { step:'3', action:'Evacuate — do not use the elevator.', detail:'Crawl low if there is smoke. Close doors behind you to slow the fire.' },
            { step:'4', action:'Report via FireAlert.', detail:'Open the app and submit a report with your GPS location to help responders.' },
            { step:'5', action:'Do not re-enter the building.', detail:'Wait for fire responders to declare the building safe.' },
          ].map(({ step, action, detail }) => (
            <div key={step} style={{ display:'flex', gap:'0.85rem', padding:'0.75rem 0', borderBottom:'1px solid #111' }}>
              <div style={{
                width:24, height:24, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg,#e63c2f,#f4820a)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.72rem', fontWeight:800, color:'#fff', marginTop:'0.05rem',
              }}>
                {step}
              </div>
              <div>
                <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#f0ede8', marginBottom:'0.2rem' }}>{action}</div>
                <div style={{ fontSize:'0.78rem', color:'#666', lineHeight:1.55 }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── CTA for responders ─────────────────────────────── */}
        {user?.role === 'responder' && (
          <div style={{
            background:'rgba(244,130,10,0.08)', border:'1px solid rgba(244,130,10,0.2)',
            borderRadius:10, padding:'1rem 1.25rem', marginBottom:'1.5rem',
            display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem', flexWrap:'wrap',
          }}>
            <div>
              <div style={{ fontWeight:700, fontSize:'0.875rem', marginBottom:'0.2rem' }}>
                Share your expertise
              </div>
              <div style={{ fontSize:'0.78rem', color:'#666' }}>
                Submit safety tips and procedures for admin review.
              </div>
            </div>
            <Link to="/safety-content" className="btn-primary" style={{ fontSize:'0.78rem', flexShrink:0 }}>
              + Create Content
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}