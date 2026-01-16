// Service Worker básico para PWA
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Aquí podríamos cachear cosas para que funcione offline, 
  // por ahora lo dejamos simple para que siempre cargue fresco.
  e.respondWith(fetch(e.request));
});