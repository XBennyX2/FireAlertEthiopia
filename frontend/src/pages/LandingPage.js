import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

// ── Inline styles object ──────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#f0ede8',
    fontFamily: "'DM Sans', sans-serif",
    overflowX: 'hidden',
  },

  // ── Navbar ──
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    backgroundColor: 'rgba(10,10,10,0.92)',
    backdropFilter: 'blur(12px)',
    zIndex: 100,
    borderBottom: '1px solid #1a1a1a',
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    textDecoration: 'none',
  },
  navLogoIcon: {
    width: 34,
    height: 34,
    background: 'linear-gradient(135deg, #e63c2f, #f4820a)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
  },
  navLogoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: '1rem',
    color: '#f0ede8',
    letterSpacing: '-0.02em',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem', 
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  navLinkGhost: {
    padding: '0.5rem 0.85rem',
    color: '#888',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: 7,
    transition: 'color 0.2s',
  },
  navLinkSolid: {
    padding: '0.5rem 1.1rem',
    background: 'linear-gradient(135deg, #e63c2f, #f4820a)',
    color: '#fff',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 700,
    fontFamily: "'Syne', sans-serif",
    borderRadius: 7,
    letterSpacing: '0.01em',
  },

  // ── Hero ──
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    position: 'relative',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.35rem 0.9rem',
    backgroundColor: 'rgba(230,60,47,0.12)',
    border: '1px solid rgba(230,60,47,0.25)',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#f87c74',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: '1.75rem',
  },
  heroTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 'clamp(2.2rem, 7vw, 4.5rem)', // Tailored clamp for extra safety on small screens
    lineHeight: 1.1,
    letterSpacing: '-0.04em',
    color: '#f0ede8',
    margin: '0 0 1.25rem',
    maxWidth: 780,
  },
  heroTitleAccent: {
    background: 'linear-gradient(90deg, #e63c2f, #f4820a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSubtitle: {
    fontSize: '1.0625rem',
    color: '#888',
    maxWidth: 520,
    lineHeight: 1.65,
    margin: '0 0 2.5rem',
  },
  heroCtas: {
    display: 'flex',
    gap: '0.85rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%', // Ensures full width utility for responsive centering
  },
  ctaPrimary: {
    padding: '0.9rem 2.25rem',
    background: 'linear-gradient(135deg, #e63c2f, #f4820a)',
    color: '#fff',
    textDecoration: 'none',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: '0.9375rem',
    borderRadius: 9,
    letterSpacing: '0.01em',
    transition: 'opacity 0.2s, transform 0.15s',
    display: 'inline-block',
  },
  ctaSecondary: {
    padding: '0.9rem 2.25rem',
    backgroundColor: 'transparent',
    color: '#f0ede8',
    textDecoration: 'none',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 600,
    fontSize: '0.9375rem',
    borderRadius: 9,
    border: '1px solid #2a2a2a',
    letterSpacing: '0.01em',
    display: 'inline-block',
    transition: 'border-color 0.2s',
  },

  // ── Steps section ──
  steps: {
    borderTop: '1px solid #1a1a1a',
    maxWidth: 960,
    margin: '0 auto',
  },
  stepsLabel: {
    textAlign: 'center',
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#444',
    marginBottom: '0.75rem',
  },
  stepsTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
    letterSpacing: '-0.03em',
    color: '#f0ede8',
    textAlign: 'center',
    margin: '0 0 3.5rem',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
  },
  stepCard: {
    backgroundColor: '#111',
    border: '1px solid #1e1e1e',
    borderRadius: 12,
    padding: '1.75rem 1.5rem',
  },
  stepNum: {
    width: 36,
    height: 36,
    background: 'linear-gradient(135deg, #e63c2f, #f4820a)',
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: '0.875rem',
    color: '#fff',
    marginBottom: '1rem',
  },
  stepTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: '0.9375rem',
    color: '#f0ede8',
    marginBottom: '0.4rem',
  },
  stepDesc: {
    fontSize: '0.85rem',
    color: '#666',
    lineHeight: 1.6,
  },

  // ── CTA Banner ──
  ctaBanner: {
    margin: '2rem auto 6rem',
    maxWidth: 700,
    textAlign: 'center',
    backgroundColor: '#111',
    border: '1px solid #1e1e1e',
    borderRadius: 16,
  },
  ctaBannerTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
    letterSpacing: '-0.03em',
    color: '#f0ede8',
    margin: '0 0 0.5rem',
  },
  ctaBannerSub: {
    color: '#666',
    fontSize: '0.875rem',
    margin: '0 0 1.75rem',
  },

  // ── Footer ──
  footer: {
    borderTop: '1px solid #1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  footerText: {
    fontSize: '0.78rem',
    color: '#444',
  },
};

// ── Google Fonts loader ──────────────────────────────────────────────────────
if (!document.getElementById('landing-fonts')) {
  const link = document.createElement('link');
  link.id   = 'landing-fonts';
  link.rel  = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap';
  document.head.appendChild(link);
}

