import { useState, useRef, useCallback, useEffect } from 'react';

export default function LiveCameraCapture({ onCapture, onCancel, language = 'en' }) {
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const streamRef     = useRef(null);
  const mediaRecRef   = useRef(null);
  const chunksRef     = useRef([]);
  const timerRef      = useRef(null);

  const [mode,          setMode]          = useState('photo'); // 'photo' | 'video'
  const [facingMode,    setFacingMode]    = useState('environment');
  const [error,         setError]         = useState('');
  const [ready,         setReady]         = useState(false);
  const [capturedUrl,   setCapturedUrl]   = useState(null);
  const [capturedBlob,  setCapturedBlob]  = useState(null);
  const [recording,     setRecording]     = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // ── Camera start/stop ───────────────────────────────────────────
  const startCamera = useCallback(async (facing, withAudio = false) => {
    setError('');
    setReady(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    let isCurrentRequest = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: withAudio,
      });

      if (!isCurrentRequest) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          setReady(true);
        } catch (playErr) {
          if (playErr.name !== 'AbortError') throw playErr;
          console.warn('Play interrupted safely after fast re-render.');
        }
      }
    } catch (err) {
      if (!isCurrentRequest) return;

      console.error('Camera error:', err);

      if (err.name === 'NotAllowedError') {
        setError(language === 'am'
          ? 'የካሜራ መዳረሻ ተከልክሏል። እባክዎ የካሜራ ፍቃድ ይፍቀዱ።'
          : 'Camera access was denied. Please allow camera permission in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError(language === 'am'
          ? 'ካሜራ አልተገኘም። መሣሪያዎ ካሜራ ሊኖረው ይገባል።'
          : 'No camera found on this device.');
      } else if (err.name === 'OverconstrainedError') {
        console.warn('Facing mode unavailable, retrying with default camera...');
        try {
          const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: withAudio });
          if (!isCurrentRequest) { fallback.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = fallback;
          if (videoRef.current) {
            videoRef.current.srcObject = fallback;
            await videoRef.current.play();
            setReady(true);
          }
        } catch {
          setError(language === 'am'
            ? 'በዚህ መሣሪያ ላይ ምንም ዓይነት ካሜራ ማግኘት አልተቻለም።'
            : 'Could not access any camera on this device.');
        }
      } else {
        setError(`${language === 'am' ? 'ካሜራውን መክፈት አልተቻለም።' : 'Could not access the camera.'} (${err.name}: ${err.message})`);
      }
    }

    return () => { isCurrentRequest = false; };
  }, [language]);

  // Restart when facingMode or mode changes (mode change may need audio track)
  useEffect(() => {
    startCamera(facingMode, mode === 'video');
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facingMode, mode, startCamera]);

  // ── Photo capture ───────────────────────────────────────────────
  function handleCapturePhoto() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      setCapturedBlob(blob);
      setCapturedUrl(URL.createObjectURL(blob));
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    }, 'image/jpeg', 0.92);
  }

  // ── Video recording ─────────────────────────────────────────────
  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setCapturedBlob(blob);
      setCapturedUrl(URL.createObjectURL(blob));
    };

    recorder.start(100);
    setRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(t => {
        if (t >= 59) { stopRecording(); return 60; }
        return t + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (mediaRecRef.current?.state !== 'inactive') mediaRecRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  }

  // ── Shared actions ──────────────────────────────────────────────
  function handleRetake() {
    setCapturedUrl(null);
    setCapturedBlob(null);
    setRecordingTime(0);
    startCamera(facingMode, mode === 'video');
  }

  function handleConfirm() {
    if (!capturedBlob) return;
    const isVideo  = mode === 'video';
    const ext      = isVideo ? (capturedBlob.type.includes('mp4') ? 'mp4' : 'webm') : 'jpg';
    const mimeType = isVideo ? capturedBlob.type : 'image/jpeg';
    const file = new File([capturedBlob], `live-capture-${Date.now()}.${ext}`, { type: mimeType });
    onCapture({ file, previewUrl: capturedUrl, isLiveCaptured: true });
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    onCancel();
  }

  function handleCancel() {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    onCancel();
  }

  function switchMode(newMode) {
    if (recording) stopRecording();
    setCapturedUrl(null);
    setCapturedBlob(null);
    setRecordingTime(0);
    setMode(newMode);
  }

  // ── Pulse animation (injected once) ────────────────────────────
  if (!document.getElementById('live-camera-style')) {
    const style       = document.createElement('style');
    style.id          = 'live-camera-style';
    style.textContent = `
      @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      @keyframes recPulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
    `;
    document.head.appendChild(style);
  }

  // ── Styles ──────────────────────────────────────────────────────
  const S = {
    overlay:   { position:'fixed', inset:0, background:'#000', zIndex:400, display:'flex', flexDirection:'column' },
    header:    { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 1.25rem', background:'rgba(0,0,0,0.6)', position:'absolute', top:0, left:0, right:0, zIndex:10 },
    closeBtn:  { background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:'1rem' },
    modeToggle:{ display:'flex', gap:'0.25rem', background:'rgba(255,255,255,0.1)', borderRadius:999, padding:'0.2rem' },
    videoWrap: { flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', background:'#000', marginTop:56 },
    video:     { width:'100%', height:'100%', objectFit:'cover' },
    preview:   { width:'100%', height:'100%', objectFit:'contain' },
    controls:  { padding:'1.25rem 2rem', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'space-around', alignItems:'center' },
    captureBtn:{ width:72, height:72, borderRadius:'50%', background:'#fff', border:'4px solid rgba(255,255,255,0.3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
    recStartBtn:{ width:72, height:72, borderRadius:'50%', background:'#e63c2f', border:'4px solid rgba(255,255,255,0.4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
    sideBtn:   { width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', fontSize:'1.2rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
    confirmRow:{ display:'flex', gap:'0.75rem', width:'100%', maxWidth:400 },
    btnRetake: { flex:1, padding:'0.85rem', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', borderRadius:10, fontWeight:500, fontSize:'0.875rem', cursor:'pointer' },
    btnUse:    { flex:1, padding:'0.85rem', background:'linear-gradient(135deg,#e63c2f,#f4820a)', border:'none', color:'#fff', borderRadius:10, fontWeight:700, fontSize:'0.875rem', cursor:'pointer' },
    errorBox:  { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#161616', border:'1px solid #2a2a2a', borderRadius:14, padding:'2rem', maxWidth:320, textAlign:'center' },
    badge:     { position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', background:'rgba(230,60,47,0.85)', color:'#fff', padding:'0.3rem 0.9rem', borderRadius:999, fontSize:'0.72rem', fontWeight:700, display:'flex', alignItems:'center', gap:'0.4rem', zIndex:10 },
    dot:       { width:7, height:7, borderRadius:'50%', background:'#fff' },
  };

  const mm = (n) => String(Math.floor(n / 60)).padStart(2, '0');
  const ss = (n) => String(n % 60).padStart(2, '0');

  return (
    <div style={S.overlay}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={S.header}>
        <button style={S.closeBtn} onClick={handleCancel}>✕</button>

        {/* Mode toggle — hidden once captured */}
        {!capturedUrl && (
          <div style={S.modeToggle}>
            {['photo', 'video'].map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{
                padding:'0.3rem 0.9rem', borderRadius:999, border:'none', cursor:'pointer',
                background: mode === m ? '#fff' : 'transparent',
                color:      mode === m ? '#000' : '#fff',
                fontSize:'0.78rem', fontWeight:600, textTransform:'capitalize', transition:'all 0.2s',
              }}>
                {m === 'photo' ? '📷 ' : '🎥 '}
                {m === 'photo'
                  ? (language === 'am' ? 'ፎቶ' : 'Photo')
                  : (language === 'am' ? 'ቪዲዮ' : 'Video')}
              </button>
            ))}
          </div>
        )}

        {/* Flip button or spacer */}
        {!capturedUrl ? (
          <button style={S.sideBtn} onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}>
            🔄
          </button>
        ) : (
          <div style={{ width:32 }} />
        )}
      </div>

      {/* ── LIVE / REC badge ───────────────────────────────────── */}
      {!capturedUrl && ready && !error && (
        <div style={{ ...S.badge, top: 68 }}>
          <div style={{ ...S.dot, animation: recording ? 'recPulse 1s infinite' : 'livePulse 1.2s ease-in-out infinite' }} />
          {recording
            ? `REC ${mm(recordingTime)}:${ss(recordingTime)} / 01:00`
            : (language === 'am' ? 'ቀጥታ' : 'LIVE')}
        </div>
      )}

      {/* ── Viewfinder / Preview ───────────────────────────────── */}
      <div style={S.videoWrap}>
        {error ? (
          <div style={S.errorBox}>
            <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>📷</div>
            <div style={{ color:'#f87c74', fontSize:'0.875rem', lineHeight:1.6, marginBottom:'1.25rem' }}>{error}</div>
            <button style={{ padding:'0.65rem 1.5rem', background:'#2a2a2a', border:'none', color:'#fff', borderRadius:8, cursor:'pointer' }} onClick={handleCancel}>
              {language === 'am' ? 'ዝጋ' : 'Close'}
            </button>
          </div>
        ) : capturedUrl && mode === 'photo' ? (
          <img src={capturedUrl} alt="captured" style={S.preview} />
        ) : capturedUrl && mode === 'video' ? (
          <video src={capturedUrl} controls style={S.preview} />
        ) : (
          <video ref={videoRef} style={S.video} autoPlay playsInline muted />
        )}
        <canvas ref={canvasRef} style={{ display:'none' }} />
      </div>

      {/* ── Controls ───────────────────────────────────────────── */}
      {!error && (
        <div style={S.controls}>
          {capturedUrl ? (
            <div style={S.confirmRow}>
              <button style={S.btnRetake} onClick={handleRetake}>
                {language === 'am' ? '🔄 እንደገና' : '🔄 Retake'}
              </button>
              <button style={S.btnUse} onClick={handleConfirm}>
                {mode === 'photo'
                  ? (language === 'am' ? '✓ ይህን ፎቶ ይጠቀሙ' : '✓ Use Photo')
                  : (language === 'am' ? '✓ ይህን ቪዲዮ ይጠቀሙ' : '✓ Use Video')}
              </button>
            </div>
          ) : mode === 'photo' ? (
            <>
              <div style={{ width:44 }} />
              <button style={S.captureBtn} onClick={handleCapturePhoto} disabled={!ready}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#e63c2f,#f4820a)' }} />
              </button>
              <div style={{ width:44 }} />
            </>
          ) : !recording ? (
            <>
              <div style={{ width:44 }} />
              <button style={S.recStartBtn} onClick={startRecording} disabled={!ready}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'#fff' }} />
              </button>
              <div style={{ width:44 }} />
            </>
          ) : (
            <>
              <div style={{ width:44 }} />
              <button style={S.recStartBtn} onClick={stopRecording}>
                <div style={{ width:22, height:22, borderRadius:4, background:'#fff' }} />
              </button>
              <div style={{ width:44 }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}