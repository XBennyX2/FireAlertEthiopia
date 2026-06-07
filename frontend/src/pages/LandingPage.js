import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

// ── Inline styles object ──────────────────────────────────────────────────────
// Kept here to avoid a separate CSS file. Every style is intentional.
const S = {
  // Page wrapper
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
    padding: '1.25rem 3rem',
    borderBottom: '1px solid #1a1a1a',
    position: 'sticky',
    top: 0,
    backgroundColor: 'rgba(10,10,10,0.92)',
    backdropFilter: 'blur(12px)',
    zIndex: 100,
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
    gap: '0.75rem',
  },
  navLinkGhost: {
    padding: '0.5rem 1.1rem',
    color: '#888',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: 7,
    transition: 'color 0.2s',
  },
  navLinkSolid: {
    padding: '0.5rem 1.25rem',
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
    padding: '7rem 2rem 5rem',
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
    fontSize: 'clamp(2.5rem, 7vw, 5rem)',
    lineHeight: 1.03,
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
    padding: '5rem 2rem',
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
    fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
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
    padding: '3rem 2rem',
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
    padding: '1.5rem 3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  footerText: {
    fontSize: '0.78rem',
    color: '#444',
  },
};

// ── Google Fonts loader (injected once) ──────────────────────────────────────
if (!document.getElementById('landing-fonts')) {
  const link = document.createElement('link');
  link.id   = 'landing-fonts';
  link.rel  = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap';
  document.head.appendChild(link);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  // If the user is already logged in, show a link to their dashboard
  const dashboardLink =
    user?.role === 'admin'     ? '/admin'     :
    user?.role === 'responder' ? '/responder' : '/dashboard';

  // Localized Step data array mapping directly to translation keys
  const HOW_IT_WORKS = [
    { num: '01', title: t.step1Title, desc: t.step1Desc },
    { num: '02', title: t.step2Title, desc: t.step2Desc },
    { num: '03', title: t.step3Title, desc: t.step3Desc },
    { num: '04', title: t.step4Title, desc: t.step4Desc },
  ];

  return (
    <div style={S.page}>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav style={S.nav}>
        <Link to="/" style={S.navLogo}>
          <div style={S.navLogoIcon}>🔥</div>
          <span style={S.navLogoText}>{t.appName}</span>
        </Link>

        <div style={S.navLinks}>
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
      <section style={S.hero}>
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
            <Link to={dashboardLink} style={S.ctaPrimary}>{t.dashboard} →</Link>
          ) : (
            <Link to="/register" style={S.ctaPrimary}>{t.reportFire}</Link>
          )}
          <Link to="/safety" style={S.ctaSecondary}>{t.learnSafety}</Link>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section style={S.steps}>
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
        <div style={S.ctaBanner}>
          <h2 style={S.ctaBannerTitle}>{t.ctaBannerTitle}</h2>
          <p style={S.ctaBannerSub}>
            {t.ctaBannerSub}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {!user && (
              <Link to="/register" style={S.ctaPrimary}>={t.createAccount}</Link>
            )}
            <Link to="/safety" style={S.ctaSecondary}>{t.safetyTips}</Link>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={S.footer}>
        <span style={S.footerText}>{t.footerLeft}</span>
        <span style={S.footerText}>{t.footerRight}</span>
      </footer>

    </div>
  );
}