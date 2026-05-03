/**
 * 맘스북스 — Library API (via Cloudflare Worker)
 */

(function (window) {
  'use strict';

  const WORKER_URL = window.WORKER_URL || 'https://book-tracker-aladin.obangti.workers.dev';

  const LibraryAPI = {
    /**
     * ISBN으로 소장 도서관 검색
     */
    async searchLibraries(isbn, options = {}) {
      const params = new URLSearchParams({
        isbn,
        ...(options.region && { region: options.region }),
        ...(options.pageSize && { pageSize: options.pageSize }),
      });

      const url = `${WORKER_URL}/library/search?${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Library search failed: ${res.status}`);

      const data = await res.json();
      if (!data.response || data.response.resultNum === 0) return [];

      const docs = data.response.docs || [];
      return (Array.isArray(docs) ? docs : [docs]).map(d => d.doc);
    },

    /**
     * 특정 도서관의 대출 가능 여부 조회
     */
    async checkAvailability(isbn, libCode) {
      const params = new URLSearchParams({ isbn, libCode });
      const url = `${WORKER_URL}/library/available?${params}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Availability check failed: ${res.status}`);

      const data = await res.json();
      const result = data.response?.result || {};

      return {
        available: result.loanAvailable === 'Y',
        hasBook: result.hasBook === 'Y',
        libName: result.libName || '',
      };
    },

    /**
     * 위치 기반 가까운 도서관 찾기
     */
    async findNearbyLibraries(isbn, maxDistance = 5) {
      const position = await this.getCurrentPosition();
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      const region = this.estimateRegion(userLat, userLng);
      const libraries = await this.searchLibraries(isbn, { region: region.sido, pageSize: 50 });

      const withDistance = libraries.map(lib => {
        const distance = this.calculateDistance(
          userLat, userLng,
          parseFloat(lib.latitude) || 0,
          parseFloat(lib.longitude) || 0
        );
        return { ...lib, distance };
      });

      return withDistance
        .filter(lib => lib.distance <= maxDistance && lib.latitude && lib.longitude)
        .sort((a, b) => a.distance - b.distance);
    },

    getCurrentPosition() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('위치 서비스를 지원하지 않는 브라우저입니다.'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, error => {
          let msg = '위치 정보를 가져올 수 없습니다.';
          if (error.code === 1) msg = '위치 권한이 거부되었습니다.';
          reject(new Error(msg));
        }, { timeout: 10000 });
      });
    },

    calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = this.deg2rad(lat2 - lat1);
      const dLng = this.deg2rad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },

    deg2rad(deg) { return deg * (Math.PI / 180); },

    estimateRegion(lat, lng) {
      if (lat >= 37.4 && lat <= 37.7 && lng >= 126.7 && lng <= 127.2) return { sido: '11' };
      if (lat >= 37.0 && lat <= 38.3 && lng >= 126.5 && lng <= 127.7) return { sido: '31' };
      return { sido: null };
    },

    /**
     * 카카오맵으로 도서관 위치 열기
     */
    openMap(lib) {
      const lat = parseFloat(lib.latitude);
      const lng = parseFloat(lib.longitude);
      const name = encodeURIComponent(lib.libName || '도서관');

      // 모바일: 카카오맵 앱 우선, 없으면 웹
      const appUrl = `kakaomap://look?p=${lat},${lng}&name=${name}`;
      const webUrl = `https://map.kakao.com/link/map/${name},${lat},${lng}`;

      if (/iPhone|iPad|Android/i.test(navigator.userAgent)) {
        // 앱 열기 시도
        window.location.href = appUrl;
        // 1초 후 앱 안 열리면 웹으로
        setTimeout(() => { window.open(webUrl, '_blank'); }, 1000);
      } else {
        // PC: 웹 새창
        window.open(webUrl, '_blank');
      }
    },

    /**
     * 전화 걸기
     */
    callLibrary(tel) {
      if (!tel) return;
      const cleaned = tel.replace(/\D/g, '');
      window.location.href = `tel:${cleaned}`;
    },
  };

  window.LibraryAPI = LibraryAPI;

})(window);
