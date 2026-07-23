const CACHE_NAME = "dreamapp-v3";
const ASSETS = [
    "./",
    "./index.html",
    "./css/variables.css",
    "./css/base.css",
    "./css/components.css",
    "./css/layout.css",
    "./js/storage.js",
    "./js/theme.js",
    "./js/utils.js",
    "./js/auth.js",
    "./js/dreams.js",
    "./js/stats.js",
    "./js/ai-analysis.js",
    "./js/voice.js",
    "./js/recurring.js",
    "./js/app.js",
    "https://cdn.jsdelivr.net/npm/chart.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
