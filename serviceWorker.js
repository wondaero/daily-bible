//APP_VERSION: HTML/CSS/JS를 고쳤을 때 직접 올린다.
//DATA_VERSION: data/bible 내용의 해시. `node tools/split-bible.js`가 자동으로 갱신한다.
//둘 중 하나만 바뀌어도 캐시 이름이 달라져 구버전이 통째로 버려진다.
const APP_VERSION = 6;
const DATA_VERSION = 'ac930815';
const CACHE_NAME = `daily-bible-v${APP_VERSION}-${DATA_VERSION}`;
const BOOK_COUNT = 66;

//없으면 앱이 아예 못 도는 것들. 하나라도 실패하면 설치를 실패시킨다.
const CORE_ASSETS = [
    './',
    './index.html',
    './assets/css/normalize.css',
    './assets/css/style.css',
    './assets/css/theme.css',
    './assets/js/migration.js',
    './assets/js/indexedDB.js',
    './assets/js/TTS.js',
    './assets/js/script.js',
    './data/bible/meta.json',
    './data/guide/mccheyne.json',
];

//없어도 앱은 돈다(그림/폰트/아이콘/성경 본문).
//실패해도 설치를 막지 않고, 못 받은 건 fetch 핸들러가 쓸 때 담는다.
const OPTIONAL_ASSETS = [
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
];

//성경 본문은 권 단위로 쪼개져 있다. 개역한글만 미리 받아두고,
//개역개정(앱 전용)은 실제로 열어본 권만 fetch 핸들러가 캐시에 담는다.
for (let i = 1; i <= BOOK_COUNT; i++) {
    OPTIONAL_ASSETS.push(`./data/bible/han/${i}.json`);
}

//한 번에 너무 많이 요청하지 않도록 나눠서 담는다.
const PRECACHE_CHUNK = 8;

async function cacheOptional(cache) {
    let failed = 0;

    for (let i = 0; i < OPTIONAL_ASSETS.length; i += PRECACHE_CHUNK) {
        const chunk = OPTIONAL_ASSETS.slice(i, i + PRECACHE_CHUNK);

        await Promise.all(chunk.map(url =>
            cache.add(url).catch(() => { failed++; })   //실패해도 넘어간다
        ));
    }

    if (failed) console.warn(`[SW] 미리 담지 못한 파일 ${failed}개. 나중에 사용할 때 다시 받는다.`);
}

// 설치할 때 캐시에 담는다. 핵심 파일만 필수.
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            await cache.addAll(CORE_ASSETS);   //하나라도 실패하면 설치 실패
            await cacheOptional(cache);        //실패해도 설치는 성공

            //기본 동작은 '열려 있는 화면이 전부 닫힐 때까지 대기'라 앱에서 갱신이 늦게 반영된다.
            //다음 실행에 바로 적용되도록 대기를 건너뛴다.
            await self.skipWaiting();
        })
    );
});

// 요청 올 때 캐시 먼저, 없으면 네트워크(받은 건 캐시에 담아둔다)
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;

            return fetch(e.request).then(res => {
                //미리 받아두지 않은 파일(개역개정 본문 등)도 한 번 받으면 오프라인에서 쓸 수 있게 한다
                if (res && res.ok && res.type === 'basic') {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
                }

                return res;
            });
        })
    );
});

// 새 버전 활성화 시 구버전 캐시 삭제
// 여기서 지우는 건 CacheStorage(받아둔 파일)뿐이다. IndexedDB의 읽기 기록/메모는 건드리지 않는다.
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())   //이미 열려 있는 화면도 새 워커가 넘겨받는다
    );
});