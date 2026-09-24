// sw.js
// Service Worker para PWA Offline-First (Cache de assets estáticos)

const CACHE_NAME = 'controlpoint-pwa-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/supabaseClient.js',
    './js/biometrics.js',
    './js/offlineStore.js',
    './js/app.js',
    'https://unpkg.com/lucide@latest',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js',
    'https://cdn.jsdelivr.net/npm/dayjs@1/locale/pt-br.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pré-cacheando arquivos estáticos...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
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

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
