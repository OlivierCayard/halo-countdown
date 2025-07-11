self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('Service Worker: Activated');
});

self.addEventListener('fetch', (event) => {
  // Optional caching logic (basic passthrough for now)
});