// ── OSRM — Open Source Routing Machine ───────────────────────────
// Completely free, no API key, uses OpenStreetMap road data
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Calculate the driving route between two points.
 * Returns an array of [lat, lng] coordinate pairs forming the route polyline.
 */
export async function calculateRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.length) {
      console.warn('OSRM returned no route:', data);
      return null;
    }

    const coords = data.routes[0].geometry.coordinates;

    // OSRM returns [lng, lat] — we need to flip to [lat, lng] for Leaflet
    const latLngs = coords.map(([lng, lat]) => [lat, lng]);

    return {
      latLngs,
      distanceMeters: data.routes[0].distance,
      durationSeconds: data.routes[0].duration,
      distanceKm: (data.routes[0].distance / 1000).toFixed(1),
      durationMins: Math.ceil(data.routes[0].duration / 60),
    };

  } catch (err) {
    console.error('Route calculation error:', err);
    return null;
  }
}