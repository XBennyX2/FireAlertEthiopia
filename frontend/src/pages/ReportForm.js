import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import API from '../api/axios';
import MapPicker from '../components/MapPicker';
import VoiceReportButton from '../components/VoiceReportButton';
import NotificationBell from '../components/NotificationBell';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LiveCameraCapture from '../components/LiveCameraCapture';
import { useToast } from '../context/ToastContext';
import '../dashboard.css';

export default function ReportForm() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // ── Form fields ───────────────────────────────────────────────────
  const [description, setDescription] = useState('');
  const [fireType, setFireType] = useState('');
  const [location, setLocation] = useState({ lat: null, lng: null, address: '' });
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);

  // ── UI state ──────────────────────────────────────────────────────
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [isLiveCaptured, setIsLiveCaptured] = useState(false);

  // ── Auto-fetch GPS on mount ───────────────────────────────────────
  useEffect(() => {
    fetchGPS();
  }, []);

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
  function removeFile() {
    setMediaFile(null);
    setMediaPreview(null);
    setIsLiveCaptured(false);
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

  // ── GPS Validation ────────────────────────────────────────────────
  function validateGPS(lat, lng) {
    const inEthiopia = lat >= 3.4 && lat <= 15.0 && lng >= 33.0 && lng <= 48.0;
    const inAddisArea = lat >= 8.8 && lat <= 9.2 && lng >= 38.5 && lng <= 39.0;
    return { inEthiopia, inAddisArea, valid: inEthiopia };
  }

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');

    if (!description.trim()) return setSubmitError('Please describe the incident.');
    if (!fireType) return setSubmitError('Please select the fire type.');
    if (!location.lat || !location.lng) {
      return setSubmitError('Location is required. Allow GPS or drag the pin on the map.');
    }

    const gpsCheck = validateGPS(location.lat, location.lng);
    if (!gpsCheck.valid) {
      return setSubmitError('The selected location appears to be outside Ethiopia. Please check the pin on the map.');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('fire_type', fireType);
      formData.append('lat', location.lat);
      formData.append('lng', location.lng);
      formData.append('address', location.address);
      formData.append('gps_validated', gpsCheck.inAddisArea ? 'true' : 'false');
      formData.append('gps_score', String(gpsCheck.inAddisArea ? 100 : 50));
      formData.append('media_is_live', String(isLiveCaptured));
      
      if (mediaFile) formData.append('media', mediaFile);

      await API.post('/incidents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Show success toast notification and redirect with immediate timer
      toast.success('Fire report submitted successfully. Responders have been notified.');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Submission failed. Please try again.';
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Active Enforcement Gatekeeper ──────────────────────────────────
  if (user?.isRestricted || user?.isBanned) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
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
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">{t.appName}</span>
        </Link>
        <div className="dash-topbar-right">
          <LanguageSwitcher />
          <span className="dash-user-name">{user?.name}</span>
          <NotificationBell />
          <button className="dash-logout-btn" onClick={logout}>{t.signOut}</button>
        </div>
      </nav>

      <div className="dash-content" style={{ maxWidth: 760 }}>
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">{t.reportAFire}</h1>
            <p className="dash-subtitle">{t.reportSubtitle}</p>
          </div>
          <Link to="/dashboard" className="btn-secondary">{t.back}</Link>
        </div>

        <div className="card">
          {submitError && (
            <div style={{ background: 'rgba(230,60,47,0.1)', border: '1px solid rgba(230,60,47,0.25)', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#f87c74', marginBottom: '1.25rem' }}>
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* ── Voice Report Button ──────────────────────── */}
            <div className="form-group">
              <VoiceReportButton language={language} onFieldsFilled={handleVoiceResult} />
              <span className="form-hint" style={{ marginTop: '0.4rem', display: 'block', textAlign: 'center' }}>
                {language === 'am' ? 'ወይም ቅጹን በእጅ ይሙሉ' : 'Or fill the form manually below'}
              </span>
            </div>

            {/* ── Fire Type ────────────────────────────────── */}
            <div className="form-group">
              <label className="form-label">{t.fireType}</label>
              <select className="form-select" value={fireType} onChange={e => setFireType(e.target.value)}>
                <option value="">{t.selectCategory}</option>
                {fireTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* ── Description ──────────────────────────────── */}
            <div className="form-group">
              <label className="form-label">{t.description}</label>
              <textarea
                className="form-textarea"
                placeholder={t.descriptionPlaceholder}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
              <span className="form-hint">
                {description.length} {t.descriptionHint}
              </span>
            </div>

            {/* ── Map ──────────────────────────────────────── */}
            <div className="form-group">
              <label className="form-label">{t.locationGPS}</label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.78rem', color: gpsLoading ? '#f4820a' : location.lat ? '#22c55e' : '#666' }}>
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
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                >
                  {gpsLoading ? '...' : '📍 ' + t.useMyLocation}
                </button>
              </div>

              {gpsError && (
                <div style={{ fontSize: '0.78rem', color: '#f4820a', marginBottom: '0.5rem' }}>
                  ⚠️ {gpsError}
                </div>
              )}

              {!gpsLoading ? (
                <MapPicker
                  position={location.lat ? { lat: location.lat, lng: location.lng } : null}
                  onPositionChange={handleMapPositionChange}
                  height={340}
                />
              ) : (
                <div style={{ height: 340, background: '#111', borderRadius: 10, border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.875rem' }}>
                  📡 Detecting your location…
                </div>
              )}

              <input
                className="form-input"
                placeholder={t.addressPlaceholder}
                value={location.address}
                onChange={e => setLocation(p => ({ ...p, address: e.target.value }))}
                style={{ marginTop: '0.6rem' }}
              />

              {gpsCheckResult && !gpsCheckResult.inAddisArea && gpsCheckResult.valid && (
                <div style={{ fontSize: '0.78rem', color: '#f4820a', marginTop: '0.4rem' }}>
                  ⚠️ Location is outside the Addis Ababa area. Please confirm this is correct.
                </div>
              )}
            </div>

            {/* ── Media Upload ──────────────────────────────── */}
            <div className="form-group">
              <label className="form-label">{t.mediaLabel}</label>
              {!mediaFile ? (
                <div
                  style={{ border: '2px dashed #2a2a2a', borderRadius: 10, padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onClick={() => setShowCamera(true)}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#e63c2f'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                >
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📷</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {language === 'am' ? 'ቀጥታ ፎቶ ለማንሳት ጠቅ ያድርጉ' : 'Tap to take a live photo'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#444', marginTop: '0.25rem' }}>
                    {language === 'am' ? 'ከቤተ-ስዕል ምስሎችን መጫን አይፈቀድም' : 'Gallery uploads are not allowed — camera only'}
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative', border: '1px solid #2a2a2a', borderRadius: 10, overflow: 'hidden' }}>
                  {mediaPreview && (
                    <img src={mediaPreview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                  )}
                  {isLiveCaptured && (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(34,197,94,0.92)', color: '#fff', padding: '0.25rem 0.65rem', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.03em' }}>
                      ✓ {language === 'am' ? 'ቀጥታ ተነስቷል' : 'Live Captured'}
                    </div>
                  )}
                  <button type="button" onClick={removeFile} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                    {t.removeFile}
                  </button>
                </div>
              )}

              {showCamera && (
                <LiveCameraCapture
                  language={language}
                  onCapture={({ file, previewUrl }) => {
                    setMediaFile(file);
                    setMediaPreview(previewUrl);
                    setIsLiveCaptured(true);
                    setShowCamera(false);
                  }}
                  onCancel={() => setShowCamera(false)}
                />
              )}
            </div>

            {/* ── Dynamic Action Button ─────────────────────── */}
            {!user?.isRestricted && !user?.isBanned && (
              <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', padding: '0.9rem' }}>
                {submitting ? t.submittingReport : `🚨 ${t.reportAFire}`}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}