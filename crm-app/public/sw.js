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

// Install event - cache static assets
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

// Activate event - cleanup old caches
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

// Helper to determine cache strategy
const getCacheStrategy = (url) => {
  const urlObj = new URL(url);

  // Don't cache API calls
  if (urlObj.pathname.startsWith('/api/')) {
    return 'network-only';
  }

  // Cache images with cache-first
  if (urlObj.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|avif)$/)) {
    return 'cache-first';
  }

  // Cache static assets with cache-first
  if (urlObj.pathname.startsWith('/_next/static/')) {
    return 'cache-first';
  }

  // Use network-first for pages
  return 'network-first';
};

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  const strategy = getCacheStrategy(request.url);

  if (strategy === 'network-only') {
    // Network only - don't cache
    event.respondWith(fetch(request));
    return;
  }

  if (strategy === 'cache-first') {
    // Cache first strategy - for images and static assets
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request).then((fetchResponse) => {
          const isImage = request.url.match(/\.(png|jpg|jpeg|svg|gif|webp|avif)$/);
          const cacheName = isImage ? IMAGE_CACHE : STATIC_CACHE;

          return caches.open(cacheName).then((cache) => {
            cache.put(request, fetchResponse.clone());
            limitCacheSize(cacheName, CACHE_LIMITS[cacheName] || 50);
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  if (strategy === 'network-first') {
    // Network first strategy - for pages
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
            if (response) {
              return response;
            }
            // Return offline page if available
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
        })
    );
  }
});

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Implement your background sync logic here
      Promise.resolve()
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keyList) => {
        return Promise.all(
          keyList.map((key) => caches.delete(key))
        );
      })
    );
  }
});
