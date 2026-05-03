/**
 * 맘스북스 — API Proxy (Cloudflare Worker)
 *
 * Aladin Routes:
 *   GET /aladin/lookup?isbn=9788901234567
 *   GET /aladin/search?Query=...&QueryType=Title|Author|Keyword&CategoryId=...
 *   GET /aladin/list?QueryType=Bestseller|ItemNewAll|ItemNewSpecial&CategoryId=...
 *
 * Library Routes:
 *   GET /library/search?isbn=9788901234567&region=11
 *   GET /library/available?isbn=9788901234567&libCode=111001
 *
 * Secrets: ALADIN_TTBKEY, LIBRARY_API_KEY
 */

const ALADIN_BASE = 'http://www.aladin.co.kr/ttb/api';
const LIBRARY_BASE = 'https://www.data4library.kr/api';

const ALLOWED_ORIGINS = [
  'https://namkicheol.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
];

const PARAM_ALLOWLIST = [
  'ItemId', 'ItemIdType',
  'Query', 'QueryType', 'SearchTarget',
  'CategoryId', 'MaxResults', 'start', 'Sort',
  'Cover', 'OptResult', 'Output', 'Version',
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'GET') {
      return errorResponse(405, 'method_not_allowed', origin);
    }

    // Route: /image-proxy?url=...
    if (url.pathname === '/image-proxy') {
      const imageUrl = url.searchParams.get('url');
      if (!imageUrl) return errorResponse(400, 'missing_url_param', origin);
      return handleImageProxy(imageUrl, ctx, origin);
    }

    // Route: /aladin/* or /library/*
    const aladinMatch = url.pathname.match(/^\/aladin\/(lookup|search|list)$/);
    const libraryMatch = url.pathname.match(/^\/library\/(search|available)$/);

    if (aladinMatch) {
      const ttbKey = env.ALADIN_TTBKEY;
      if (!ttbKey) return errorResponse(500, 'missing_ttbkey_secret', origin);
      const aladinUrl = buildAladinUrl(aladinMatch[1], url.searchParams, ttbKey);
      return handleProxy(aladinUrl, ctx, origin, 21600);
    }

    if (libraryMatch) {
      const apiKey = env.LIBRARY_API_KEY;
      if (!apiKey) return errorResponse(500, 'missing_library_key_secret', origin);
      const libraryUrl = buildLibraryUrl(libraryMatch[1], url.searchParams, apiKey);
      return handleProxy(libraryUrl, ctx, origin, 3600);
    }

    return errorResponse(404, 'not_found', origin);
  },
};

async function handleImageProxy(imageUrl, ctx, origin) {
  const cache = caches.default;
  const cacheKey = new Request(imageUrl);
  let cached = await cache.match(cacheKey);
  if (cached) return withCors(cached, origin, 'HIT');

  let upstream;
  try {
    upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.aladin.co.kr/',
      },
    });
  } catch (e) {
    return errorResponse(502, `image_fetch_failed:${e.message}`, origin);
  }

  if (!upstream.ok) {
    return errorResponse(upstream.status, `image_error_${upstream.status}`, origin);
  }

  const blob = await upstream.blob();
  const contentType = upstream.headers.get('Content-Type') || 'image/jpeg';

  const res = new Response(blob, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=2592000', // 30일 캐싱
    },
  });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return withCors(res, origin, 'MISS');
}

async function handleProxy(targetUrl, ctx, origin, cacheTtl) {
  const cache = caches.default;
  const cacheKey = new Request(targetUrl);
  let cached = await cache.match(cacheKey);
  if (cached) return withCors(cached, origin, 'HIT');

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      cf: { cacheTtl: 0 },
      headers: { 'User-Agent': 'Mozilla/5.0 (moms-books/1.0)' },
    });
  } catch (e) {
    return errorResponse(502, `upstream_fetch_failed:${e.message}`, origin);
  }

  if (!upstream.ok) {
    return errorResponse(upstream.status, 'upstream_error', origin);
  }

  const text = await upstream.text();
  const res = new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${cacheTtl}`,
    },
  });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return withCors(res, origin, 'MISS');
}

function buildAladinUrl(endpoint, params, ttbKey) {
  const path = {
    lookup: 'ItemLookUp.aspx',
    search: 'ItemSearch.aspx',
    list:   'ItemList.aspx',
  }[endpoint];

  const out = new URLSearchParams();
  out.set('ttbkey', ttbKey);
  out.set('output', 'js');
  out.set('Version', '20131101');

  for (const k of PARAM_ALLOWLIST) {
    const v = params.get(k);
    if (v != null && v !== '') out.set(k, v);
  }
  if (!out.has('Cover')) out.set('Cover', 'Big');

  return `${ALADIN_BASE}/${path}?${out.toString()}`;
}

function buildLibraryUrl(endpoint, params, apiKey) {
  const apiEndpoint = {
    search: 'loanItemSrch',
    available: 'bookExist',
  }[endpoint];

  const out = new URLSearchParams();
  out.set('authKey', apiKey);
  out.set('format', 'json');

  // isbn → isbn13
  const isbn = params.get('isbn');
  if (isbn) out.set('isbn13', isbn.replace(/\D/g, ''));

  // Forward allowed params
  const allowed = ['region', 'dtl_region', 'libCode', 'pageNo', 'pageSize'];
  for (const k of allowed) {
    const v = params.get(k);
    if (v) out.set(k, v);
  }

  return `${LIBRARY_BASE}/${apiEndpoint}?${out.toString()}`;
}

function corsHeaders(origin) {
  // 개발 중에는 모든 origin 허용
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function withCors(res, origin, cacheStatus) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(corsHeaders(origin))) out.headers.set(k, v);
  out.headers.set('X-Cache', cacheStatus);
  return out;
}

function errorResponse(status, error, origin) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
  });
}
