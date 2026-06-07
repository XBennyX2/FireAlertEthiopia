import { useState, useCallback } from 'react';
import useVoiceRecognition from '../hooks/useVoiceRecognition';

// Pulse animation — injected once
if (!document.getElementById('voice-style')) {
  const style       = document.createElement('style');
  style.id          = 'voice-style';
  style.textContent = `
    @keyframes pulse-ring {
      0%   { transform: scale(1);    opacity: 0.6; }
      50%  { transform: scale(1.35); opacity: 0;   }
      100% { transform: scale(1);    opacity: 0;   }
    }
    @keyframes voice-fadein {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0);   }
    }
  `;
  document.head.appendChild(style);
}

const PROMPTS = {
  en: [
    'Say something like:',
    '"Large fire in a residential building on Bole Road, heavy smoke on the third floor"',
    '"Car fire near the Mercato market, flames visible"',
    '"Factory fire with workers inside, send help immediately"',
  ],
  am: [
    'እንደዚህ ይበሉ:',
    '"በቦሌ መንገድ ላይ በሚገኝ መኖሪያ ህንፃ ውስጥ ትልቅ እሳት፣ ሶስተኛ ፎቅ ላይ ከባድ ጭስ"',
    '"በመርካቶ አቅራቢያ የመኪና እሳት፣ ነበልባሎች ይታያሉ"',
    '"ሰራተኞች ያሉበት ፋብሪካ እሳት፣ ወዲያውኑ እርዳታ ላኩ"',
  ],
};

