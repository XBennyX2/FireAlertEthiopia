import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';
import { fireIcon } from '../utils/leafletIconFix';

// ── Reverse geocode using OpenStreetMap Nominatim (free) ──────────
async function reverseGeocode(lat, lng) {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}

// ── Component that handles map click events ───────────────────────
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// ── Component that re-centers map when position changes ───────────
function MapCenterUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (!map || map._destroyed || !position) return;

    try {
      if (map.getContainer()) {
        map.setView([position.lat, position.lng], map.getZoom());
      }
    } catch (err) {
      // Map wrapper unmounted mid-update loop — safe to catch
    }
  }, [position, map]);
  return null;
}

// ── Main MapPicker component ──────────────────────────────────────
export default function MapPicker({ position, onPositionChange, height = 320 }) {
  const markerRef = useRef(null);
  const [nearbyWarning, setNearbyWarning] = useState(null);

  // Default center — Addis Ababa
  const defaultCenter = { lat: 9.0300, lng: 38.7400 };
  const center        = position || defaultCenter;

  const checkNearby = useCallback(async (lat, lng) => {
    if (!lat || !lng) return;
    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await fetch(
        `${baseUrl}/incidents/public?lat=${lat}&lng=${lng}&radius=500`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.incidents?.length > 0) {
        setNearbyWarning(`${data.incidents.length} active incident(s) already reported nearby.`);
      } else {
        setNearbyWarning(null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (position?.lat && position?.lng) {
      checkNearby(position.lat, position.lng);
    }
  }, [position?.lat, position?.lng, checkNearby]);

  const handleDragEnd = useCallback(async () => {
    const marker = markerRef.current;
    if (!marker) return;

    const { lat, lng } = marker.getLatLng();
    checkNearby(lat, lng);
    const address      = await reverseGeocode(lat, lng);
    if (typeof onPositionChange === 'function') {
      onPositionChange({ lat, lng, address });
    }
  }, [onPositionChange, checkNearby]);

  const handleMapClick = useCallback(async (lat, lng) => {
    checkNearby(lat, lng);
    const address = await reverseGeocode(lat, lng);
    if (typeof onPositionChange === 'function') {
      onPositionChange({ lat, lng, address });
    }
  }, [onPositionChange, checkNearby]);

  return (
    <>
      <div style={{
        height,
        borderRadius:  10,
        overflow:      'hidden',
        border:        '1px solid #2a2a2a',
        position:      'relative'
      }}>
        {/* Instruction overlay */}
        <div style={{
          position:   'absolute',
          top:        10,
          left:       '50%',
          transform:  'translateX(-50%)',
          zIndex:     1000,
          background: 'rgba(0,0,0,0.72)',
          color:      '#f0ede8',
          fontSize:   '0.72rem',
          padding:    '0.3rem 0.85rem',
          borderRadius: 999,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          📍 Drag the pin or click the map to set the exact fire location
        </div>

        {/* 
          The key forces absolute DOM cleanups and halts leaf recycling patterns 
          when tracking dynamic visibility steps.
        */}
        <MapContainer
          key="map-picker-instance"
          center={[center.lat, center.lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          {/* OpenStreetMap tiles — completely free */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Draggable fire marker */}
          <Marker
            position={[center.lat, center.lng]}
            icon={fireIcon}
            draggable={true}
            ref={markerRef}
            eventHandlers={{ dragend: handleDragEnd }}
          />

          {/* Re-center map when GPS updates */}
          <MapCenterUpdater position={position} />

          {/* Handle map clicks */}
          <ClickHandler onMapClick={handleMapClick} />

        </MapContainer>
      </div>

      {nearbyWarning && (
        <div style={{
          marginTop:'0.5rem', fontSize:'0.78rem', color:'#f4820a',
          display:'flex', alignItems:'center', gap:'0.4rem',
        }}>
          ⚠ {nearbyWarning}
        </div>
      )}
    </>
  );
}