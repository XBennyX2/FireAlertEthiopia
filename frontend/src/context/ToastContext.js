import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();

    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Convenience helpers
  const toast = {
    success: (msg, duration)  => addToast(msg, 'success', duration),
    error:   (msg, duration)  => addToast(msg, 'error',   duration),
    warning: (msg, duration)  => addToast(msg, 'warning', duration),
    info:    (msg, duration)  => addToast(msg, 'info',    duration),
  };

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ── Toast Container — renders all active toasts ───────────────────
function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  // Inject animation once
  if (!document.getElementById('toast-style')) {
    const style       = document.createElement('style');
    style.id          = 'toast-style';
    style.textContent = `
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(100%); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes toastOut {
        from { opacity: 1; transform: translateX(0); }
        to   { opacity: 0; transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  }

  const CONFIG = {
    success: { icon:'✅', color:'#22c55e', bg:'rgba(34,197,94,0.12)',  border:'rgba(34,197,94,0.25)'  },
    error:   { icon:'❌', color:'#e63c2f', bg:'rgba(230,60,47,0.12)',  border:'rgba(230,60,47,0.25)'  },
    warning: { icon:'⚠️', color:'#f4820a', bg:'rgba(244,130,10,0.12)', border:'rgba(244,130,10,0.25)' },
    info:    { icon:'ℹ️', color:'#3b82f6', bg:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.25)' },
  };

  return (
    <div style={{
      position:   'fixed',
      bottom:     '1.5rem',
      right:      '1.5rem',
      zIndex:     9999,
      display:    'flex',
      flexDirection: 'column',
      gap:        '0.6rem',
      maxWidth:   360,
      width:      'calc(100vw - 3rem)',
    }}>
      {toasts.map(toast => {
        const cfg = CONFIG[toast.type] || CONFIG.info;
        return (
          <div
            key={toast.id}
            style={{
              display:      'flex',
              alignItems:   'flex-start',
              gap:          '0.65rem',
              padding:      '0.85rem 1rem',
              background:   cfg.bg,
              border:       `1px solid ${cfg.border}`,
              borderRadius: 10,
              animation:    'toastIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
              backdropFilter: 'blur(8px)',
              boxShadow:    '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ fontSize:'1rem', flexShrink:0 }}>{cfg.icon}</span>
            <span style={{
              flex:       1,
              fontSize:   '0.8375rem',
              color:      '#f0ede8',
              lineHeight: 1.5,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border:     'none',
                color:      '#555',
                cursor:     'pointer',
                fontSize:   '0.9rem',
                padding:    '0',
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}