export default function VoiceReportButton({ language = 'en', onFieldsFilled }) {
  const [open,      setOpen]      = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [liveText,  setLiveText]  = useState('');
  const [done,      setDone]      = useState(false);

  const handleResult = useCallback((result) => {
  if (!result) return;

  const { transcript, fields } = result;

  if (transcript) setLiveText(transcript);
  setDone(true);

  // Pass the full result object so ReportForm can handle it safely
  onFieldsFilled?.(result);
}, [onFieldsFilled]);

  const handleError = useCallback((msg) => {
    setVoiceError(msg);
  }, []);

  const { listening, transcript, supported, start, stop } =
    useVoiceRecognition({ language, onResult: handleResult, onError: handleError });

  // Keep live text updated during interim results
  if (transcript && transcript !== liveText && !done) {
    setLiveText(transcript);
  }

  function handleOpen() {
    setOpen(true);
    setVoiceError('');
    setLiveText('');
    setDone(false);
  }

  function handleClose() {
    stop();
    setOpen(false);
    setVoiceError('');
    setLiveText('');
    setDone(false);
  }

  function handleTryAgain() {
    setVoiceError('');
    setLiveText('');
    setDone(false);
    start();
  }

  const prompts = PROMPTS[language] || PROMPTS.en;

  // ── Styles ──────────────────────────────────────────────────────
  const S = {
    triggerBtn: {
      display:        'flex',
      alignItems:     'center',
      gap:            '0.5rem',
      padding:        '0.7rem 1.25rem',
      background:     'rgba(230,60,47,0.08)',
      border:         '1px solid rgba(230,60,47,0.25)',
      borderRadius:   9,
      color:          '#f87c74',
      fontSize:       '0.875rem',
      fontWeight:     600,
      fontFamily:     "'DM Sans', sans-serif",
      cursor:         'pointer',
      transition:     'background 0.2s, border-color 0.2s',
      width:          '100%',
      justifyContent: 'center',
    },
    overlay: {
      position:       'fixed',
      inset:          0,
      background:     'rgba(0,0,0,0.75)',
      zIndex:         300,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '1rem',
    },
    modal: {
      background:     '#111',
      border:         '1px solid #2a2a2a',
      borderRadius:   16,
      padding:        '2rem',
      width:          '100%',
      maxWidth:       480,
      animation:      'voice-fadein 0.2s ease both',
    },
    modalTitle: {
      fontFamily:     "'Syne', sans-serif",
      fontWeight:     800,
      fontSize:       '1.25rem',
      color:          '#f0ede8',
      marginBottom:   '0.35rem',
      letterSpacing:  '-0.02em',
    },
    modalSub: {
      fontSize:       '0.8rem',
      color:          '#555',
      marginBottom:   '1.75rem',
    },
    micWrap: {
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            '1.25rem',
      marginBottom:   '1.75rem',
    },
    micOuter: {
      position:       'relative',
      width:          80,
      height:         80,
    },
    pulseRing: {
      position:       'absolute',
      inset:          -8,
      borderRadius:   '50%',
      border:         '2px solid #e63c2f',
      animation:      'pulse-ring 1.4s ease-out infinite',
    },
    micBtn: (active) => ({
      width:          80,
      height:         80,
      borderRadius:   '50%',
      background:     active
        ? 'linear-gradient(135deg, #e63c2f, #f4820a)'
        : '#1e1e1e',
      border:         active ? 'none' : '1px solid #2a2a2a',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontSize:       '1.75rem',
      cursor:         'pointer',
      transition:     'background 0.25s',
      position:       'relative',
      zIndex:         1,
    }),
    statusText: {
      fontSize:       '0.8125rem',
      color:          listening ? '#f4820a' : '#555',
      fontWeight:     listening ? 600 : 400,
      fontFamily:     "'DM Sans', sans-serif",
    },
    liveBox: {
      background:     '#0e0e0e',
      border:         '1px solid #1e1e1e',
      borderRadius:   10,
      padding:        '1rem',
      minHeight:      72,
      fontSize:       '0.9rem',
      color:          done ? '#f0ede8' : '#888',
      lineHeight:     1.6,
      marginBottom:   '1.25rem',
      fontStyle:      liveText ? 'normal' : 'italic',
      transition:     'color 0.2s',
    },
    promptBox: {
      background:     '#0a0a0a',
      border:         '1px solid #1a1a1a',
      borderRadius:   10,
      padding:        '0.85rem 1rem',
      marginBottom:   '1.5rem',
    },
    promptTitle: {
      fontSize:       '0.72rem',
      fontWeight:     600,
      color:          '#444',
      textTransform:  'uppercase',
      letterSpacing:  '0.06em',
      marginBottom:   '0.5rem',
    },
    promptItem: {
      fontSize:       '0.78rem',
      color:          '#555',
      lineHeight:     1.6,
      marginBottom:   '0.2rem',
      fontStyle:      'italic',
    },
    errorBox: {
      background:     'rgba(230,60,47,0.08)',
      border:         '1px solid rgba(230,60,47,0.2)',
      borderRadius:   8,
      padding:        '0.75rem 1rem',
      fontSize:       '0.8rem',
      color:          '#f87c74',
      marginBottom:   '1rem',
    },
    btnRow: {
      display:        'flex',
      gap:            '0.6rem',
    },
    btnPrimary: {
      flex:           1,
      padding:        '0.7rem',
      background:     'linear-gradient(135deg, #e63c2f, #f4820a)',
      color:          '#fff',
      border:         'none',
      borderRadius:   8,
      fontFamily:     "'Syne', sans-serif",
      fontWeight:     700,
      fontSize:       '0.875rem',
      cursor:         'pointer',
    },
    btnSecondary: {
      flex:           1,
      padding:        '0.7rem',
      background:     'transparent',
      color:          '#666',
      border:         '1px solid #2a2a2a',
      borderRadius:   8,
      fontFamily:     "'DM Sans', sans-serif",
      fontWeight:     500,
      fontSize:       '0.875rem',
      cursor:         'pointer',
    },
  };

  if (!supported) {
    return (
      <div style={{ padding:'0.75rem 1rem', background:'rgba(244,130,10,0.08)', border:'1px solid rgba(244,130,10,0.2)', borderRadius:8, fontSize:'0.8rem', color:'#f4820a' }}>
        ⚠️ Voice recognition is not supported in this browser. Please use Chrome or Edge.
      </div>
    );
  }

  return (
    <>
      {/* ── Trigger Button ───────────────────────────────────── */}
      <button
        type="button"
        style={S.triggerBtn}
        onClick={handleOpen}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(230,60,47,0.14)'}
        onMouseOut={e  => e.currentTarget.style.background = 'rgba(230,60,47,0.08)'}
      >
        🎙️ {language === 'am' ? 'በድምፅ ሪፖርት ያድርጉ' : 'Report by Voice'}
      </button>

      {/* ── Modal ────────────────────────────────────────────── */}
      {open && (
        <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
          <div style={S.modal}>

            {/* Header */}
            <div style={S.modalTitle}>
              🎙️ {language === 'am' ? 'የድምፅ ሪፖርት' : 'Voice Report'}
            </div>
            <div style={S.modalSub}>
              {language === 'am'
                ? 'ማይክሮፎኑን ጠቅ ያድርጉ እና ሪፖርቱን በድምፅ ይናገሩ'
                : 'Tap the microphone and describe the fire incident out loud'}
            </div>

            {/* Mic button */}
            <div style={S.micWrap}>
              <div style={S.micOuter}>
                {listening && <div style={S.pulseRing} />}
                <button
                  type="button"
                  style={S.micBtn(listening)}
                  onClick={listening ? stop : start}
                >
                  {listening ? '⏹' : '🎙️'}
                </button>
              </div>
              <span style={S.statusText}>
                {listening
                  ? (language === 'am' ? 'በማዳመጥ ላይ…' : 'Listening…')
                  : done
                    ? (language === 'am' ? 'ተጠናቋል ✓' : 'Done ✓')
                    : (language === 'am' ? 'ለመጀመር ጠቅ ያድርጉ' : 'Tap to start')}
              </span>
            </div>

            {/* Live transcript box */}
            <div style={S.liveBox}>
              {liveText
                ? liveText
                : (language === 'am'
                    ? 'ድምፅዎ እዚህ ይታያል…'
                    : 'Your speech will appear here…')}
            </div>

            {/* Example prompts */}
            {!listening && !done && (
              <div style={S.promptBox}>
                <div style={S.promptTitle}>{prompts[0]}</div>
                {prompts.slice(1).map((p, i) => (
                  <div key={i} style={S.promptItem}>"{p}"</div>
                ))}
              </div>
            )}

            {/* Error */}
            {voiceError && (
              <div style={S.errorBox}>{voiceError}</div>
            )}

            {/* Action buttons */}
            <div style={S.btnRow}>
              {done ? (
                <>
                  <button type="button" style={S.btnPrimary} onClick={handleClose}>
                    {language === 'am' ? '✓ ቅጹን ሙላ' : '✓ Fill Form'}
                  </button>
                  <button type="button" style={S.btnSecondary} onClick={handleTryAgain}>
                    {language === 'am' ? 'እንደገና ሞክር' : 'Try Again'}
                  </button>
                </>
              ) : voiceError ? (
                <>
                  <button type="button" style={S.btnPrimary} onClick={handleTryAgain}>
                    {language === 'am' ? 'እንደገና ሞክር' : 'Try Again'}
                  </button>
                  <button type="button" style={S.btnSecondary} onClick={handleClose}>
                    {language === 'am' ? 'ሰርዝ' : 'Cancel'}
                  </button>
                </>
              ) : (
                <button type="button" style={S.btnSecondary} onClick={handleClose}>
                  {language === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}