import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import '../dashboard.css';

export default function SafetyAwarenessPage() {
  const { t } = useLanguage();

  // Pull arrays from translations so they switch with the language
  const PREVENTION_TIPS   = t.preventionTips;
  const DURING_FIRE_STEPS = t.duringFireSteps;
  const CONTACTS          = t.emergencyContacts;

  return (
    <div className="dash-page">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">{t.appName}</span>
        </Link>
        <div className="dash-topbar-right">
          <LanguageSwitcher />
          <Link to="/login"    className="btn-secondary" style={{ fontSize:'0.8rem', padding:'0.4rem 0.9rem' }}>{t.signIn}</Link>
          <Link to="/register" className="btn-primary"   style={{ fontSize:'0.8rem', padding:'0.4rem 1rem'  }}>{t.getStarted}</Link>
        </div>
      </nav>

      <div className="dash-content">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div style={{ textAlign:'center', padding:'2rem 1rem 3.5rem', borderBottom:'1px solid var(--border)', marginBottom:'3rem' }}>
          <div style={{ display:'inline-block', padding:'0.35rem 1rem', borderRadius:999, background:'rgba(230,60,47,0.1)', border:'1px solid rgba(230,60,47,0.2)', fontSize:'0.72rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#f87c74', marginBottom:'1.25rem' }}>
            {t.safetyHeroBadge}
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'clamp(1.75rem,4vw,2.75rem)', letterSpacing:'-0.03em', color:'var(--text-primary)', margin:'0 0 0.75rem' }}>
            {t.safetyHeroTitle}
          </h1>
          <p style={{ color:'var(--text-muted)', fontSize:'1rem', maxWidth:520, margin:'0 auto' }}>
            {t.safetyHeroSub}
          </p>
        </div>

        {/* ── Prevention Tips ──────────────────────────────────── */}
        <div style={{ marginBottom:'3.5rem' }}>
          <div className="section-label">{t.preventionLabel}</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.375rem', letterSpacing:'-0.02em', color:'var(--text-primary)', margin:'0 0 1.5rem' }}>
            {t.preventionTitle}
          </h2>
          <div className="incident-grid">
            {PREVENTION_TIPS.map((tip, i) => (
              <div key={i} className="card" style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                <div style={{ fontSize:'1.5rem' }}>{tip.icon}</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'0.9375rem', color:'var(--text-primary)' }}>
                  {tip.title}
                </div>
                <div style={{ fontSize:'0.84rem', color:'var(--text-muted)', lineHeight:1.65 }}>
                  {tip.body}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── During a Fire ────────────────────────────────────── */}
        <div style={{ marginBottom:'3.5rem' }}>
          <div className="section-label">{t.duringFireLabel}</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.375rem', letterSpacing:'-0.02em', color:'var(--text-primary)', margin:'0 0 1.5rem' }}>
            {t.duringFireTitle}
          </h2>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {DURING_FIRE_STEPS.map((step, i) => (
              <div
                key={i}
                style={{
                  display:      'flex',
                  alignItems:   'flex-start',
                  gap:          '1.25rem',
                  padding:      '1.1rem 1.5rem',
                  borderBottom: i < DURING_FIRE_STEPS.length - 1 ? '1px solid var(--border)' : 'none'
                }}
              >
                <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'var(--fire-orange)', minWidth:30, letterSpacing:'-0.02em' }}>
                  {step.num}
                </span>
                <span style={{ fontSize:'0.9rem', color:'var(--text-primary)', lineHeight:1.6 }}>
                  {step.instruction}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Emergency Contacts ───────────────────────────────── */}
        <div style={{ marginBottom:'3.5rem' }}>
          <div className="section-label">{t.contactsLabel}</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.375rem', letterSpacing:'-0.02em', color:'var(--text-primary)', margin:'0 0 1.5rem' }}>
            {t.contactsTitle}
          </h2>
          <div className="two-col">
            {CONTACTS.map((c, i) => (
              <div key={i} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem' }}>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'0.9rem', color:'var(--text-primary)', marginBottom:'0.2rem' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                    {c.desc}
                  </div>
                </div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.375rem', color:'var(--fire-orange)', letterSpacing:'-0.02em' }}>
                  {c.number}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <div style={{ textAlign:'center', padding:'2.5rem', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, marginBottom:'2rem' }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.25rem', letterSpacing:'-0.02em', color:'var(--text-primary)', margin:'0 0 0.5rem' }}>
            {t.safetyCtaTitle}
          </h3>
          <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', margin:'0 0 1.5rem' }}>
            {t.safetyCtaSub}
          </p>
          <Link to="/register" className="btn-primary">{t.createAccount} →</Link>
        </div>

      </div>
    </div>
  );
}