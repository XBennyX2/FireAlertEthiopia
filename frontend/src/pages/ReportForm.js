import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import API from '../api/axios';
import MapPicker from '../components/MapPicker';
import VoiceReportButton from '../components/VoiceReportButton';
import NotificationBell from '../components/NotificationBell';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LiveCameraCapture from '../components/LiveCameraCapture';
import '../dashboard.css';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { saveOfflineReport } from '../utils/offlineDB';
import { useToast } from '../context/ToastContext';

export default function ReportForm() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // ── Form fields ───────────────────────────────────────────────────
  const [description, setDescription] = useState('');
  const [fireType, setFireType] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [location, setLocation] = useState({ lat: null, lng: null, address: '' });
  const [isAnonymous, setIsAnonymous] = useState(false);

  // ── Multi-file state (max 5) ──────────────────────────────────────
  const [mediaFiles, setMediaFiles] = useState([]); // [{ file, previewUrl, isLive }]
  const MAX_FILES = 5;

  // ── UI state ──────────────────────────────────────────────────────
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [forceDuplicate, setForceDuplicate] = useState(false);
  const isOnline = useOnlineStatus();

  // ── M1: ref for live-error announcement ──────────────────────────
  const submitErrorRef = useRef(null);

  // ── Auto-fetch GPS on mount ───────────────────────────────────────
  useEffect(() => {
    fetchGPS();
  }, []);

  // ── M1: Move focus to error when it appears ───────────────────────
  useEffect(() => {
    if (submitError && submitErrorRef.current) {
      submitErrorRef.current.focus();
    }
  }, [submitError]);

  function fetchGPS() {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by your browser.');
      setGpsLoading(false);
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          setLocation({ lat, lng, address: data.display_name || '' });
        } catch {
          setLocation({ lat, lng, address: '' });
        }
        setGpsLoading(false);
      },
      () => {
        // Fallback default: Addis Ababa center
        setLocation({ lat: 9.0300, lng: 38.7400, address: '' });
        setGpsError('Could not get your exact location. You can drag the pin to set it manually.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ── Map pin moved ─────────────────────────────────────────────────
  function handleMapPositionChange({ lat, lng, address }) {
    setLocation({ lat, lng, address });
  }

  // ── File handling ─────────────────────────────────────────────────
  function removeFile(index) {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  }

  // ── Voice result ──────────────────────────────────────────────────
  function handleVoiceResult(result) {
    if (!result) return;
    const { fields, transcript } = result;
    if (!fields) {
      if (transcript) setDescription(transcript);
      return;
    }
    if (fields.description) setDescription(fields.description);
    if (fields.fire_type) setFireType(fields.fire_type);
  }

  // ── GPS Validation Helper ─────────────────────────────────────────
  function validateGPS(lat, lng) {
    const inEthiopia = lat >= 3.4 && lat <= 15.0 && lng >= 33.0 && lng <= 48.0;
    const inAddisArea = lat >= 8.8 && lat <= 9.2 && lng >= 38.5 && lng <= 39.0;
    return { inEthiopia, inAddisArea, valid: inEthiopia };
  }

  // ── Form Validation ───────────────────────────────────────────────
  function validate() {
    setSubmitError('');
    if (mediaFiles.length > MAX_FILES) {
      setSubmitError(`Maximum ${MAX_FILES} files allowed per report.`);
      return false;
    }
    if (!fireType) {
      setSubmitError(language === 'am' ? 'እባክዎ የእሳት አደጋ ዓይነት ይምረጡ' : 'Please select a fire type.');
      return false;
    }
    if (!description.trim() || description.trim().length < 10) {
      setSubmitError(language === 'am' ? 'እባክዎ ቢያንስ 10 ቁምፊዎች ያለው መግለጫ ያስገቡ' : 'Please provide a description of at least 10 characters.');
      return false;
    }
    if (!location.lat || !location.lng) {
      setSubmitError(language === 'am' ? 'የካርታ ቦታ አልተገኘም' : 'Location coordinates are required.');
      return false;
    }
    return true;
  }

  // ── Generate GPS Payload Metadata ─────────────────────────────────
  function getGPSValidation() {
    if (!location.lat || !location.lng) return { inAddis: false, score: 0 };
    const check = validateGPS(location.lat, location.lng);
    return {
      inAddis: check.inAddisArea,
      score: check.inAddisArea ? 100 : (check.inEthiopia ? 70 : 30)
    };
  }

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    const gpsValidation = getGPSValidation();
    const reportPayload = {
      description,
      fire_type:       fireType,
      severity,
      lat:             location.lat,
      lng:             location.lng,
      address:         location.address || '',
      gps_validated:   String(gpsValidation?.inAddis || false),
      gps_score:       String(gpsValidation?.score || 50),
      media_is_live:   String(mediaFiles.some(f => f.isLive)),
      isAnonymous:     String(isAnonymous),
    };

    // ── If device is offline, save locally immediately ──────────────
    if (!isOnline) {
      try {
        await saveOfflineReport(reportPayload, mediaFiles.map(f => f.file));
        toast.success(language === 'am' ? 'ከመስመር ውጭ ነዎት። ሪፖርቱ ተቀምጧል' : 'You are offline. Report saved locally and will sync automatically when you reconnect.');
        navigate('/dashboard');
      } catch (err) {
        toast.error('Failed to save report locally. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── Online — attempt normal submission ───────────────────────────
    try {
      const formData = new FormData();
      Object.entries(reportPayload).forEach(([key, value]) => formData.append(key, value));
      mediaFiles.forEach(({ file }) => formData.append('media', file));
      formData.append('severity', severity);
      if (forceDuplicate) formData.append('forceDuplicate', 'true');

      await API.post('/incidents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Fire report submitted successfully. Responders have been notified.');
      setTimeout(() => navigate('/dashboard'), 1200);

    } catch (err) {
      // ── Handle duplicate ──────────────────────────────────────────
      if (err.response?.status === 409 && err.response.data?.isDuplicate) {
        const { existingId, existingStatus, distance } = err.response.data;
        setDuplicateInfo({ existingId, existingStatus, distance });
        return; // don't show generic error
      }
      // ── Handle other errors ───────────────────────────────────────
      const isNetworkError = !err.response;

      if (isNetworkError) {
        try {
          await saveOfflineReport(reportPayload, mediaFiles.map(f => f.file));
          toast.warning('Connection issue detected. Report saved locally and will sync automatically.');
          navigate('/dashboard');
        } catch (saveErr) {
          toast.error('Failed to submit and could not save offline. Please try again.');
        }
      } else {
        const msg = err.response?.data?.message || 'Submission failed. Please try again.';
        toast.error(msg);
        setSubmitError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Active Enforcement Gatekeeper ──────────────────────────────────
  if (user?.isRestricted || user?.isBanned) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">
            {user?.isBanned ? '⛔' : '🚫'}
          </div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.25rem', color: '#f0ede8', marginBottom: '0.5rem' }}>
            {user?.isBanned ? 'Account Banned' : 'Account Restricted'}
          </h2>
          <p style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {user?.isBanned
              ? 'Your account has been banned due to repeated false reports. Contact support to appeal this decision.'
              : `Your account is restricted (score: ${user?.reputationScore}). You cannot submit new reports until your reputation improves above 30.`}
          </p>
          <Link to="/dashboard" className="btn-secondary">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const fireTypeOptions = Object.entries(t.fireTypes || {}).map(([value, label]) => ({ value, label }));
  const gpsCheckResult = location.lat ? validateGPS(location.lat, location.lng) : null;

  return (
    <div className="dash-page">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <nav className="dash-topbar" aria-label="Main navigation">
        <Link to="/" className="dash-topbar-logo" aria-label={`${t.appName} — go to home`}>
          <div className="dash-topbar-logo-icon" aria-hidden="true">🔥</div>
          <span className="dash-topbar-logo-text">{t.appName}</span>
        </Link>
        <div className="dash-topbar-right">
          <LanguageSwitcher />
          <span className="dash-user-name" aria-label={`Signed in as ${user?.name}`}>{user?.name}</span>
          <NotificationBell />
          <button className="dash-logout-btn" onClick={logout} aria-label="Sign out of your account">
            {t.signOut}
          </button>
        </div>
      </nav>

      {/* ── M1: Skip-to-content link ─────────────────────────────── */}
      {/* Note: add this once at the App.js level; shown here for completeness */}

      <div
        className="dash-content"
        id="main-content"
        style={{ maxWidth: 760 }}
        role="main"
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">{t.reportAFire}</h1>
            <p className="dash-subtitle">{t.reportSubtitle}</p>
          </div>
          <Link to="/dashboard" className="btn-secondary" aria-label="Go back to dashboard">
            {t.back}
          </Link>
        </div>

        {/* ── M1: Offline banner with role="status" ────────────── */}
        {!isOnline && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding:      '0.85rem 1.1rem',
              background:   'rgba(230,60,47,0.08)',
              border:       '1px solid rgba(230,60,47,0.2)',
              borderRadius: 10,
              marginBottom: '1.5rem',
              display:      'flex',
              alignItems:   'center',
              gap:          '0.6rem',
            }}
          >
            <span style={{ fontSize: '1rem' }} aria-hidden="true">📡</span>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f87c74' }}>
                You're currently offline
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>
                Your report will be saved on this device and automatically submitted once you're back online.
              </div>
            </div>
          </div>
        )}

        <div className="card">
          {/* ── M1: Error region — focusable, role="alert" ───────── */}
          {submitError && (
            <div
              ref={submitErrorRef}
              role="alert"
              aria-live="assertive"
              tabIndex={-1}
              style={{
                background: 'rgba(230,60,47,0.1)',
                border: '1px solid rgba(230,60,47,0.25)',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                color: '#f87c74',
                marginBottom: '1.25rem',
                outline: 'none',
              }}
            >
              {submitError}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Fire incident report form"
          >
            {/* ── Voice Report Button ──────────────────────── */}
            <div className="form-group">
              <VoiceReportButton language={language} onFieldsFilled={handleVoiceResult} />
              <span
                className="form-hint"
                style={{ marginTop: '0.4rem', display: 'block', textAlign: 'center' }}
                aria-live="polite"
              >
                {language === 'am' ? 'ወይም ቅጹን በእጅ ይሙሉ' : 'Or fill the form manually below'}
              </span>
            </div>

            {/* ── Fire Type ────────────────────────────────── */}
            <div className="form-group">
              <label className="form-label" htmlFor="fire-type-select">
                {t.fireType}
              </label>
              <select
                id="fire-type-select"
                className="form-select"
                value={fireType}
                onChange={e => setFireType(e.target.value)}
                aria-required="true"
                aria-describedby="fire-type-hint"
              >
                <option value="">{t.selectCategory}</option>
                {fireTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span id="fire-type-hint" className="sr-only">
                Select the category that best describes the type of fire incident
              </span>
            </div>

            {/* ── Severity ─────────────────────────────────── */}
            <div className="form-group">
              <label className="form-label" htmlFor="severity-select">
                Estimated Severity
              </label>
              <select
                id="severity-select"
                className="form-select"
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                aria-required="true"
                aria-describedby="severity-hint"
              >
                <option value="Low">Low — small, contained, no immediate danger</option>
                <option value="Medium">Medium — spreading, risk to property</option>
                <option value="High">High — large fire, people in danger</option>
              </select>
              <span id="severity-hint" className="sr-only">
                Choose the severity level that best matches what you are observing
              </span>
            </div>

            {/* ── Description ──────────────────────────────── */}
            <div className="form-group">
              <label className="form-label" htmlFor="description-input">
                {t.description}
              </label>
              <textarea
                id="description-input"
                className="form-textarea"
                placeholder={t.descriptionPlaceholder || 'Describe what you see — type of fire, size, people in danger…'}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                minLength={10}
                aria-required="true"
                aria-describedby="description-hint description-count"
                aria-invalid={description.length > 0 && description.length < 10 ? 'true' : 'false'}
              />
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}
              >
                <span id="description-hint" style={{ fontSize: '0.72rem', color: '#555' }}>
                  {description.length > 0 && description.length < 10 ? (
                    <span style={{ color: '#e63c2f' }} role="alert">
                      Minimum 10 characters ({10 - description.length} more needed)
                    </span>
                  ) : description.length >= 10 ? (
                    <span style={{ color: '#22c55e' }}>✓ Good description</span>
                  ) : (
                    'Minimum 10 characters required'
                  )}
                </span>
                <span
                  id="description-count"
                  style={{ fontSize: '0.72rem', color: '#444' }}
                  aria-live="polite"
                  aria-label={`${description.length} characters entered`}
                >
                  {description.length} characters
                </span>
              </div>
            </div>

            {/* ── Map ──────────────────────────────────────── */}
            <div className="form-group">
              <label className="form-label" id="location-label">
                {t.locationGPS}
              </label>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}
              >
                {/* M1: GPS status announced to screen readers */}
                <span
                  aria-live="polite"
                  style={{ fontSize: '0.78rem', color: gpsLoading ? '#f4820a' : location.lat ? '#22c55e' : '#666' }}
                >
                  {gpsLoading
                    ? '📡 ' + t.detectingLocation
                    : location.lat
                      ? `✓ ${t.locationCaptured}: ${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}`
                      : t.useMyLocation}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={fetchGPS}
                  disabled={gpsLoading}
                  aria-label={gpsLoading ? 'Detecting your location…' : 'Use my current GPS location'}
                  aria-busy={gpsLoading}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                >
                  {gpsLoading ? '...' : '📍 ' + t.useMyLocation}
                </button>
              </div>

              {gpsError && (
                <div
                  role="alert"
                  style={{ fontSize: '0.78rem', color: '#f4820a', marginBottom: '0.5rem' }}
                >
                  ⚠️ {gpsError}
                </div>
              )}

              {/* M1: Map region labelled for assistive tech */}
              <div
                aria-labelledby="location-label"
                aria-describedby="map-instructions"
              >
                {!gpsLoading ? (
                  <MapPicker
                    position={location.lat ? { lat: location.lat, lng: location.lng } : null}
                    onPositionChange={handleMapPositionChange}
                    height={340}
                  />
                ) : (
                  <div
                    role="status"
                    aria-label="Detecting your location"
                    style={{
                      height: 340, background: '#111', borderRadius: 10,
                      border: '1px solid #2a2a2a', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: '#444', fontSize: '0.875rem',
                    }}
                  >
                    <span aria-hidden="true">📡</span>&nbsp;Detecting your location…
                  </div>
                )}
              </div>
              <span id="map-instructions" className="sr-only">
                Drag the map pin to adjust the fire location. You can also type an address below.
              </span>

              <label htmlFor="address-input" className="sr-only">
                Street address or landmark
              </label>
              <input
                id="address-input"
                className="form-input"
                placeholder={t.addressPlaceholder}
                value={location.address}
                onChange={e => setLocation(p => ({ ...p, address: e.target.value }))}
                aria-describedby="location-label"
                style={{ marginTop: '0.6rem' }}
              />

              {gpsCheckResult && !gpsCheckResult.inAddisArea && gpsCheckResult.valid && (
                <div
                  role="alert"
                  style={{ fontSize: '0.78rem', color: '#f4820a', marginTop: '0.4rem' }}
                >
                  ⚠️ Location is outside the Addis Ababa area. Please confirm this is correct.
                </div>
              )}
            </div>

            {/* ── Media Upload ──────────────────────────────── */}
            <div className="form-group">
              <label className="form-label" id="media-label">
                {t.mediaLabel}
                <span style={{ fontSize: '0.72rem', color: '#555', marginLeft: '0.5rem', fontWeight: 400 }}>
                  (max {MAX_FILES} files, 10MB each)
                </span>
              </label>

              {/* ── Thumbnails grid ──────────────────────────── */}
              {mediaFiles.length > 0 && (
                <ul
                  aria-label="Attached photos"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 0.75rem',
                  }}
                >
                  {mediaFiles.map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        position: 'relative', borderRadius: 8,
                        overflow: 'hidden', border: '1px solid #2a2a2a', aspectRatio: '1',
                      }}
                    >
                      <img
                        src={item.previewUrl}
                        alt={`Captured photo ${idx + 1}${item.isLive ? ' — live capture' : ''}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {item.isLive && (
                        <div
                          aria-hidden="true"
                          style={{
                            position: 'absolute', top: 4, left: 4,
                            background: 'rgba(34,197,94,0.92)', color: '#fff',
                            padding: '0.15rem 0.45rem', borderRadius: 999,
                            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.03em',
                          }}
                        >
                          ✓ {language === 'am' ? 'ቀጥታ' : 'Live'}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        aria-label={`Remove photo ${idx + 1}`}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          background: 'rgba(0,0,0,0.7)', color: '#fff',
                          border: 'none', borderRadius: 4,
                          padding: '0.2rem 0.45rem', cursor: 'pointer',
                          fontSize: '0.65rem', lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* ── File count indicator ─────────────────────── */}
              {mediaFiles.length > 0 && (
                <div
                  aria-live="polite"
                  aria-atomic="true"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    marginBottom: '0.6rem', fontSize: '0.78rem',
                    color: mediaFiles.length >= MAX_FILES ? '#e63c2f' : '#22c55e',
                  }}
                >
                  <span>
                    {mediaFiles.length}/{MAX_FILES} file{mediaFiles.length !== 1 ? 's' : ''} attached
                  </span>
                  {mediaFiles.length >= MAX_FILES && (
                    <span style={{ color: '#f4820a' }}>— maximum reached</span>
                  )}
                </div>
              )}

              {/* ── M2: Add photo — div → button for keyboard access ── */}
              {mediaFiles.length < MAX_FILES && (
                <button
                  type="button"
                  aria-label={
                    mediaFiles.length > 0
                      ? `Add another photo (${mediaFiles.length} of ${MAX_FILES} attached)`
                      : 'Take a live photo with your camera'
                  }
                  aria-describedby="media-label"
                  onClick={() => setShowCamera(true)}
                  style={{
                    width: '100%',
                    border: '2px dashed #2a2a2a',
                    borderRadius: 10,
                    padding: mediaFiles.length > 0 ? '1.25rem' : '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    background: 'transparent',
                    color: 'inherit',
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#e63c2f'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                  onFocus={e => e.currentTarget.style.borderColor = '#e63c2f'}
                  onBlur={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                >
                  <div
                    aria-hidden="true"
                    style={{ fontSize: mediaFiles.length > 0 ? '1.25rem' : '1.75rem', marginBottom: '0.35rem' }}
                  >
                    📷
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {mediaFiles.length > 0
                      ? (language === 'am' ? 'ሌላ ፎቶ ይጨምሩ' : 'Add another photo')
                      : (language === 'am' ? 'ቀጥታ ፎቶ ለማንሳት ጠቅ ያድርጉ' : 'Tap to take a live photo')}
                  </div>
                  {mediaFiles.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#444', marginTop: '0.25rem' }}>
                      {language === 'am' ? 'ከቤተ-ስዕል ምስሎችን መጫን አይፈቀድም' : 'Gallery uploads are not allowed — camera only'}
                    </div>
                  )}
                </button>
              )}

              {/* ── M1/M2: Camera modal with role="dialog" + Escape ── */}
              {showCamera && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Take a live photo"
                  onKeyDown={e => { if (e.key === 'Escape') setShowCamera(false); }}
                >
                  <LiveCameraCapture
                    language={language}
                    onCapture={({ file, previewUrl }) => {
                      setMediaFiles(prev => [...prev, { file, previewUrl, isLive: true }]);
                      setShowCamera(false);
                    }}
                    onCancel={() => setShowCamera(false)}
                  />
                </div>
              )}
            </div>

            {/* ── Anonymous reporting toggle ────────────────── */}
            <div style={{
              background: 'rgba(244,130,10,0.06)',
              border: '1px solid rgba(244,130,10,0.15)',
              borderRadius: 8,
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
            }}>
              <label
                htmlFor="anonymous-toggle"
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}
              >
                <input
                  id="anonymous-toggle"
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  aria-describedby="anonymous-hint"
                  style={{ marginTop: '0.15rem', accentColor: '#f4820a', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f0ede8', marginBottom: '0.15rem' }}>
                    Submit anonymously
                  </div>
                  <div id="anonymous-hint" style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5 }}>
                    Your name will not be shown to responders. Note: anonymous reports receive a lower initial trust score and cannot earn reputation points.
                  </div>
                </div>
              </label>
            </div>

            {/* ── Duplicate Incident Warning ────────────────── */}
            {duplicateInfo && (
              <div style={{
                background:   'rgba(244,130,10,0.1)',
                border:       '1px solid rgba(244,130,10,0.3)',
                borderRadius: 10,
                padding:      '1rem 1.25rem',
                marginBottom: '1rem',
              }}>
                <div style={{ fontWeight:700, color:'#f4820a', marginBottom:'0.5rem', fontSize:'0.9rem' }}>
                  ⚠ Incident Already Reported
                </div>
                <p style={{ fontSize:'0.82rem', color:'#888', lineHeight:1.6, marginBottom:'0.75rem' }}>
                  A <strong style={{ color:'#f0ede8', textTransform:'capitalize' }}>{duplicateInfo.existingStatus}</strong> fire
                  incident was already reported <strong style={{ color:'#f0ede8' }}>{duplicateInfo.distance}m</strong> from
                  this location within the last 30 minutes. Responders are already aware.
                </p>
                <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize:'0.78rem' }}
                    onClick={() => navigate(`/incidents/${duplicateInfo.existingId}`)}
                  >
                    View Existing Report →
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize:'0.78rem', color:'#f4820a' }}
                    onClick={() => {
                      setForceDuplicate(true);
                      setDuplicateInfo(null);
                    }}
                  >
                    Submit Anyway (different fire)
                  </button>
                </div>
              </div>
            )}

            {/* ── Submit Button ─────────────────────────────── */}
            {!user?.isRestricted && !user?.isBanned && (
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                aria-disabled={submitting}
                aria-busy={submitting}
                aria-label={submitting ? 'Submitting your fire report…' : 'Submit fire report'}
                style={{ width: '100%', padding: '0.9rem' }}
              >
                {submitting ? t.submittingReport : `🚨 ${t.reportAFire}`}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}