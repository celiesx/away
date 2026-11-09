// Away Message service worker v2: push notifications for DMs and @mentions, hides them while the app is open (except streams), and always loads the newest page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
let skipped = 0;
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  e.waitUntil((async () => {
    // If the person is already looking at that chat, show it silently and drop it right away.
    let seen = false;
    try {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const asks = all.map(c => new Promise(res => {
        const ch = new MessageChannel(); const t = setTimeout(() => res(false), 500);
        ch.port1.onmessage = ev => { clearTimeout(t); res(ev.data === true); };
        try { c.postMessage({ type: 'viewing', tag: d.tag || '' }, [ch.port2]); } catch (x) { clearTimeout(t); res(false); }
      }));
      seen = (await Promise.all(asks)).some(Boolean);
    } catch (x) { seen = false; }
    // iPhone can drop the push subscription if too many pushes in a row show nothing, so every third one is still shown (and closed).
    if (seen && skipped < 2) { skipped++; return; }
    if (!seen) skipped = 0;
    await self.registration.showNotification(d.title || 'Away Message', {
      body: d.body || '', icon: 'icon-192.png', tag: d.tag || 'am', renotify: !seen, silent: seen, data: { url: './' }
    });
    if (seen) { skipped = 0; try { const ns = await self.registration.getNotifications({ tag: d.tag || 'am' }); ns.forEach(n => n.close()); } catch (x) { /* ignore */ } }
  })());
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
