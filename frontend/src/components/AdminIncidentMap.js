import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import '../leafletIconFix';

export default function AdminIncidentMap({ incidents, height = 520 }) {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const layersRef   = useRef({});

  const [showHeatmap,  setShowHeatmap]  = useState(false);
  const [showClusters, setShowClusters] = useState(false);

  const STATUS_COLORS = {
    pending:    '#f4820a',
    verified:   '#3b82f6',
    dispatched: '#a855f7',
    resolved:   '#22c55e',
    rejected:   '#e63c2f',
  };

  useEffect(() => {
    if (mapInstance.current) return; // already initialized
    
    const container = mapRef.current;
    if (!container) return;

    // Guard against Leaflet re-init on the same dirty container node
    if (container._leaflet_id) return;

    mapInstance.current = L.map(container, { zoomControl: true }).setView([9.03, 38.74], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    // Explicit cleanup lifecycle to destroy instances fully on unmount
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !incidents.length) return;

    // Clear existing layers safely
    Object.values(layersRef.current).forEach(l => { 
      try { if (l && map.hasLayer(l)) map.removeLayer(l); } catch (err) {} 
    });
    layersRef.current = {};

    const validIncidents = incidents.filter(i => i.location?.lat && i.location?.lng);

    if (showHeatmap) {
      const heatData = validIncidents.map(i => {
        const weight = i.severity === 'High' ? 1 : i.severity === 'Medium' ? 0.6 : 0.3;
        return [i.location.lat, i.location.lng, weight];
      });
      const heat = L.heatLayer(heatData, {
        radius:  35,
        blur:    20,
        maxZoom: 15,
        max:     1.0,
        gradient: { 0.3:'#3b82f6', 0.6:'#f4820a', 1.0:'#e63c2f' },
      }).addTo(map);
      layersRef.current.heat = heat;

    } else if (showClusters) {
      const cluster = L.markerClusterGroup();
      validIncidents.forEach(i => {
        L.circleMarker([i.location.lat, i.location.lng], {
          radius:      7,
          color:       STATUS_COLORS[i.status] || '#888',
          fillColor:   STATUS_COLORS[i.status] || '#888',
          fillOpacity: 0.85,
          weight:      1.5,
        })
        .bindPopup(`<b style="text-transform:capitalize">${i.fire_type} fire</b><br><span style="text-transform:capitalize;color:${STATUS_COLORS[i.status]}">${i.status}</span>`)
        .addTo(cluster);
      });
      cluster.addTo(map);
      layersRef.current.cluster = cluster;

    } else {
      const group = L.layerGroup();
      validIncidents.forEach(i => {
        L.circleMarker([i.location.lat, i.location.lng], {
          radius: 8, color: STATUS_COLORS[i.status] || '#888',
          fillColor: STATUS_COLORS[i.status] || '#888', fillOpacity: 0.85, weight: 2,
        }).bindPopup(`
          <div style="font-family:sans-serif;min-width:140px">
            <b style="text-transform:capitalize">${i.fire_type} fire</b><br>
            <span style="color:${STATUS_COLORS[i.status]};font-weight:600;text-transform:capitalize">${i.status}</span><br>
            <span style="color:#888;font-size:0.8rem">${i.severity} severity</span>
          </div>
        `).addTo(group);
      });
      group.addTo(map);
      layersRef.current.markers = group;

      if (validIncidents.length > 0) {
        try {
          const bounds = L.latLngBounds(validIncidents.map(i => [i.location.lat, i.location.lng]));
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        } catch (err) {
          // Guard against animation runs targeting unmounted instances
        }
      }
    }
  }, [incidents, showHeatmap, showClusters]);

  return (
    <div>
      {/* Controls */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.75rem', flexWrap:'wrap' }}>
        <button
          onClick={() => { setShowHeatmap(false); setShowClusters(false); }}
          className={!showHeatmap && !showClusters ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize:'0.75rem' }}
        >
          📍 Pins
        </button>
        <button
          onClick={() => { setShowHeatmap(true); setShowClusters(false); }}
          className={showHeatmap ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize:'0.75rem' }}
        >
          🔥 Heatmap
        </button>
        <button
          onClick={() => { setShowHeatmap(false); setShowClusters(true); }}
          className={showClusters ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize:'0.75rem' }}
        >
          🗂️ Clusters
        </button>
      </div>

      {/* Map Element Container */}
      <div
        ref={mapRef}
        style={{ height, borderRadius:10, overflow:'hidden', border:'1px solid #1e1e1e' }}
      />
    </div>
  );
}