const CACHE_NAME = "satsang-cache-v4";
const ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/guruji-01.png"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (e) => {
  // Only cache GET requests and skip Firebase / external API requests to prevent cache issues
  if (
    e.request.method !== "GET" || 
    e.request.url.includes("firestore.googleapis.com") || 
    e.request.url.includes("identitytoolkit") ||
    e.request.url.includes("securetoken.googleapis.com")
  ) {
    return;
  }
  
  const url = new URL(e.request.url);
  
  // Do not intercept or cache root HTML / index.html to avoid stale bundle references on redeployment
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return;
  }
  
  // Cache-First strategy for static assets
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch a fresh version in the background to update the cache
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {/* Ignore background network failures */});
        
        return cachedResponse;
      }
      
      return fetch(e.request);
    })
  );
});
