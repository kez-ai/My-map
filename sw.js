const CACHE = 'waypoint-v4-themes-leaderboard-fix';
self.addEventListener('install', e=>{
  self.skipWaiting();
  // Don't pre-cache './' aggressively - let network win for HTML to avoid stale bugs
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(['./leaflet.css'].filter(()=>false)).catch(()=>{})));
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=> Promise.all(keys.filter(k=>k!==CACHE).map(k=> caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});
self.addEventListener('fetch', e=>{
  const url = e.request.url;
  const isTile = url.includes('tile.openstreetmap.org') || url.includes('arcgisonline.com');
  const isLib = url.includes('leaflet') || url.includes('fonts.googleapis') || url.includes('fonts.gstatic') || url.includes('firebase');
  if(isTile || isLib){
    e.respondWith(
      caches.open(CACHE).then(cache=> cache.match(e.request).then(hit=>{
        const fetchP = fetch(e.request).then(res=>{
          if(res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(()=> hit);
        return hit || fetchP;
      }))
    );
    return;
  }
  // For HTML and everything else: network-first, fallback to cache
  e.respondWith(
    fetch(e.request).then(res=>{
      // don't cache HTML to avoid "nothing clicks" stale bug
      return res;
    }).catch(()=> caches.match(e.request))
  );
});
self.addEventListener('message', e=>{
  if(e.data==='SKIP_WAITING') self.skipWaiting();
});
