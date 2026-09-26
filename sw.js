/* Offline cache (PWA). Bump CACHE when shipping new files. */
const CACHE = 'dreadhollow-v78';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css', 'assets/icon.svg',
  'js/core/ns.js', 'js/i18n/i18n.js', 'js/i18n/en.js', 'js/i18n/bg.js', 'js/data/content.js', 'js/data/economy.js', 'js/data/artifacts.js', 'js/data/deeds.js',
  'js/core/art.js', 'js/core/gfx.js', 'js/core/paint_heroes.js', 'js/core/paint_enemies.js', 'js/core/paint_bosses.js', 'js/core/paint_props.js', 'js/core/paint_landmarks.js', 'js/core/stageart.js', 'js/core/icons.js',
  'js/core/audio.js', 'js/core/input.js', 'js/core/platform.js', 'js/core/save.js', 'js/services/ads.js', 'js/services/iap.js', 'js/services/firebase.js', 'js/services/cloud.js',
  'js/vendor/firebase/firebase-app.js', 'js/vendor/firebase/firebase-auth.js', 'js/vendor/firebase/firebase-firestore-lite.js',
  'js/meta/meta.js', 'js/game/view.js', 'js/game/run.js', 'js/game/combat.js', 'js/game/abilities.js', 'js/game/bosses.js', 'js/game/render.js', 'js/game/vfx.js', 'js/game/artifacts.js', 'js/game/halls.js', 'js/game/secrets.js', 'js/game/hazards.js', 'js/game/landmarks.js', 'js/game/weather.js',
  'js/ui/ui.js', 'js/ui/screens.js', 'js/ui/popups.js', 'js/ui/runui.js', 'js/ui/menuscene.js', 'js/main.js',
  'assets/fonts/cinzel-latin-700-normal.woff2', 'assets/fonts/alegreya-sans-latin-500-normal.woff2', 'assets/fonts/alegreya-sans-latin-800-normal.woff2',
  'assets/fonts/alegreya-sans-cyrillic-500-normal.woff2', 'assets/fonts/alegreya-sans-cyrillic-800-normal.woff2',
  'assets/fonts/press-start-2p-latin-400-normal.woff2', 'assets/fonts/press-start-2p-cyrillic-400-normal.woff2',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // network first so updates arrive quickly, cache as offline fallback
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match(e.request)));
});
