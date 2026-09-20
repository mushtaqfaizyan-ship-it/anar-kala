const CACHE_NAME = "anar-kala-v1";

const FILES_TO_CACHE = [
  "/anar-kala/",
  "/anar-kala/index.html",
  "/anar-kala/style.css",
  "/anar-kala/script.js",
  "/anar-kala/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
