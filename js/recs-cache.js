/**
 * Compatibility facade for pages that still expect recommendation metadata.
 * Curated lists are no longer served from the static JSON files.
 */
(function () {
  'use strict';

  const EMPTY_DATA = Object.freeze({
    meta: Object.freeze({ sources: Object.freeze([]) }),
    books: Object.freeze({}),
    awards: Object.freeze({}),
  });
  const LEGACY_CACHE_KEYS = [
    'recsCache.book-recommendations',
    'recsCache.kindergarten-curated',
  ];

  function clearLegacyCache() {
    LEGACY_CACHE_KEYS.forEach(key => {
      try { sessionStorage.removeItem(key); } catch (_) {}
    });
  }

  function load(name) {
    clearLegacyCache();
    if (name && name !== 'book-recommendations') {
      return Promise.reject(new Error(`Unknown recs cache key: ${name}`));
    }
    return Promise.resolve(EMPTY_DATA);
  }

  function clear() {
    clearLegacyCache();
  }

  window.RecsCache = { load, clear };
})();
