const CACHE_NAME = 'daily-bible-v1';
const ASSETS = [
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