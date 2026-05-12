/**
 * 맘스북스 — Library API (via Cloudflare Worker proxy)
 *
 * Worker endpoints:
 *   GET /library/search?isbn=...&region=11&pageSize=20
 *   GET /library/available?isbn=...&libCode=111001
 */

(function (window) {
  'use strict';

  const REGION_BOUNDS = [
    { sido: '11', name: '서울',   lat: [37.4, 37.7], lng: [126.7, 127.2] },
    { sido: '23', name: '인천',   lat: [37.3, 37.6], lng: [126.3, 126.8] },
    { sido: '31', name: '경기',   lat: [36.9, 38.3], lng: [126.2, 127.8] },
    { sido: '21', name: '부산',   lat: [35.0, 35.4], lng: [128.7, 129.3] },
    { sido: '22', name: '대구',   lat: [35.6, 36.1], lng: [128.3, 128.8] },
    { sido: '25', name: '대전',   lat: [36.2, 36.5], lng: [127.2, 127.6] },
    { sido: '24', name: '광주',   lat: [35.0, 35.3], lng: [126.7, 127.0] },
    { sido: '26', name: '울산',   lat: [35.4, 35.6], lng: [128.9, 129.4] },
    { sido: '29', name: '세종',   lat: [36.4, 36.6], lng: [127.1, 127.4] },
    { sido: '32', name: '강원',   lat: [37.0, 38.6], lng: [127.7, 129.4] },
    { sido: '33', name: '충북',   lat: [36.4, 37.2], lng: [127.4, 128.5] },
    { sido: '34', name: '충남',   lat: [36.0, 37.0], lng: [126.1, 127.4] },
    { sido: '35', name: '전북',   lat: [35.5, 36.2], lng: [126.4, 127.8] },
    { sido: '36', name: '전남',   lat: [34.1, 35.5], lng: [125.9, 127.9] },
    { sido: '37', name: '경북',   lat: [35.5, 37.0], lng: [128.0, 129.6] },
    { sido: '38', name: '경남',   lat: [34.6, 35.6], lng: [127.6, 129.4] },
    { sido: '39', name: '제주',   lat: [33.0, 33.6], lng: [126.1, 126.9] },
  ];

  const LibraryAPI = {

    getRegionOptions() {
      return REGION_BOUNDS.map(r => ({ code: r.sido, name: r.name }));
    },

    /**
     * ISBN + 지역코드로 소장 도서관 목록 조회 (libSrchByBook)
     * region 필수 — GPS로 추정 후 전달.
     */
    async searchLibraries(isbn, options = {}) {
      const workerUrl = window.WORKER_URL;
      if (!workerUrl) return [];

      const params = new URLSearchParams({ isbn: String(isbn).replace(/\D/g, '') });
      if (options.region) params.set('region', options.region);
      if (options.pageSize) params.set('pageSize', String(options.pageSize));

      const res = await fetch(`${workerUrl}/library/search?${params}`);
      if (!res.ok) throw new Error(`Library search failed: ${res.status}`);

      const data = await res.json();
      const rawLibs = data.response?.libs;
      if (!rawLibs) return [];
      const arr = Array.isArray(rawLibs) ? rawLibs : [rawLibs];
      return arr.map(item => item.lib || item).filter(Boolean);
    },

    /**
     * 특정 도서관의 대출 가능 여부 (bookExist)
     */
    async checkAvailability(isbn, libCode) {
      const workerUrl = window.WORKER_URL;
      if (!workerUrl) return { available: null, hasBook: false };

      const params = new URLSearchParams({
        isbn: String(isbn).replace(/\D/g, ''),
        libCode,
      });
      const res = await fetch(`${workerUrl}/library/available?${params}`);
      if (!res.ok) throw new Error(`Availability check failed: ${res.status}`);

      const data = await res.json();
      const result = data.response?.result || {};
      return {
        available: result.loanAvailable === 'Y',
        hasBook:   result.hasBook === 'Y',
      };
    },

    /**
     * GPS 기반 가까운 도서관 찾기.
     * - GPS 허용: 거리순 정렬 + 상위 5개 대출 가능 여부 확인
     * - GPS 거부: { needsRegion: true } 반환 → UI에서 지역 선택 안내
     */
    async findNearbyLibraries(isbn) {
      const cleanIsbn = String(isbn).replace(/\D/g, '');
      if (!cleanIsbn) return { libraries: [], regionName: null };

      let userLat, userLng, region, regionName;

      try {
        const pos = await this._getCurrentPosition();
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        const r = this._estimateRegion(userLat, userLng);
        region = r.sido;
        regionName = r.name;
      } catch (e) {
        return { libraries: [], regionName: null, needsRegion: true };
      }

      if (!region) return { libraries: [], regionName: null, needsRegion: true };

      const latKey = Math.round(userLat * 100);
      const lngKey = Math.round(userLng * 100);
      const cacheKey = `libsearch_nearby_${cleanIsbn}_${region}_${latKey}_${lngKey}`;
      const cached = this._getCache(cacheKey);
      if (cached) return cached;

      const libraries = await this.searchLibraries(cleanIsbn, { region, pageSize: 20 });
      if (!libraries.length) {
        const result = { libraries: [], regionName };
        this._setCache(cacheKey, result);
        return result;
      }

      // 거리 계산 후 정렬
      const withDistance = libraries.map(lib => {
        const libLat = parseFloat(lib.latitude);
        const libLng = parseFloat(lib.longitude);
        const distance = (libLat && libLng)
          ? this._calcDistance(userLat, userLng, libLat, libLng)
          : 9999;
        return { ...lib, distance };
      }).sort((a, b) => a.distance - b.distance);

      // 가까운 5개 대출 여부 병렬 확인
      const top5 = withDistance.slice(0, 5);
      const withAvail = await Promise.all(top5.map(async lib => {
        try {
          const avail = await this.checkAvailability(cleanIsbn, lib.libCode);
          return { ...lib, ...avail };
        } catch {
          return { ...lib, available: null };
        }
      }));

      // 대출 가능 먼저
      withAvail.sort((a, b) => {
        if (a.available === true && b.available !== true) return -1;
        if (b.available === true && a.available !== true) return 1;
        return a.distance - b.distance;
      });

      const result = { libraries: withAvail, regionName };
      this._setCache(cacheKey, result);
      return result;
    },

    async findLibrariesByRegion(isbn, region) {
      const cleanIsbn = String(isbn).replace(/\D/g, '');
      if (!cleanIsbn || !region) return { libraries: [], regionName: null, needsRegion: true };

      const regionInfo = REGION_BOUNDS.find(r => r.sido === region);
      const regionName = regionInfo ? regionInfo.name : null;
      const cacheKey = `libsearch_region_${cleanIsbn}_${region}`;
      const cached = this._getCache(cacheKey);
      if (cached) return cached;

      const libraries = await this.searchLibraries(cleanIsbn, { region, pageSize: 20 });
      if (!libraries.length) {
        const result = { libraries: [], regionName };
        this._setCache(cacheKey, result);
        return result;
      }

      const top5 = libraries.slice(0, 5);
      const withAvail = await Promise.all(top5.map(async lib => {
        try {
          const avail = await this.checkAvailability(cleanIsbn, lib.libCode);
          return { ...lib, distance: null, ...avail };
        } catch {
          return { ...lib, distance: null, available: null };
        }
      }));

      withAvail.sort((a, b) => {
        if (a.available === true && b.available !== true) return -1;
        if (b.available === true && a.available !== true) return 1;
        return 0;
      });

      const result = { libraries: withAvail, regionName };
      this._setCache(cacheKey, result);
      return result;
    },

    _getCurrentPosition() {
      if (this._cachedPos && Date.now() < this._cachedPosExpiry) {
        return Promise.resolve(this._cachedPos);
      }
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(pos => {
          this._cachedPos = pos;
          this._cachedPosExpiry = Date.now() + 5 * 60 * 1000;
          resolve(pos);
        }, () => {
          reject(new Error('위치 권한이 거부되었습니다.'));
        }, { timeout: 5000 });
      });
    },

    prefetchPosition() {
      this._getCurrentPosition().catch(() => {});
    },

    _estimateRegion(lat, lng) {
      for (const r of REGION_BOUNDS) {
        if (lat >= r.lat[0] && lat <= r.lat[1] && lng >= r.lng[0] && lng <= r.lng[1]) {
          return { sido: r.sido, name: r.name };
        }
      }
      return { sido: null, name: null };
    },

    _calcDistance(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) ** 2 +
                Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
                Math.sin(dLng/2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    _getCache(key) {
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const { data, expires } = JSON.parse(raw);
        if (Date.now() > expires) { sessionStorage.removeItem(key); return null; }
        return data;
      } catch { return null; }
    },

    _setCache(key, data, ttlMs = 3600000) {
      try {
        sessionStorage.setItem(key, JSON.stringify({ data, expires: Date.now() + ttlMs }));
      } catch {}
    },
  };

  window.LibraryAPI = LibraryAPI;

})(window);
