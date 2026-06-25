// frontend/public/service-worker.js
/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'firealert-cache-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install — cache the app shell ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate — clean up old cache versions ─────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — Stale-While-Revalidate for app assets, Network-First for SPA routes ──
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache API calls or external maps
  if (request.url.includes('/api/') || request.url.includes('nominatim.openstreetmap.org')) {
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  // CRITICAL FIX 1: SPA Router Offline Fallback
  // If the user refreshes on an internal client route (e.g., /dashboard), 
  // intercept it immediately and serve the cached index.html shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Cache-First strategy with passive background updating for asset chunks
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Fetch a fresh copy in the background to update the cache
        fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          }
        }).catch(() => {/* Ignore background network failures */});

        return cachedResponse;
      }

      return fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && request.url.startsWith(self.location.origin)) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          }
          return networkResponse;
        });
    })
  );
});

// ── Background Sync — triggers when connection is restored ───────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-reports') {
    // CRITICAL FIX 2: Correctly chain waitUntil to avoid early worker termination
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        if (clients.length === 0) {
          // No open windows to take action. Rejecting lets the browser retry later
          throw new Error('No active clients available to execute sync.');
        }
        
        const broadcastPromises = clients.map(client => {
          return new Promise((resolve) => {
            // Setup a message channel to verify receipt if needed, or simply post
            client.postMessage({ type: 'TRIGGER_SYNC' });
            resolve();
          });
        });
        
        return Promise.all(broadcastPromises);
      })
    );
  }
});