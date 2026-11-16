/* Service worker: офлайн-кэш однофайловой игры.
   Версия подставляется при сборке (node tools/build.js). */
var VERSION = '__BUILD__';
var CACHE = 'meow-orbit-' + VERSION;

var ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function remember(req, res) {
  if (!res || !res.ok) return res;
  var copy = res.clone();
  caches.open(CACHE).then(function (c) { c.put(req, copy); });
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;

  // навигация: сразу из кэша, сеть обновляет копию в фоне
  if (req.mode === 'navigate') {
    var fresh = fetch(req).then(function (r) {
      return remember('./index.html', r);
    });
    e.waitUntil(fresh.catch(function () {}));
    e.respondWith(
      caches.match('./index.html').then(function (hit) {
        return hit || fresh;
      })
    );
    return;
  }

  // остальное: сначала кэш, потом сеть
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (r) {
        return remember(req, r);
      }).catch(function () { return hit; });
    })
  );
});
