import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';
import { fireIcon } from '../utils/leafletIconFix';

const STATUS_COLORS = {
  pending:    '#f4820a',
  verified:   '#3b82f6',
  dispatched: '#a855f7',
  resolved:   '#22c55e',
  rejected:   '#e63c2f',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function BoundsFitter({ incidents }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !incidents || incidents.length === 0) return;

    const valid = incidents.filter(i => i.location?.lat && i.location?.lng);
    if (valid.length === 0) return;

    // Wait until the map container is fully ready
    const timer = setTimeout(() => {
      try {
        if (!map.getContainer()) return;

        if (valid.length === 1) {
          map.setView([valid[0].location.lat, valid[0].location.lng], 15);
          return;
        }

        import('leaflet').then(L => {
          try {
            const bounds = L.latLngBounds(
              valid.map(i => [i.location.lat, i.location.lng])
            );
            map.fitBounds(bounds, { padding: [40, 40] });
          } catch (err) {
            // Map was unmounted before fitBounds could run — safe to ignore
          }
        });
      } catch (err) {
        // Map container gone — safe to ignore
      }
    }, 100);

    return () => clearTimeout(timer);

  }, [incidents, map]);

  return null;
}

export default function IncidentMap({ incidents = [], height = 380 }) {
  const defaultCenter = [9.0300, 38.7400];

  const validIncidents = incidents.filter(
    i => i.location?.lat && i.location?.lng
  );

  // ── No valid incidents — show a plain placeholder, NOT a broken map ──
  if (validIncidents.length === 0) {
    return (
      <div style={{
        height,
        borderRadius:   12,
        border:         '1px solid #1e1e1e',
        background:     '#0e0e0e',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        color:          '#333',
        fontSize:       '0.875rem',
        gap:            '0.5rem',
        userSelect:     'none',
      }}>
        <span style={{ fontSize:'1.5rem' }}>🗺️</span>
        <span>No incidents to display on map</span>
      </div>
    );
  }

  return (
    <div style={{
      height,
      borderRadius: 12,
      overflow:     'hidden',
      border:       '1px solid #1e1e1e',
      position:     'relative',
      zIndex:       1,           // ← keeps map below modals and nav
    }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height:'100%', width:'100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <BoundsFitter incidents={validIncidents} />

        {validIncidents.map(incident => (
          <Marker
            key={incident._id}
            position={[incident.location.lat, incident.location.lng]}
            icon={fireIcon}
          >
            <Popup>
              <div style={{ fontFamily:'DM Sans, sans-serif', minWidth:200, padding:'0.25rem' }}>
                <div style={{
                  display:       'inline-block',
                  padding:       '0.15rem 0.6rem',
                  borderRadius:  999,
                  fontSize:      '0.65rem',
                  fontWeight:    700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background:    `${STATUS_COLORS[incident.status] || '#666'}22`,
                  color:          STATUS_COLORS[incident.status]   || '#666',
                  marginBottom:  '0.5rem',
                }}>
                  {incident.status || 'pending'}
                </div>

                <div style={{ fontSize:'0.7rem', color:'#888', marginBottom:'0.3rem', textTransform:'capitalize' }}>
                  {incident.fire_type || 'Unknown type'}
                </div>

                <div style={{
                  fontSize:        '0.8rem',
                  color:           '#333',
                  lineHeight:      1.5,
                  marginBottom:    '0.5rem',
                  maxWidth:        220,
                  overflow:        'hidden',
                  display:         '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {incident.description}
                </div>

                {incident.location?.address && (
                  <div style={{ fontSize:'0.72rem', color:'#999', marginBottom:'0.3rem' }}>
                    📍 {incident.location.address}
                  </div>
                )}

                {incident.ai_trust_score !== undefined && (
                  <div style={{
                    fontSize:     '0.7rem',
                    color:        incident.ai_trust_score >= 75 ? '#22c55e' : '#f4820a',
                    marginBottom: '0.3rem',
                  }}>
                    AI Trust: {incident.ai_trust_score}%
                  </div>
                )}

                <div style={{ fontSize:'0.68rem', color:'#bbb' }}>
                  {fmtDate(incident.reportedAt)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
}