// ── Responsive CSS Injection ──────────────────────────────────────────────────
// This seamlessly maps responsive values to classes we apply below.
if (!document.getElementById('responsive-styles')) {
  const style = document.createElement('style');
  style.id = 'responsive-styles';
  style.innerHTML = `
    /* Desktop Spacing */
    .responsive-nav { padding: 1.25rem 3rem; }
    .responsive-hero { padding: 7rem 2rem 5rem; }
    .responsive-steps { padding: 5rem 2rem; }
    .responsive-cta-banner { padding: 3rem 2rem; }
    .responsive-footer { padding: 1.5rem 3rem; }

    /* Mobile Adaptations */
    @media (max-width: 768px) {
      .responsive-nav { 
        padding: 1rem 1.5rem; 
        flex-direction: column; 
        gap: 1rem;
        align-items: center;
      }
      .responsive-nav-links {
        justify-content: center !important;
        width: 100%;
      }
      .responsive-hero { padding: 4rem 1.25rem 3rem; }
      .responsive-steps { padding: 3.5rem 1.25rem; }
      .responsive-cta-banner { padding: 2.5rem 1.25rem; margin-bottom: 4rem !important; }
      .responsive-footer { 
        padding: 1.5rem 1.5rem; 
        flex-direction: column; 
        text-align: center; 
      }
      .responsive-cta-btn {
        width: 100%;
        text-align: center;
      }
    }
  `;
  document.head.appendChild(style);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const dashboardLink =
    user?.role === 'admin'     ? '/admin'     :
    user?.role === 'responder' ? '/responder' : '/dashboard';

  const HOW_IT_WORKS = [
    { num: '01', title: t.step1Title, desc: t.step1Desc },
    { num: '02', title: t.step2Title, desc: t.step2Desc },
    { num: '03', title: t.step3Title, desc: t.step3Desc },
    { num: '04', title: t.step4Title, desc: t.step4Desc },
  ];

  return (
    <div style={S.page}>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav style={S.nav} className="responsive-nav">
        <Link to="/" style={S.navLogo}>
          <div style={S.navLogoIcon}>🔥</div>
          <span style={S.navLogoText}>{t.appName}</span>
        </Link>

        <div style={S.navLinks} className="responsive-nav-links">
          <LanguageSwitcher />
          <Link to="/safety" style={S.navLinkGhost}>{t.safetyTips}</Link>

          {user ? (
            <Link to={dashboardLink} style={S.navLinkSolid}>{t.dashboard}</Link>
          ) : (
            <>
              <Link to="/login"    style={S.navLinkGhost}>{t.signIn}</Link>
              <Link to="/register" style={S.navLinkSolid}>{t.getStarted}</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section style={S.hero} className="responsive-hero">
        <div style={S.heroBadge}>
          🔥 {t.heroBadge}
        </div>

        <h1 style={S.heroTitle}>
          {t.heroTitle1}<br />
          <span style={S.heroTitleAccent}>{t.heroTitle2}</span>
        </h1>

        <p style={S.heroSubtitle}>
          {t.heroSubtitle}
        </p>

        <div style={S.heroCtas}>
          {user ? (
            <Link to={dashboardLink} style={S.ctaPrimary} className="responsive-cta-btn">{t.dashboard} →</Link>
          ) : (
            <Link to="/register" style={S.ctaPrimary} className="responsive-cta-btn">{t.reportFire}</Link>
          )}

          {!user && (
            <Link to="/report-guest" style={S.ctaPrimary} className="responsive-cta-btn">
              🚨 Report a Fire Now
            </Link>
          )}

          <Link to="/safety" style={S.ctaSecondary} className="responsive-cta-btn">{t.learnSafety}</Link>
        </div>

        {!user && (
          <p style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.75rem' }}>
            No account needed — just your email and phone number.
          </p>
        )}
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section style={S.steps} className="responsive-steps">
        <p style={S.stepsLabel}>{t.howItWorksLabel}</p>
        <h2 style={S.stepsTitle}>{t.howItWorksTitle}</h2>

        <div style={S.stepsGrid}>
          {HOW_IT_WORKS.map(step => (
            <div key={step.num} style={S.stepCard}>
              <div style={S.stepNum}>{step.num}</div>
              <div style={S.stepTitle}>{step.title}</div>
              <div style={S.stepDesc}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <div style={{ padding: '0 2rem' }}>
        <div style={S.ctaBanner} className="responsive-cta-banner">
          <h2 style={S.ctaBannerTitle}>{t.ctaBannerTitle}</h2>
          <p style={S.ctaBannerSub}>
            {t.ctaBannerSub}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {!user && (
              <Link to="/register" style={S.ctaPrimary} className="responsive-cta-btn">{t.createAccount}</Link>
            )}
            <Link to="/safety" style={S.ctaSecondary} className="responsive-cta-btn">{t.safetyTips}</Link>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={S.footer} className="responsive-footer">
        <span style={S.footerText}>{t.footerLeft}</span>
        <span style={S.footerText}>{t.footerRight}</span>
      </footer>

    </div>
  );
}