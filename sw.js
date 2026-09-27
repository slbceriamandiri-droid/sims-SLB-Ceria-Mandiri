const CACHE_NAME = 'sims-ceria-v2';

// Daftar aset inti yang di-precache
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './Logo_Ceria_Mandiri_-01-1-removebg-preview.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://unpkg.com/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  // Memaksa SW baru langsung aktif tanpa menunggu tab ditutup
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Mengunduh aset satu per satu agar jika ada 1 file gagal, install SW tetap berhasil
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[PWA] Gagal meng-cache resource: ${asset}`, err);
        }
      }
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Ambil alih kontrol semua tab yang terbuka secara langsung
      self.clients.claim(),
      // Hapus cache versi lama
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log(`[PWA] Menghapus cache lama: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Abaikan request selain GET, request ke Supabase API, atau skema non-http (seperti chrome-extension)
  if (
    request.method !== 'GET' || 
    url.hostname.includes('supabase.co') || 
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // 2. Strategi Network-First untuk Dokumen HTML (index.html / root)
  // Agar pengguna selalu mendapatkan update versi aplikasi terbaru saat ONLINE,
  // tetapi tetap bisa dibuka dari cache saat OFFLINE.
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Simpan salinan terbaru ke cache
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika offline, ambil dari cache
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // 3. Strategi Cache-First untuk Aset Statis (Gambar, Font, CDN CSS/JS)
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Jika belum ada di cache, ambil dari jaringan lalu simpan ke cache
      return fetch(request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(err => {
          console.warn(`[PWA] Fetch gagal untuk: ${request.url}`, err);
        });
    })
  );
});
