import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
    if (mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, { zoomControl: true }).setView([9.03, 38.74], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current);
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !incidents.length) return;

    // Clear existing layers
    Object.values(layersRef.current).forEach(l => { try { map.removeLayer(l); } catch {} });
    layersRef.current = {};

    const validIncidents = incidents.filter(i => i.location?.lat && i.location?.lng);

    if (showHeatmap) {
      // Heatmap layer — severity weighted
      const heatData = validIncidents.map(i => {
        const weight = i.severity === 'High' ? 1 : i.severity === 'Medium' ? 0.6 : 0.3;
        return [i.location.lat, i.location.lng, weight];
      });
      // Use a canvas-based approach since leaflet.heat may not be available
      // Fallback: draw colored circles at each point
      const heatGroup = L.layerGroup();
      validIncidents.forEach(i => {
        const weight = i.severity === 'High' ? 1 : i.severity === 'Medium' ? 0.6 : 0.3;
        const radius = weight * 60;
        const opacity = weight * 0.35;
        L.circle([i.location.lat, i.location.lng], {
          radius,
          color:       'transparent',
          fillColor:   '#e63c2f',
          fillOpacity: opacity,
        }).addTo(heatGroup);
      });
      heatGroup.addTo(map);
      layersRef.current.heat = heatGroup;

    } else if (showClusters) {
      // Cluster markers
      try {
        const { MarkerClusterGroup } = require('leaflet.markercluster');
        require('leaflet.markercluster/dist/MarkerCluster.css');
        require('leaflet.markercluster/dist/MarkerCluster.Default.css');
        const cluster = new MarkerClusterGroup();
        validIncidents.forEach(i => {
          const marker = L.circleMarker([i.location.lat, i.location.lng], {
            radius: 7, color: STATUS_COLORS[i.status] || '#888',
            fillColor: STATUS_COLORS[i.status] || '#888', fillOpacity: 0.85, weight: 1.5,
          }).bindPopup(`<b>${i.fire_type}</b><br>${i.status}`);
          cluster.addLayer(marker);
        });
        cluster.addTo(map);
        layersRef.current.cluster = cluster;
      } catch {
        // If cluster library not available, fall back to regular markers
        const group = L.layerGroup();
        validIncidents.forEach(i => {
          L.circleMarker([i.location.lat, i.location.lng], {
            radius: 7, color: STATUS_COLORS[i.status] || '#888',
            fillColor: STATUS_COLORS[i.status] || '#888', fillOpacity: 0.85, weight: 1.5,
          }).bindPopup(`<b>${i.fire_type}</b><br>${i.status}`).addTo(group);
        });
        group.addTo(map);
        layersRef.current.markers = group;
      }
    } else {
      // Default: individual pins
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

      // Fit bounds
      if (validIncidents.length > 0) {
        const bounds = L.latLngBounds(validIncidents.map(i => [i.location.lat, i.location.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
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

      {/* Map */}
      <div
        key={`${showHeatmap}-${showClusters}`}
        ref={mapRef}
        style={{ height, borderRadius:10, overflow:'hidden', border:'1px solid #1e1e1e' }}
      />
    </div>
  );
}