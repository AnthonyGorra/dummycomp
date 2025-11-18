// Service Worker for offline capabilities and caching
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
];

// Cache size limits
const CACHE_LIMITS = {
  [DYNAMIC_CACHE]: 50,
  [IMAGE_CACHE]: 100,
};

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...', event);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...', event);
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== IMAGE_CACHE) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Helper function to limit cache size
const limitCacheSize = (cacheName, maxItems) => {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => limitCacheSize(cacheName, maxItems));
      }
    });
  });
};

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) {
    return;
  }

  // Images - cache first
  if (request.url.match(/\.(png|jpg|jpeg|svg|gif|webp|avif)$/)) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) return response;

        return fetch(request).then((fetchResponse) => {
          return caches.open(IMAGE_CACHE).then((cache) => {
            cache.put(request, fetchResponse.clone());
            limitCacheSize(IMAGE_CACHE, CACHE_LIMITS[IMAGE_CACHE]);
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Static assets - cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Pages - network first
  event.respondWith(
    fetch(request)
      .then((response) => {
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, response.clone());
          limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS[DYNAMIC_CACHE]);
          return response;
        });
      })
      .catch(() => {
        return caches.match(request).then((response) => {
          if (response) return response;
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});
