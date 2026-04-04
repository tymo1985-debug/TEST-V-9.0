// Service Worker for Service Year Planner v9.0
// Optimized for GitHub Pages / static hosting

const VERSION = 'syp-v9.0.2';
const CACHE_STATIC = `static-${VERSION}`;
const CACHE_RUNTIME = `runtime-${VERSION}`;

// Precache: keep paths relative so GitHub Pages subpaths work.
// We try each asset individually so installation doesn't fail if a file is renamed.
const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    for (const url of PRECACHE_URLS) {
      try {
        const req = new Request(url, { cache: 'reload' });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(req, res);
      } catch (_) {
        // Ignore missing assets to keep install robust
      }
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (![CACHE_STATIC, CACHE_RUNTIME].includes(key)) return caches.delete(key);
    }));
    await self.clients.claim();
  })());
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  const cache = await caches.open(CACHE_RUNTIME);
  try { if (res && res.ok) cache.put(request, res.clone()); } catch (_) {}
  return res;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_RUNTIME);
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      try { cache.put(request, res.clone()); } catch (_) {}
    }
    return res;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Offline fallback to whichever HTML exists
    return (await caches.match('./index.html')) ||
           (await caches.match('./service_year_planner_v9_0_index.html')) ||
           Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Ignore non-http(s)
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // HTML navigations: network-first for freshest content
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: cache-first
  const dest = request.destination;
  if (['script', 'style', 'image', 'font'].includes(dest)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: stale-while-revalidate-ish
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const fetchPromise = fetch(request).then(async (res) => {
      if (res && res.ok) {
        const cache = await caches.open(CACHE_RUNTIME);
        try { cache.put(request, res.clone()); } catch (_) {}
      }
      return res;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
