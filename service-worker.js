const VERSION = '2026-06-15-a';
const CACHE = 'daily-agent-' + VERSION;
const ASSETS = [
  '/daily-agent/',
  '/daily-agent/index.html'
];

// Install — cache the app shell immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — wipe ALL old caches, take control straight away
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, cache as fallback
// For the main page: always try network, update cache, notify app if new version detected
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const isPage = e.request.url.includes('/daily-agent/') &&
    !e.request.url.match(/\.(png|jpg|jpeg|svg|ico|woff|woff2)$/);

  if (isPage) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        // Tell the app a fresh version was fetched — it can show an update banner
        self.clients.matchAll().then(clients =>
          clients.forEach(c => c.postMessage({ type: 'UPDATED' }))
        );
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
