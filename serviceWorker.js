const CACHE_NAME = 'daily-bible-v2';
const ASSETS = [
    './',
    './index.html',
    './assets/css/normalize.css',
    './assets/css/style.css',
    './assets/css/theme.css',
    './assets/js/migration.js',
    './assets/js/indexedDB.js',
    './assets/js/TTS.js',
    './assets/js/script.js',
    './assets/imgs/logo1.svg',
    './assets/imgs/logo2.svg',
    './assets/imgs/logo3.svg',
    './assets/imgs/voice.svg',
    './assets/imgs/cancelVoice.svg',
    './assets/imgs/bg_spring_light.webp',
    './assets/imgs/bg_spring_night.webp',
    './assets/imgs/bg_summer_light.webp',
    './assets/imgs/bg_summer_night.webp',
    './assets/imgs/bg_autumn_light.webp',
    './assets/imgs/bg_autumn_night.webp',
    './assets/imgs/bg_winter_light.webp',
    './assets/imgs/bg_winter_night.webp',
    './assets/font/Pretendard-Regular.woff',
    './assets/font/Pretendard-Medium.woff',
    './assets/font/Pretendard-SemiBold.woff',
    './assets/font/Pretendard-Bold.woff',
    './assets/font/Pretendard-ExtraBold.woff',
    './assets/favicons/manifest.json',
    './assets/favicons/favicon.ico',
    './assets/favicons/favicon-16x16.png',
    './assets/favicons/favicon-32x32.png',
    './assets/favicons/favicon-96x96.png',
    './assets/favicons/android-icon-192x192.png',
    './assets/favicons/android-icon-144x144.png',
    './assets/favicons/apple-icon-57x57.png',
    './assets/favicons/apple-icon-60x60.png',
    './assets/favicons/apple-icon-72x72.png',
    './assets/favicons/apple-icon-76x76.png',
    './assets/favicons/apple-icon-114x114.png',
    './assets/favicons/apple-icon-120x120.png',
    './assets/favicons/apple-icon-144x144.png',
    './assets/favicons/apple-icon-152x152.png',
    './assets/favicons/apple-icon-180x180.png',
    './assets/favicons/ms-icon-144x144.png',
    './data/개역한글.json',
    './data/개역개정.json',
    './data/guide/mccheyne.json',
];

// 설치할 때 캐시에 다 담아
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

// 요청 올 때 캐시 먼저, 없으면 네트워크
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});

// 새 버전 활성화 시 구버전 캐시 삭제
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
});