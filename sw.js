const CACHE_NAME = 'sims-ceria-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './Logo_Ceria_Mandiri_-01-1-removebg-preview.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://unpkg.com/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // PENTING: Jangan pernah melakukan cache pada request API Supabase atau request POST/PUT/DELETE
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
    return; // Biarkan request berjalan normal ke server tanpa campur tangan Service Worker
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - kembalikan response dari cache lokal
        if (response) {
          return response;
        }
        
        // Jika tidak ada di cache, ambil dari jaringan
        return fetch(event.request).catch(err => {
            console.warn('PWA Fetch Error:', err);
            // Anda bisa mengembalikan halaman offline khusus di sini jika offline
        });
      })
  );
});
