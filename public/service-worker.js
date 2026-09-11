const CACHE_NAME = 'distilleryhub-v2';
const OFFLINE_URL = '/react-migration/';

const PRECACHE_ASSETS = [
  '/react-migration/',
  '/react-migration/index.html',
  '/react-migration/styles.css',
  '/react-migration/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never touch Firebase/Firestore/Cloudinary API calls — always go straight to network
  if (
    request.url.includes('firestore.googleapis.com') ||
    request.url.includes('googleapis.com') ||
    request.url.includes('cloudinary.com') ||
    request.url.includes('firebaseapp.com')
  ) {
    return;
  }

  if (request.method !== 'GET') return;

  const isStaticAsset =
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.url.includes('fonts.googleapis.com') ||
    request.url.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    // Cache-first: these rarely change, serve instantly from cache
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first: HTML, JS, CSS — always try to get the latest deploy.
  // Falls back to cache only when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
        })
      )
  );
});
