/**
 * 書架 — API Layer
 *
 * Wraps Kakao Book Search API + best-effort AR BookFinder lookup.
 * Exposed on window.API.
 *
 * NOTE on language detection / level hints:
 *   Kakao 책 검색 응답에는 카테고리(category_name) 필드가 없습니다.
 *   "비슷한 수준"은 책의 title + contents에서 학년·연령 키워드를 추출해
 *   같은 키워드로 다시 검색하는 방식으로 구현합니다.
 */

(function () {
  'use strict';

  const KAKAO_BASE = 'https://dapi.kakao.com/v3/search/book';
  const ALLORIGINS = 'https://api.allorigins.win/raw?url=';

  // Cloudflare Worker proxy (set in config.js as window.WORKER_URL)
  // 비어 있으면 알라딘 호출은 모두 [] 반환 — 카카오만으로도 검색은 작동
  const workerUrl = () => (window.WORKER_URL || '').replace(/\/+$/, '');

  // ── HTTP wrapper ─────────────────────────────────────────────

  async function kakaoFetch(params) {
    if (!window.KAKAO_API_KEY) {
      console.warn('[API] KAKAO_API_KEY 미설정 — mock 응답 반환');
      return { documents: mockDocuments(params.query), meta: { is_end: true, total_count: 1 } };
    }
    const qs = new URLSearchParams(params);
    const res = await fetch(`${KAKAO_BASE}?${qs}`, {
      headers: { 'Authorization': `KakaoAK ${KAKAO_API_KEY}` },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Kakao API ${res.status}: ${errText}`);
    }
    return res.json();
  }

  // ── Normalization ────────────────────────────────────────────

  function normalize(doc) {
    // Kakao returns "10digit 13digit" in isbn — pick the 13-digit one
    const isbnParts = (doc.isbn || '').trim().split(/\s+/);
    const isbn = isbnParts.find(p => p.length === 13) || isbnParts[0] || '';

    const titleClean = (doc.title || '').trim();
    return {
      isbn,
      title:     titleClean,
      authors:   doc.authors || [],
      publisher: doc.publisher || '',
      thumbnail: doc.thumbnail || '',
      contents:  doc.contents || '',
      url:       doc.url || '',
      datetime:  doc.datetime || '',
      price:     doc.price || 0,
      language:  detectLanguage(titleClean, doc.contents || ''),
      _hints:    extractLevelHints(titleClean + ' ' + (doc.contents || '')),
    };
  }

  function detectLanguage(title, contents) {
    const text = title + ' ' + (contents || '');
    const hasHangul = /[가-힯]/.test(text);
    const hasLatin  = /[a-zA-Z]{4,}/.test(title);
    if (!hasHangul && hasLatin) return 'en';
    return 'ko';
  }

  function extractLevelHints(text) {
    const hints = new Set();
    if (/유아|영아|0\s*[-~]\s*3\s*세|걸음마/.test(text))   hints.add('유아');
    if (/저학년|초등\s*1\s*[-~]\s*2|7\s*세|8\s*세/.test(text)) hints.add('저학년');
    if (/중학년|초등\s*3\s*[-~]\s*4|9\s*세|10\s*세/.test(text)) hints.add('중학년');
    if (/고학년|초등\s*5\s*[-~]\s*6|11\s*세|12\s*세/.test(text)) hints.add('고학년');
    if (/초등|초등학교/.test(text))   hints.add('초등');
    if (/중학|중학교|10대/.test(text)) hints.add('중학');
    if (/어린이|아동/.test(text))     hints.add('어린이');
    if (/그림책/.test(text))          hints.add('그림책');
    return Array.from(hints);
  }

  // ── Public search functions ──────────────────────────────────

  async function searchByIsbn(isbn) {
    const norm = String(isbn || '').replace(/\D/g, '');
    if (norm.length !== 10 && norm.length !== 13) {
      throw new Error('ISBN은 10자리 또는 13자리여야 합니다');
    }
    const data = await kakaoFetch({ query: norm, target: 'isbn', size: 1 });
    return (data.documents || [])[0] ? normalize(data.documents[0]) : null;
  }

  async function searchByTitle(title, opts = {}) {
    if (!title) return [];
    const data = await kakaoFetch({
      query: title,
      target: 'title',
      size: opts.size || 10,
      page: opts.page || 1,
      sort: opts.sort || 'accuracy',
    });
    return (data.documents || []).map(normalize);
  }

  async function searchByAuthor(author, opts = {}) {
    if (!author) return [];
    const data = await kakaoFetch({
      query: author,
      target: 'person',
      size: opts.size || 10,
      sort: opts.sort || 'accuracy',
    });
    return (data.documents || []).map(normalize);
  }

  async function searchByPublisher(publisher, opts = {}) {
    if (!publisher) return [];
    const data = await kakaoFetch({
      query: publisher,
      target: 'publisher',
      size: opts.size || 10,
      sort: opts.sort || 'latest',
    });
    return (data.documents || []).map(normalize);
  }

  /**
   * 비슷한 수준의 책: 현재 책에서 학년/연령 힌트를 뽑아 같은 키워드로 검색.
   * 가장 구체적인 힌트 우선.
   */
  async function searchSimilarLevel(book, opts = {}) {
    const text = (book.title || '') + ' ' + (book.contents || '');
    const hints = extractLevelHints(text);
    if (hints.length === 0) return [];

    const PRIORITY = ['고학년', '중학년', '저학년', '유아', '그림책', '초등', '중학', '어린이'];
    const pick = PRIORITY.find(h => hints.includes(h));
    if (!pick) return [];

    const data = await kakaoFetch({
      query: pick,
      target: 'title',
      size: opts.size || 12,
      sort: 'latest',
    });
    const norm = String(book.isbn || '').replace(/\D/g, '');
    return (data.documents || [])
      .map(normalize)
      .filter(b => String(b.isbn).replace(/\D/g, '') !== norm);
  }

  // ── AR BookFinder (best-effort) ──────────────────────────────
  /**
   * arbookfind.com은 공식 API가 없고 세션 쿠키 기반 검색이라
   * 클라이언트 → CORS 프록시로 직접 호출 시 안정적이지 않습니다.
   * 시도해보고 실패하면 null을 반환 — UI에서 사용자 입력으로 폴백.
   */
  async function fetchAR(isbn) {
    if (!isbn) return null;
    const norm = String(isbn).replace(/\D/g, '');
    if (norm.length !== 13 && norm.length !== 10) return null;

    try {
      // arbookfind 검색 결과 페이지 (게스트 진입 시도)
      const url = `https://www.arbookfind.com/Default.aspx?cqs=${norm}`;
      const proxied = ALLORIGINS + encodeURIComponent(url);
      const res = await fetch(proxied, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const html = await res.text();

      // 매우 단순한 HTML 파싱 — "BL: 3.5" / "AR Pts: 4.0" / "IL: MG" 식
      const arMatch  = html.match(/BL:\s*([\d.]+)/i);
      const ptsMatch = html.match(/AR\s*Pts:?\s*([\d.]+)/i);
      const ilMatch  = html.match(/IL:\s*([A-Z]+)/i);

      if (!arMatch) return null;
      return {
        ar:     Number(arMatch[1]),
        points: ptsMatch ? Number(ptsMatch[1]) : null,
        il:     ilMatch  ? ilMatch[1] : null,
        source: 'arbookfind.com',
      };
    } catch (e) {
      console.warn('[API] fetchAR failed', e.message);
      return null;
    }
  }

  // ── Aladin (via Cloudflare Worker) ───────────────────────────
  /**
   * 알라딘 OpenAPI는 카카오와 달리 categoryId/categoryName 및 자체 큐레이션
   * "비슷한 책"(OptResult=similarBooks)을 제공합니다. 추천 품질의 핵심.
   * TTBKey는 Worker secret으로 보관되어 클라이언트엔 노출되지 않음.
   */

  async function aladinFetch(endpoint, params) {
    const base = workerUrl();
    if (!base) {
      console.warn('[API] WORKER_URL 미설정 — Aladin 호출 건너뜀');
      return null;
    }
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${base}/aladin/${endpoint}?${qs}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Aladin ${endpoint} ${res.status}`);
    let data;
    try { data = await res.json(); }
    catch (e) { throw new Error(`Aladin ${endpoint} JSON parse failed`); }
    if (data && data.errorCode) {
      throw new Error(`Aladin error ${data.errorCode}: ${data.errorMessage || ''}`);
    }
    return data;
  }

  /**
   * ItemLookUp — ISBN 한 권의 상세 정보.
   * subInfo.similarBookList (Aladin MD 큐레이션) + subInfo.categoryIdList.
   */
  async function aladinLookup(isbn) {
    const norm = String(isbn || '').replace(/\D/g, '');
    if (norm.length !== 13 && norm.length !== 10) return null;
    const data = await aladinFetch('lookup', {
      ItemId: norm,
      ItemIdType: norm.length === 13 ? 'ISBN13' : 'ISBN',
      OptResult: 'ratingInfo,reviewList,similarBooks,categoryIdList',
      Cover: 'Big',
    });
    return (data && data.item && data.item[0]) || null;
  }

  /**
   * ItemSearch — 키워드 검색. categoryId 지정 시 해당 분야 안에서만.
   * QueryType: Title | Author | Publisher | Keyword
   */
  async function aladinSearch({ query, categoryId, queryType = 'Keyword', maxResults = 12, sort = 'Accuracy' }) {
    if (!query) return [];
    const params = {
      Query: query,
      QueryType: queryType,
      SearchTarget: 'Book',
      MaxResults: String(maxResults),
      Sort: sort,
      Cover: 'Big',
    };
    if (categoryId) params.CategoryId = String(categoryId);
    const data = await aladinFetch('search', params);
    return (data && data.item) || [];
  }

  /**
   * ItemList — 카테고리 베스트셀러/신간.
   * QueryType: Bestseller | ItemNewAll | ItemNewSpecial | BlogBest
   */
  async function aladinList({ queryType = 'Bestseller', categoryId, maxResults = 12 }) {
    const params = {
      QueryType: queryType,
      SearchTarget: 'Book',
      MaxResults: String(maxResults),
      Cover: 'Big',
    };
    if (categoryId) params.CategoryId = String(categoryId);
    const data = await aladinFetch('list', params);
    return (data && data.item) || [];
  }

  function normalizeAladin(item) {
    if (!item) return null;
    const isbn13 = (item.isbn13 || item.isbn || '').toString().trim();
    const authorRaw = (item.author || '').toString();
    // 알라딘 author 필드는 "저자1, 저자2 (지은이), 옮긴이 (옮긴이)" 형태
    const authors = authorRaw
      .split(',')
      .map(s => s.replace(/\([^)]*\)/g, '').trim())
      .filter(Boolean);
    const titleClean = (item.title || '').replace(/^.*?:\s*/, '').trim() || (item.title || '').trim();
    return {
      isbn:        isbn13,
      title:       titleClean || (item.title || '').trim(),
      authors,
      publisher:   item.publisher || '',
      thumbnail:   item.cover || '',
      contents:    item.description || '',
      url:         item.link || '',
      datetime:    item.pubDate || '',
      price:       Number(item.priceStandard || 0),
      categoryId:  item.categoryId || null,
      categoryName: item.categoryName || '',
      language:    detectLanguage(item.title || '', item.description || ''),
      _raw:        item,
    };
  }

  /**
   * Aladin similarBooks 필드 추출 헬퍼.
   * subInfo.similarBookList 위치는 응답 버전마다 약간 다름 — 둘 다 시도.
   */
  function extractSimilarBooks(lookupItem) {
    if (!lookupItem) return [];
    const sub = lookupItem.subInfo || {};
    const list = sub.similarBookList || sub.similarBooks || [];
    return list
      .map(entry => entry.bookinfo || entry.itemInfo || entry)
      .filter(Boolean);
  }

  /**
   * Aladin categoryId 추출 — 우선순위:
   *   1) item.categoryId (가장 구체적인 leaf 카테고리)
   *   2) subInfo.categoryIdList의 leaf
   */
  function extractCategoryId(lookupItem) {
    if (!lookupItem) return null;
    if (lookupItem.categoryId) return lookupItem.categoryId;
    const list = (lookupItem.subInfo || {}).categoryIdList || [];
    if (list.length === 0) return null;
    const last = list[list.length - 1];
    return last.categoryInfo ? last.categoryInfo.categoryId : (last.categoryId || null);
  }

  /**
   * 부모 categoryId — leaf의 한 단계 위.
   * subInfo.categoryIdList는 [최상위, ..., leaf] 순서.
   * 마지막에서 두 번째가 부모.
   */
  function extractParentCategoryId(lookupItem) {
    if (!lookupItem) return null;
    const list = (lookupItem.subInfo || {}).categoryIdList || [];
    if (list.length < 2) return null;
    const parent = list[list.length - 2];
    return parent.categoryInfo ? parent.categoryInfo.categoryId : (parent.categoryId || null);
  }

  // ── Reading Ladder (학년 사다리) ──────────────────────────────
  /**
   * categoryName/contents에서 학년 단계 추정.
   * 반환: 'preschool' | 'low' | 'mid' | 'high' | 'youth' | 'adult' | null
   */
  function detectGrade(text) {
    const t = (text || '').toString();
    if (/유아|영아|0\s*[-~]\s*3\s*세|걸음마|그림책/.test(t)) return 'preschool';
    if (/저학년|1\s*[-~]\s*2\s*학년|초등\s*1|초등\s*2|7\s*세|8\s*세/.test(t)) return 'low';
    if (/중학년|3\s*[-~]\s*4\s*학년|초등\s*3|초등\s*4|9\s*세|10\s*세/.test(t)) return 'mid';
    if (/고학년|5\s*[-~]\s*6\s*학년|초등\s*5|초등\s*6|11\s*세|12\s*세/.test(t)) return 'high';
    if (/청소년|중학생|중학교|10대/.test(t)) return 'youth';
    if (/일반|성인|어른/.test(t)) return 'adult';
    return null;
  }

  /**
   * 다음 단계 grade.
   *   preschool → low → mid → high → youth → adult
   */
  function nextGrade(grade) {
    const order = ['preschool', 'low', 'mid', 'high', 'youth', 'adult'];
    const i = order.indexOf(grade);
    if (i < 0 || i >= order.length - 1) return null;
    return order[i + 1];
  }

  /**
   * 다음 단계 검색용 한국어 키워드 (알라딘 ItemSearch Query에 합성).
   */
  function gradeSearchKeyword(grade) {
    return {
      preschool: '유아 그림책',
      low:       '저학년 1-2학년',
      mid:       '중학년 3-4학년',
      high:      '고학년 5-6학년',
      youth:     '청소년',
      adult:     '',
    }[grade] || '';
  }

  /**
   * 분야 키워드 추출 — categoryName의 leaf 토큰.
   * 예: "국내도서>어린이>동화/명작/고전>국내창작동화" → "국내창작동화"
   */
  function extractGenreKeyword(categoryName) {
    if (!categoryName) return '';
    const parts = categoryName.split('>').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    // leaf 토큰. 너무 일반적인 토큰("어린이", "유아")이면 그 위 토큰
    const skip = new Set(['국내도서', '외국도서', 'eBook', '어린이', '유아', '청소년']);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!skip.has(parts[i])) return parts[i];
    }
    return parts[parts.length - 1];
  }

  /**
   * "다음 단계 책" 검색.
   * 현재 책의 분야 + 다음 학년 키워드를 합성해 알라딘 ItemSearch.
   * 학년이 추정 안 되면 부모 categoryId 베스트로 fallback.
   */
  async function searchNextLevel(lookupItem, { maxResults = 12 } = {}) {
    if (!lookupItem) return [];
    const categoryName = lookupItem.categoryName || '';
    const description = lookupItem.description || '';
    const title = lookupItem.title || '';

    const grade = detectGrade(categoryName) || detectGrade(description) || detectGrade(title);
    const next = grade ? nextGrade(grade) : null;
    const genre = extractGenreKeyword(categoryName);

    if (next && genre) {
      const nextKw = gradeSearchKeyword(next);
      const query = `${genre} ${nextKw}`.trim();
      try {
        const items = await aladinSearch({
          query,
          queryType: 'Keyword',
          maxResults,
          sort: 'SalesPoint',
        });
        if (items.length > 0) return items;
      } catch (e) {
        console.warn('[API] searchNextLevel 검색 실패', e.message);
      }
    }

    // Fallback: 부모 categoryId 베스트 (한 단계 넓은 분야)
    const parentId = extractParentCategoryId(lookupItem);
    if (parentId) {
      try {
        return await aladinList({
          queryType: 'Bestseller',
          categoryId: parentId,
          maxResults,
        });
      } catch (e) {
        console.warn('[API] parent category bestseller 실패', e.message);
      }
    }
    return [];
  }

  // ── Mocks (when KAKAO_API_KEY is empty) ──────────────────────

  function mockDocuments(query) {
    const q = (query || '').toString();
    return [
      {
        isbn: '0000000000 9788900000000',
        title: `[Mock] ${q} — 검색 결과`,
        authors: ['목업 저자'],
        publisher: '목업 출판사',
        thumbnail: '',
        contents: 'API 키가 비어있어 mock 데이터를 반환합니다. 초등 3-4학년 추천 도서.',
        url: '',
        datetime: new Date().toISOString(),
        price: 0,
      },
    ];
  }

  // ── Public ───────────────────────────────────────────────────

  window.API = {
    // Kakao (ISBN scan, title/author search)
    searchByIsbn,
    searchByTitle,
    searchByAuthor,
    searchByPublisher,
    searchSimilarLevel,    // legacy keyword-based — kept as fallback
    fetchAR,

    // Aladin (recommendations — categoryId + similarBooks + reading ladder)
    aladinLookup,
    aladinSearch,
    aladinList,
    extractSimilarBooks,
    extractCategoryId,
    extractParentCategoryId,
    extractGenreKeyword,
    detectGrade,
    nextGrade,
    searchNextLevel,
    normalizeAladin,

    // Helpers
    extractLevelHints,
    detectLanguage,
    _normalize: normalize,
    _normalizeAladin: normalizeAladin,
  };
})();
