/**
 * 추천 도서 DB 공유 캐시.
 *
 * data/book-recommendations.json은 ~3MB. index/detail/recommendations 페이지가
 * 각각 fetch하면 한 세션에 같은 파일 3번 받음. sessionStorage + in-memory promise로
 * 한 번만 받고 모두가 공유.
 *
 * 사용:
 *   const data = await RecsCache.load();         // recommendations DB
 *   const data = await RecsCache.load('kindergarten-curated');  // 다른 파일도 캐시
 */
(function () {
  'use strict';

  const FILES = {
    'book-recommendations': 'data/book-recommendations.json',
    'kindergarten-curated': 'data/kindergarten-curated.json',
  };

  const memo = new Map();  // name → Promise<data>

  function load(name) {
    const key = name || 'book-recommendations';
    if (memo.has(key)) return memo.get(key);

    const promise = (async () => {
      // sessionStorage 1차 조회 — 같은 세션에서 페이지 이동 시 재사용
      try {
        const cached = sessionStorage.getItem('recsCache.' + key);
        if (cached) return JSON.parse(cached);
      } catch (_) { /* quota/JSON 오류 무시 */ }

      const path = FILES[key];
      if (!path) throw new Error(`Unknown recs cache key: ${key}`);

      const res = await fetch(path);
      if (!res.ok) throw new Error(`Recs fetch failed: HTTP ${res.status}`);
      const data = await res.json();

      // sessionStorage에도 저장 (실패 무시 — 5MB quota 한도)
      try {
        sessionStorage.setItem('recsCache.' + key, JSON.stringify(data));
      } catch (_) { /* 용량 초과 시 in-memory만 */ }

      return data;
    })();

    memo.set(key, promise);
    promise.catch(() => memo.delete(key));  // 실패 시 다음 호출은 재시도
    return promise;
  }

  function clear() {
    memo.clear();
    Object.keys(FILES).forEach(k => {
      try { sessionStorage.removeItem('recsCache.' + k); } catch (_) {}
    });
  }

  window.RecsCache = { load, clear };
})();
