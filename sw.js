// 맘스북스 서비스워커 — 보수적 캐싱(설치형 PWA + 오프라인 기본)
// 전략:
//   - 데이터(JSON, /data/) : network-first (추천 데이터 갱신 즉시 반영, 오프라인 시 캐시)
//   - 정적 자산(css/js/png/svg): cache-first (?v= 캐시버스팅으로 안전)
//   - HTML/네비게이션      : network-first (캐시버스터·콘텐츠 최신, 오프라인 폴백)
//   - 교차출처(API·폰트·Supabase 등): 가로채지 않음(브라우저 기본)
const CACHE = 'momsbooks-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 교차출처는 손대지 않음

  if (url.pathname.startsWith('/data/') || url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(req));
  } else if (/\.(css|js|png|svg|ico|webp)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
  } else {
    // HTML / 네비게이션
    event.respondWith(networkFirst(req));
  }
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) {
    const cache = await caches.open(CACHE);
    cache.put(req, res.clone());
  }
  return res;
}
