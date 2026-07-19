// Waypoint service worker — caches the app itself and map tiles so the app
// still opens and shows previously-viewed areas with no signal.
// Bump CACHE_NAME (v1 -> v2 etc) whenever index.html changes, so old
// cached copies get replaced instead of sticking around forever.
const CACHE_NAME = "waypoint-cache-v2";

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(["./", "./index.html"]).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = req.url;
  const isTile = url.indexOf("tile.openstreetmap.org") !== -1 || url.indexOf("arcgisonline.com") !== -1;
  const isAppOrLib =
    url.indexOf(self.location.origin) === 0 ||
    url.indexOf("cdnjs.cloudflare.com") !== -1 ||
    url.indexOf("fonts.googleapis.com") !== -1 ||
    url.indexOf("fonts.gstatic.com") !== -1;

  // Leave Firebase (and anything else) alone — that needs a live connection anyway.
  if (!isTile && !isAppOrLib) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req)
          .then(function (response) {
            cache.put(req, response.clone());
            return response;
          })
          .catch(function () {
            return cached; // will be undefined if never cached — nothing more we can do offline
          });
      });
    })
  );
});
