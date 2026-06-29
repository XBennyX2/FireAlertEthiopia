import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  {
    icon: '🚨',
    title: 'Report a Fire',
    body: 'Tap "Report a Fire" to submit an incident with your GPS location, photos, and description. Our AI analyzes every report for credibility.',
    action: null,
  },
  {
    icon: '📍',
    title: 'Track in Real Time',
    body: 'Once your report is verified, you can watch the responder\'s live location on the map as they travel to the scene.',
    action: null,
  },
  {
    icon: '🔔',
    title: 'Get Notified',
    body: 'You\'ll receive instant notifications when your report is verified, when responders are dispatched, and when the incident is resolved.',
    action: null,
  },
  {
    icon: '🛡️',
    title: 'Safety Center',
    body: 'The Safety Center has emergency numbers, fire prevention tips, and community-submitted safety guides.',
    action: { label: 'Visit Safety Center', path: '/safety' },
  },
  {
    icon: '⭐',
    title: 'Your Reputation',
    body: 'Accurate reports earn reputation points. False reports reduce your score. Maintaining a high score keeps your account in good standing.',
    action: null,
  },
];

export default function OnboardingTour() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [step,     setStep]    = useState(0);
  const [visible,  setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const key = `onboarding_done_${user._id}`;
    if (!localStorage.getItem(key)) {
      setTimeout(() => setVisible(true), 800);
    }
  }, [user]);

  function finish() {
    const key = `onboarding_done_${user._id}`;
    localStorage.setItem(key, '1');
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:10000, padding:'1rem',
    }}>
      <div style={{
        background:'#111', border:'1px solid #2a2a2a',
        borderRadius:16, padding:'2rem', maxWidth:420, width:'100%',
        position:'relative',
      }}>
        {/* Close */}
        <button
          onClick={finish}
          style={{
            position:'absolute', top:12, right:12,
            background:'none', border:'none', color:'#444',
            fontSize:'1.25rem', cursor:'pointer', lineHeight:1,
          }}
        >×</button>

        {/* Progress dots */}
        <div style={{ display:'flex', gap:'6px', marginBottom:'1.5rem', justifyContent:'center' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 8, height:8,
              borderRadius:99, transition:'all 0.25s',
              background: i === step ? '#f4820a' : '#2a2a2a',
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>{current.icon}</div>
          <h2 style={{
            fontFamily:"'Syne',sans-serif", fontWeight:800,
            fontSize:'1.2rem', color:'#f0ede8', margin:'0 0 0.75rem',
          }}>
            {current.title}
          </h2>
          <p style={{ fontSize:'0.875rem', color:'#666', lineHeight:1.7, margin:0 }}>
            {current.body}
          </p>
        </div>

        {/* Optional action */}
        {current.action && (
          <button
            onClick={() => { finish(); navigate(current.action.path); }}
            style={{
              display:'block', width:'100%', padding:'0.65rem',
              background:'rgba(244,130,10,0.1)',
              border:'1px solid rgba(244,130,10,0.25)',
              borderRadius:8, color:'#f4820a', cursor:'pointer',
              fontSize:'0.82rem', fontWeight:600, marginBottom:'1rem',
            }}
          >
            {current.action.label} →
          </button>
        )}

        {/* Navigation */}
        <div style={{ display:'flex', gap:'0.5rem', justifyContent:'space-between', alignItems:'center' }}>
          <button
            onClick={prev}
            disabled={step === 0}
            style={{
              padding:'0.55rem 1rem', background:'transparent',
              border:'1px solid #2a2a2a', borderRadius:8,
              color: step === 0 ? '#333' : '#888', cursor: step === 0 ? 'default' : 'pointer',
              fontSize:'0.82rem',
            }}
          >
            ← Back
          </button>
          <span style={{ fontSize:'0.75rem', color:'#444' }}>
            {step + 1} / {STEPS.length}
          </span>
          <button
            onClick={next}
            style={{
              padding:'0.55rem 1.25rem',
              background:'linear-gradient(135deg,#e63c2f,#f4820a)',
              border:'none', borderRadius:8,
              color:'#fff', cursor:'pointer',
              fontSize:'0.82rem', fontWeight:700,
            }}
          >
            {isLast ? 'Get Started' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}