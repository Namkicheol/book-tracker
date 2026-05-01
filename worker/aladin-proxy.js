/**
 * 書架 — Aladin OpenAPI proxy (Cloudflare Worker)
 *
 * Routes:
 *   GET /aladin/lookup?isbn=9788901234567
 *   GET /aladin/search?Query=...&QueryType=Title|Author|Keyword&CategoryId=...
 *   GET /aladin/list?QueryType=Bestseller|ItemNewAll|ItemNewSpecial&CategoryId=...
 *
 * TTBKey is read from env (wrangler secret put ALADIN_TTBKEY).
 * Responses are cached at the edge for 6h.
 */

const ALADIN_BASE = 'http://www.aladin.co.kr/ttb/api';

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

    const m = url.pathname.match(/^\/aladin\/(lookup|search|list)$/);
    if (!m) return errorResponse(404, 'not_found', origin);

    const ttbKey = env.ALADIN_TTBKEY;
    if (!ttbKey) return errorResponse(500, 'missing_ttbkey_secret', origin);

    const aladinUrl = buildAladinUrl(m[1], url.searchParams, ttbKey);

    const cache = caches.default;
    const cacheKey = new Request(aladinUrl);
    let cached = await cache.match(cacheKey);
    if (cached) return withCors(cached, origin, 'HIT');

    let upstream;
    try {
      upstream = await fetch(aladinUrl, {
        cf: { cacheTtl: 0 },
        headers: { 'User-Agent': 'Mozilla/5.0 (book-tracker/1.0)' },
      });
    } catch (e) {
      return errorResponse(502, `upstream_fetch_failed:${e.message}`, origin);
    }

    if (!upstream.ok) {
      return errorResponse(upstream.status, 'aladin_upstream_error', origin);
    }

    const text = await upstream.text();

    const res = new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=21600',
      },
    });
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return withCors(res, origin, 'MISS');
  },
};

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

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
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
