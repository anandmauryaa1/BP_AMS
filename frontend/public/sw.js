// Service Worker for blindarea Production (BP_AMS) Web Push Notifications
/* eslint-disable no-restricted-globals */

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    const title = payload.title || 'blindarea Production';
    const options = {
      body: payload.body || 'You have a new studio update.',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      tag: payload.tag || 'bp-ams-notification',
      vibrate: [150, 50, 100],
      data: {
        url: payload.url || '/dashboard',
        timestamp: payload.timestamp || Date.now(),
        ...payload.data,
      },
      requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[ServiceWorker] Push event parsing error:', err);
    event.waitUntil(
      self.registration.showNotification('blindarea Production', {
        body: event.data.text() || 'New production activity recorded.',
        icon: '/favicon.ico',
      })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a tab is already open with the target URL, bring it to focus
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If any tab is open to the origin, navigate and focus
      if (clientList.length > 0 && 'focus' in clientList[0] && 'navigate' in clientList[0]) {
        return clientList[0].navigate(targetUrl).then(function (c) {
          return c ? c.focus() : null;
        });
      }
      // Otherwise open a new browser window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
