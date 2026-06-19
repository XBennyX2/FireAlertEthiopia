import { useState, useRef, useCallback, useEffect } from 'react';

export default function LiveCameraCapture({ onCapture, onCancel, language = 'en' }) {
  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const streamRef       = useRef(null);

  const [error,        setError]        = useState('');
  const [ready,        setReady]        = useState(false);
  const [capturedUrl,  setCapturedUrl]  = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [facingMode,   setFacingMode]   = useState('environment');

  // ── Start the camera stream ──────────────────────────────────────
  const startCamera = useCallback(async (mode) => {
    setError('');
    setReady(false);

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Flag to track if this specific async execution context is still valid
    let isCurrentRequest = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      // If the component unmounted or facingMode changed while we were waiting for user permission
      if (!isCurrentRequest) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        try {
          await videoRef.current.play();
          setReady(true);
        } catch (playErr) {
          // Catch the specific play interruption abort error safely (e.g. StrictMode double-mount)
          if (playErr.name !== 'AbortError') {
            throw playErr; 
          }
          console.warn('Play request handled safely after fast re-render interruption.');
        }
      }
    } catch (err) {
      if (!isCurrentRequest) return; // Ignore errors from stale requests

      console.error('Camera access error - FULL DETAILS:', {
        name: err.name,
        message: err.message,
        constraint: err.constraint,
      });

      if (err.name === 'NotAllowedError') {
        setError(
          language === 'am'
            ? 'የካሜራ መዳረሻ ተከልክሏል። እባክዎ የካሜራ ፍቃድ ይፍቀዱ።'
            : 'Camera access was denied. Please allow camera permission in your browser settings.'
        );
      } else if (err.name === 'NotFoundError') {
        setError(
          language === 'am'
            ? 'ካሜራ አልተገኘም። መሣሪያዎ ካሜራ ሊኖረው ይገባል።'
            : 'No camera found on this device.'
        );
      } else if (err.name === 'OverconstrainedError') {
        console.warn('Facing mode not available, retrying with default camera...');
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          
          if (!isCurrentRequest) {
            fallbackStream.getTracks().forEach(track => track.stop());
            return;
          }

          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play();
            setReady(true);
          }
          return;
        } catch (fallbackErr) {
          setError(
            language === 'am' 
              ? 'በዚህ መሣሪያ ላይ ምንም ዓይነት ካሜራ ማግኘት አልተቻለም።' 
              : 'Could not access any camera on this device.'
          );
        }
      } else {
        setError(
          `${language === 'am' ? 'ካሜራውን መክፈት አልተቻለም።' : 'Could not access the camera.'} (${err.name}: ${err.message})`
        );
      }
    }

    // Cleanup reference token if function scope ends
    return () => {
      isCurrentRequest = false;
    };
  }, [language]);

  useEffect(() => {
    // Keep a local reference to evaluate during cleanup
    let isMounted = true;
    
    startCamera(facingMode);

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, startCamera]);

  // ── Capture a frame from the video stream ────────────────────────
  function handleCapture() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setCapturedUrl(url);
      setCapturedBlob(blob);

      // Stop the camera once we have our photo
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }, 'image/jpeg', 0.9);
  }

  function handleRetake() {
    setCapturedUrl(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  }

  function handleConfirm() {
    if (!capturedBlob) return;

    // Create a File object — marked clearly as live-captured
    const file = new File(
      [capturedBlob],
      `live-capture-${Date.now()}.jpg`,
      { type: 'image/jpeg' }
    );

    onCapture({ file, previewUrl: capturedUrl, isLiveCaptured: true });
  }

  function handleSwitchCamera() {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }

  function handleCancel() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onCancel();
  }

  // ── Styles ────────────────────────────────────────────────────────
  const S = {
    overlay: {
      position: 'fixed', inset: 0, background: '#000', zIndex: 400,
      display: 'flex', flexDirection: 'column',
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.6)',
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    },
    headerTitle: {
      color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '0.9rem',
    },
    closeBtn: {
      background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
      width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: '1rem',
    },
    videoWrap: {
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', background: '#000',
    },
    video: {
      width: '100%', height: '100%', objectFit: 'cover',
    },
    capturedImg: {
      width: '100%', height: '100%', objectFit: 'contain',
    },
    controls: {
      padding: '1.5rem', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '2rem', background: 'rgba(0,0,0,0.8)',
    },
    captureBtn: {
      width: 72, height: 72, borderRadius: '50%', background: '#fff',
      border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    captureBtnInner: {
      width: 56, height: 56, borderRadius: '50%',
      background: 'linear-gradient(135deg, #e63c2f, #f4820a)',
    },
    sideBtn: {
      width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
      border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    confirmRow: {
      display: 'flex', gap: '0.75rem', width: '100%', maxWidth: 400,
    },
    btnRetake: {
      flex: 1, padding: '0.85rem', background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
      borderRadius: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 500,
      fontSize: '0.875rem', cursor: 'pointer',
    },
    btnUse: {
      flex: 1, padding: '0.85rem', background: 'linear-gradient(135deg, #e63c2f, #f4820a)',
      border: 'none', color: '#fff', borderRadius: 10,
      fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
    },
    errorBox: {
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14,
      padding: '2rem', maxWidth: 320, textAlign: 'center',
    },
    errorIcon: { fontSize: '2rem', marginBottom: '0.75rem' },
    errorText: { color: '#f87c74', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' },
    errorBtn: {
      padding: '0.65rem 1.5rem', background: '#2a2a2a', border: 'none',
      color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem',
    },
    liveBadge: {
      position: 'absolute', top: '4.5rem', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(230,60,47,0.9)', color: '#fff', padding: '0.3rem 0.9rem',
      borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
      display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 10,
    },
    liveDot: {
      width: 6, height: 6, borderRadius: '50%', background: '#fff',
      animation: 'livePulse 1.2s ease-in-out infinite',
    },
  };

  // Inject pulse animation once
  if (!document.getElementById('live-camera-style')) {
    const style       = document.createElement('style');
    style.id          = 'live-camera-style';
    style.textContent = `@keyframes livePulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`;
    document.head.appendChild(style);
  }

  return (
    <div style={S.overlay}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={S.header}>
        <span style={S.headerTitle}>
          {capturedUrl
            ? (language === 'am' ? 'ፎቶ ይገምግሙ' : 'Review Photo')
            : (language === 'am' ? 'ቀጥታ ካሜራ' : 'Live Camera')}
        </span>
        <button style={S.closeBtn} onClick={handleCancel}>✕</button>
      </div>

      {/* ── Live indicator ──────────────────────────────────────── */}
      {!capturedUrl && ready && !error && (
        <div style={S.liveBadge}>
          <div style={S.liveDot} />
          {language === 'am' ? 'ቀጥታ' : 'LIVE'}
        </div>
      )}

      {/* ── Video / Captured Preview ────────────────────────────── */}
      <div style={S.videoWrap}>
        {error ? (
          <div style={S.errorBox}>
            <div style={S.errorIcon}>📷</div>
            <div style={S.errorText}>{error}</div>
            <button style={S.errorBtn} onClick={handleCancel}>
              {language === 'am' ? 'ዝጋ' : 'Close'}
            </button>
          </div>
        ) : capturedUrl ? (
          <img src={capturedUrl} alt="captured" style={S.capturedImg} />
        ) : (
          <video ref={videoRef} style={S.video} autoPlay playsInline muted />
        )}
        <canvas ref={canvasRef} style={{ display:'none' }} />
      </div>

      {/* ── Controls ────────────────────────────────────────────── */}
      {!error && (
        <div style={S.controls}>
          {capturedUrl ? (
            <div style={S.confirmRow}>
              <button style={S.btnRetake} onClick={handleRetake}>
                {language === 'am' ? '🔄 እንደገና አንሳ' : '🔄 Retake'}
              </button>
              <button style={S.btnUse} onClick={handleConfirm}>
                {language === 'am' ? '✓ ይህን ፎቶ ይጠቀሙ' : '✓ Use This Photo'}
              </button>
            </div>
          ) : (
            <>
              <button style={S.sideBtn} onClick={handleSwitchCamera} title="Switch camera">
                🔄
              </button>
              <button
                style={S.captureBtn}
                onClick={handleCapture}
                disabled={!ready}
              >
                <div style={S.captureBtnInner} />
              </button>
              <div style={{ width: 44 }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}