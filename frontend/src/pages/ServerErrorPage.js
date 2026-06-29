import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ServerErrorPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const dashLink   = user?.role === 'admin'     ? '/admin'
                   : user?.role === 'responder' ? '/responder'
                   : user                       ? '/dashboard'
                   : '/';

  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      textAlign:'center', padding:'2rem',
      background:'var(--bg-primary,#0a0a0a)',
    }}>
      <div style={{ fontSize:'4rem', marginBottom:'0.75rem' }}>💥</div>
      <h1 style={{
        fontFamily:"'Syne',sans-serif", fontWeight:800,
        fontSize:'2rem', color:'#f0ede8', margin:'0 0 0.5rem',
      }}>
        500 — Server Error
      </h1>
      <p style={{ color:'#555', fontSize:'0.9rem', marginBottom:'0.5rem' }}>
        Something went wrong on our end. This has been logged.
      </p>
      <p style={{ color:'#444', fontSize:'0.8rem', marginBottom:'2rem' }}>
        Try refreshing the page, or go back to safety.
      </p>
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', justifyContent:'center' }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding:'0.65rem 1.25rem', background:'transparent',
            border:'1px solid #2a2a2a', color:'#888',
            borderRadius:8, cursor:'pointer', fontSize:'0.875rem',
          }}
        >
          ↻ Refresh Page
        </button>
        <Link to={dashLink} style={{
          padding:'0.65rem 1.25rem',
          background:'linear-gradient(135deg,#e63c2f,#f4820a)',
          color:'#fff', borderRadius:8, textDecoration:'none',
          fontWeight:700, fontSize:'0.875rem',
        }}>
          ← Back to Safety
        </Link>
      </div>
    </div>
  );
}