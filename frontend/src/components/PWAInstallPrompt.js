import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [prompt,   setPrompt]   = useState(null);
  const [visible,  setVisible]  = useState(false);
  const [installed,setInstalled]= useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      // Show after a 3s delay — don't interrupt immediately
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setVisible(false);
    setPrompt(null);
  }

  if (!visible || installed) return null;

  return (
    <div style={{
      position:'fixed', bottom:70, left:'50%', transform:'translateX(-50%)',
      background:'#111', border:'1px solid #2a2a2a',
      borderRadius:12, padding:'1rem 1.25rem',
      display:'flex', alignItems:'center', gap:'1rem',
      zIndex:9000, boxShadow:'0 4px 24px rgba(0,0,0,0.6)',
      maxWidth:360, width:'calc(100% - 2rem)',
    }}>
      <div style={{ fontSize:'1.75rem', flexShrink:0 }}>🔥</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'0.85rem', fontWeight:700, color:'#f0ede8', marginBottom:'0.2rem' }}>
          Install FireAlert
        </div>
        <div style={{ fontSize:'0.75rem', color:'#666', lineHeight:1.4 }}>
          Add to your home screen for faster access and offline support.
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', flexShrink:0 }}>
        <button
          onClick={handleInstall}
          style={{
            padding:'0.4rem 0.85rem', background:'#f4820a',
            border:'none', borderRadius:6, color:'#fff',
            fontSize:'0.75rem', fontWeight:700, cursor:'pointer',
          }}
        >
          Install
        </button>
        <button
          onClick={() => setVisible(false)}
          style={{
            padding:'0.4rem 0.85rem', background:'transparent',
            border:'1px solid #2a2a2a', borderRadius:6, color:'#555',
            fontSize:'0.75rem', cursor:'pointer',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}