import { useEffect, useState, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, useMap
} from 'react-leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';
import { fireIcon, responderIcon } from '../utils/leafletIconFix';
import { calculateRoute } from '../utils/routing';

// ── Re-center map when responder moves ───────────────────────────
function MapUpdater({ responderPos, incidentPos }) {
  const map = useMap();

  useEffect(() => {
    if (!responderPos || !incidentPos) return;

    const timer = setTimeout(() => {
      try {
        import('leaflet').then(L => {
          const bounds = L.latLngBounds([
            [responderPos.lat, responderPos.lng],
            [incidentPos.lat,  incidentPos.lng],
          ]);
          map.fitBounds(bounds, { padding: [60, 60] });
        });
      } catch (err) {
        // Map unmounted — safe to ignore
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [responderPos, map]);

  return null;
}

// ── Main component ────────────────────────────────────────────────
export default function LiveTrackingMap({
  incident,
  mode = 'user',      // 'user' = watching | 'responder' = broadcasting
  height = 420,
}) {
  const [responderPos,  setResponderPos]  = useState(null);
  const [route,         setRoute]         = useState(null);
  const [routeInfo,     setRouteInfo]     = useState(null);
  const [connected,     setConnected]     = useState(false);
  const socketRef       = useRef(null);
  const watchIdRef      = useRef(null);
  const { user }        = (window.__auth__ || {});

  const incidentPos = incident?.location
    ? { lat: incident.location.lat, lng: incident.location.lng }
    : null;

  // ── Socket setup ────────────────────────────────────────────────
  useEffect(() => {
    if (!incident?._id) return;

    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinIncidentRoom', incident._id);
    });

    socket.on('disconnect', () => setConnected(false));

    // USER MODE — listen for responder location updates
    if (mode === 'user') {
      socket.on('responderLocationUpdate', async (data) => {
        const newPos = { lat: data.lat, lng: data.lng };
        setResponderPos(newPos);

        // Recalculate route whenever responder moves
        if (incidentPos) {
          const routeData = await calculateRoute(
            data.lat, data.lng,
            incidentPos.lat, incidentPos.lng
          );
          if (routeData) {
            setRoute(routeData.latLngs);
            setRouteInfo({
              distanceKm:   routeData.distanceKm,
              durationMins: routeData.durationMins,
            });
          }
        }
      });
    }

    return () => {
      socket.emit('leaveIncidentRoom', incident._id);
      socket.disconnect();
    };
  }, [incident?._id, mode]);

  // ── RESPONDER MODE — broadcast own location ─────────────────────
  useEffect(() => {
    if (mode !== 'responder' || !incident?._id) return;

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

    async function startTracking() {
      if (!navigator.geolocation) return;

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          setResponderPos({ lat, lng });

          // Broadcast location to all users watching this incident
          socketRef.current?.emit('responderLocation', {
            incidentId:    incident._id,
            lat,
            lng,
            responderId:   storedUser._id,
            responderName: storedUser.name || 'Responder',
          });

          // Calculate route to incident
          if (incidentPos) {
            const routeData = await calculateRoute(
              lat, lng,
              incidentPos.lat, incidentPos.lng
            );
            if (routeData) {
              setRoute(routeData.latLngs);
              setRouteInfo({
                distanceKm:   routeData.distanceKm,
                durationMins: routeData.durationMins,
              });
            }
          }
        },
        (err) => console.error('GPS watch error:', err),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    }

    startTracking();

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [mode, incident?._id]);

  if (!incidentPos) {
    return (
      <div style={{
        height,
        borderRadius:   12,
        border:         '1px solid #1e1e1e',
        background:     '#0e0e0e',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          '#444',
        fontSize:       '0.875rem',
      }}>
        No location data for this incident
      </div>
    );
  }

  return (
    <div style={{ position:'relative', zIndex:1 }}>

      {/* ── Route Info Bar ──────────────────────────────────────── */}
      {routeInfo && (
        <div style={{
          display:         'flex',
          gap:             '1.5rem',
          padding:         '0.75rem 1.25rem',
          background:      '#111',
          border:          '1px solid #1e1e1e',
          borderBottom:    'none',
          borderRadius:    '12px 12px 0 0',
          fontSize:        '0.8rem',
          flexWrap:        'wrap',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <span style={{ color:'#444' }}>Distance</span>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:'#f4820a' }}>
              {routeInfo.distanceKm} km
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <span style={{ color:'#444' }}>ETA</span>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:'#22c55e' }}>
              {routeInfo.durationMins} min
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', marginLeft:'auto' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background: connected ? '#22c55e' : '#e63c2f' }} />
            <span style={{ color:'#555', fontSize:'0.72rem' }}>
              {connected ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
        </div>
      )}

      {/* ── Map ────────────────────────────────────────────────── */}
      <div style={{
        height,
        borderRadius:  routeInfo ? '0 0 12px 12px' : 12,
        overflow:      'hidden',
        border:        '1px solid #1e1e1e',
      }}>
        <MapContainer
          center={[incidentPos.lat, incidentPos.lng]}
          zoom={14}
          style={{ height:'100%', width:'100%' }}
          key={incident._id}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto-fit when responder moves */}
          {responderPos && (
            <MapUpdater
              responderPos={responderPos}
              incidentPos={incidentPos}
            />
          )}

          {/* Fire incident pin */}
          <Marker position={[incidentPos.lat, incidentPos.lng]} icon={fireIcon}>
            <Popup>
              <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem' }}>
                <strong>🔥 Fire Incident</strong><br />
                {incident.description?.slice(0, 80)}…
              </div>
            </Popup>
          </Marker>

          {/* Responder pin — only shown when location is known */}
          {responderPos && (
            <Marker
              position={[responderPos.lat, responderPos.lng]}
              icon={responderIcon}
            >
              <Popup>
                <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem' }}>
                  <strong>🚒 Responder En Route</strong><br />
                  {routeInfo
                    ? `${routeInfo.distanceKm}km away — ETA ${routeInfo.durationMins} min`
                    : 'Calculating route…'}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route polyline */}
          {route && (
            <Polyline
              positions={route}
              pathOptions={{
                color:     '#f4820a',
                weight:    4,
                opacity:   0.8,
                dashArray: '8, 4',
              }}
            />
          )}

        </MapContainer>
      </div>

      {/* ── Legend ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:'1rem', marginTop:'0.6rem', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.72rem', color:'#666' }}>
          <span>🔴</span> Fire Location
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.72rem', color:'#666' }}>
          <span>🔵</span> Responder Position
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.72rem', color:'#666' }}>
          <div style={{ width:20, height:3, background:'#f4820a', borderRadius:2 }} /> Optimal Route
        </div>
      </div>

    </div>
  );
}