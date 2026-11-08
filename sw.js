// Away Message service worker v2: push notifications for DMs and @mentions, and always loads the newest page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  e.waitUntil(self.registration.showNotification(d.title || 'Away Message', {
    body: d.body || '', icon: 'icon-192.png', tag: d.tag || 'am', renotify: true, data: { url: './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { try { await c.focus(); return; } catch (x) { /* try next */ } } }
    if (self.clients.openWindow) await self.clients.openWindow('./');
  })());
});

// Always ask the network for the page itself so the Home Screen app never gets stuck on an old copy.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.mode !== 'navigate') return;
  e.respondWith(fetch(r, { cache: 'no-store' }).catch(() => caches.match(r).then(x => x || Response.error())));
});
