const CACHE_NAME = 'distilleryhub-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Minimal pass-through fetch handler — required for PWA installability
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
