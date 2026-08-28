const VERSION = 'proofbook-v4';
const SHELL = ['/', '/offline.html', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/assets/main.js', '/assets/style.css', '/assets/proofbook-hero-420.webp', '/assets/proofbook-hero-420.avif', '/assets/proofbook-hero.webp', '/assets/proofbook-hero.avif'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone(); caches.open(VERSION).then(c => c.put(event.request, copy)); return response;
    }).catch(() => caches.match(url.pathname).then(r => r || caches.match('/') || caches.match('/offline.html'))));
    return;
  }
  event.respondWith(caches.match(url.pathname).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) caches.open(VERSION).then(c => c.put(event.request, response.clone()));
    return response;
  })));
});
