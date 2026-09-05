const VERSION = 'proofbook-v6';
const SHELL = /*__PRECACHE_ASSETS__*/ [];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) caches.open(VERSION).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(async () => {
      const exact = await caches.match(event.request, { ignoreSearch: true });
      if (exact) return exact;
      if (['/checks', '/overdue', '/history', '/settings'].includes(url.pathname)) return (await caches.match('/'));
      return (await caches.match('/offline.html'));
    }));
    return;
  }
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) caches.open(VERSION).then(cache => cache.put(event.request, response.clone()));
    return response;
  })));
});
