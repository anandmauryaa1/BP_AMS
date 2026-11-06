// Service Worker for blindarea Production (BP_AMS) Progressive Web App
// Supports offline fallback, smart caching, and push notifications
/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'bp-ams-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).catch(function (err) {
        console.warn('[ServiceWorker] Pre-caching static assets notice:', err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (name) {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch event with Network-first strategy for navigation and Cache-first for static assets
self.addEventListener('fetch', function (event) {
  const request = event.request;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API requests and external telemetry
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/webpack-hmr')) {
    return;
  }

  // For HTML page navigation requests: Network first, fall back to offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(function () {
        return caches.match('/offline.html').then(function (cachedOffline) {
          return cachedOffline || caches.match('/');
        });
      })
    );
    return;
  }

  // For static icons, images, and manifest: Cache first with network fallback
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then(function (cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(function (networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});

// Push notification handling
self.addEventListener('push', function (event) {
  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    const title = payload.title || 'blindarea Production';
    const isTaskAlert = payload.tag === 'TASK_ASSIGNED' || payload.tag === 'TASK_DUE';
    const options = {
      body: payload.body || 'You have a new studio update.',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-192x192.png',
      tag: payload.tag || 'bp-ams-notification',
      vibrate: isTaskAlert ? [200, 100, 200, 100, 400] : [150, 50, 100],
      data: {
        url: payload.url || '/tasks',
        timestamp: payload.timestamp || Date.now(),
        type: payload.tag || 'TASK_ASSIGNED',
        ...payload.data,
      },
      requireInteraction: isTaskAlert,
    };

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(title, options),
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
          clients.forEach(function (client) {
            client.postMessage({
              type: 'PUSH_NOTIFICATION_RECEIVED',
              payload: {
                title: title,
                body: options.body,
                tag: payload.tag,
                url: options.data.url,
                timestamp: options.data.timestamp,
              },
            });
          });
        }),
      ])
    );
  } catch (err) {
    console.error('[ServiceWorker] Push event parsing error:', err);
    event.waitUntil(
      self.registration.showNotification('blindarea Production', {
        body: event.data.text() || 'New production activity recorded.',
        icon: '/icons/icon-192x192.png',
      })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clientList.length > 0 && 'focus' in clientList[0] && 'navigate' in clientList[0]) {
        return clientList[0].navigate(targetUrl).then(function (c) {
          return c ? c.focus() : null;
        });
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
