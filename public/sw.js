const CACHE_NAME = 'timetable-v3';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/favicon.ico',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // NEVER cache API, Auth, or Session requests
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/auth') ||
    url.pathname.includes('session') ||
    url.pathname.includes('callback')
  ) {
    return;
  }

  // Network-first for HTML pages (navigation), cache-first for static assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
