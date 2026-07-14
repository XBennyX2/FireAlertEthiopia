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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate — clean up old cache versions ─────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — Stale-While-Revalidate & SPA Fallback ──────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Skip non-http schemes (e.g., chrome-extension://, file://, data:) to prevent crashes
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return;
  }

  // 2. Ignore API calls and external services
  if (request.url.includes('/api/') || request.url.includes('nominatim.openstreetmap.org')) {
    return;
  }

  // 3. Only handle GET requests
  if (request.method !== 'GET') return;

  // 4. SPA Router Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 5. Stale-While-Revalidate for app assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Only cache valid, successful, first-party network responses
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          networkResponse.type === 'basic'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // Silently fail background updates
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// ── Background Sync — triggers when connection is restored ───────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-reports') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        if (clients.length === 0) {
          throw new Error('No active clients to execute sync.');
        }
        
        return Promise.all(
          clients.map((client) => client.postMessage({ type: 'TRIGGER_SYNC' }))
        );
      })
    );
  }
});

// ── Push Notifications ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'FireAlert', {
      body: data.body || 'You have a new update.',
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: { url: data.url || '/' },
    })
  );
});

// ── Notification Interaction ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});