#!/usr/bin/env python3
"""Round-4 loader: 웬디북 category/levels (AR-band filtered) 영어 원서 추가 수집.

Source reuse: round-3 built /tmp/wb3_eligible.json (1151 AR 0.5~5.7, set/title-filtered
candidates from wendybook category/levels bands 1..5). Round-3 (#42) and the two follow-on
rounds (#43, #44) merged their picks into the DB, so this re-dedups the pool against the
CURRENT book-recommendations.json (5787 keys) -> 1041 still-new books, and selects the next
band-balanced slice. No re-scraping: the task sanctions selecting from the round-3 eligible pool.

Differs from round3_en.py on two gate-blocking points the round3 script left to a manual step:
  - cover-FAILED books are DROPPED, not shipped with empty thumbnail (gate: thumbnail 100%)
  - author/publisher/year/cover come from Aladin Worker (primary) + Kakao (fallback)
  - `why` is authored in a separate pass (wendybook_bands_round4_why.py) before merge

Pipeline:
  1. load /tmp/wb3_eligible.json, re-dedup vs current DB (isbn + lowercased EN title)
  2. re-apply SET_PAT defensively on title + _raw
  3. balanced select ~16/band (next alphabetical slice after round3's [:22]), lexile-first
  4. enrich via Aladin Worker (primary) + Kakao (fallback); DROP cover failures
  5. checkpoint /tmp/wb4_enriched.json every 15 books
AR accuracy spot-checked against arbookfind.com (ATOS) on this batch.

Run from repo root: python3 scripts/wendybook_bands_round4_en.py
"""
import re, json, html, time, os, urllib.request, urllib.parse
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'book-recommendations.json')
ALADIN = 'https://book-tracker-aladin.obangti.workers.dev/aladin/lookup'
KAKAO = 'https://dapi.kakao.com/v3/search/book'
POOL = '/tmp/wb3_eligible.json'
CKPT = '/tmp/wb4_enriched.json'
PER_BAND = 18          # next slice; ~80-90 target after cover-failure drops
SLICE_START = 22       # round3 took [:22] per band; start where it left off

SET_PAT = re.compile(
    r'세트|[0-9]+\s*종|Collection|Box\b|박스|원서\s*&\s*CD|Book\s*&\s*CD|'
    r'Book\s*\+\s*Audio|Book&CD|DVD|시리즈|노부영|베오영|StoryPlus|QR포함|Audio CD|\bCD\b',
    re.I)


def kakao_key():
    for line in open(os.path.join(ROOT, 'js', 'config.js'), encoding='utf-8', errors='replace'):
        if 'KAKAO_API_KEY' in line:
            m = re.search(r"KAKAO_API_KEY\s*=\s*'([^']+)'", line)
            if m:
                return m.group(1)
    return None


def fetch(url, headers=None, timeout=40):
    req = urllib.request.Request(url, headers=headers or {'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=timeout).read().decode('utf-8', 'replace')


def clean_author(a):
    if not a:
        return ''
    a = re.split(r'\s*[,;]\s*', a)[0]
    a = re.sub(r'\s*\([^)]*\)\s*', '', a).strip()
    return a.strip()


def enrich(isbn, key):
    try:
        d = json.loads(fetch(f'{ALADIN}?ItemId={isbn}&ItemIdType=ISBN13&Cover=Big', timeout=20))
        items = d.get('item') or []
        if items:
            it = items[0]
            author = clean_author(it.get('author', ''))
            pub = (it.get('publisher') or '').strip()
            yr = it.get('pubDate', '')[:4]
            year = int(yr) if yr.isdigit() else None
            cover = it.get('cover') or None
            if cover or pub:
                return author, pub, year, cover, 'aladin'
    except Exception:
        pass
    try:
        q = urllib.parse.urlencode({'target': 'isbn', 'query': isbn})
        d = json.loads(fetch(f'{KAKAO}?{q}', headers={'Authorization': f'KakaoAK {key}'}, timeout=20))
        docs = d.get('documents', [])
        if docs:
            x = docs[0]
            authors = x.get('authors') or []
            author = authors[0] if authors else ''
            pub = (x.get('publisher') or '').strip()
            yr = x.get('datetime', '')[:4]
            year = int(yr) if yr.isdigit() else None
            cover = x.get('thumbnail') or None
            return author, pub, year, cover, 'kakao'
    except Exception:
        pass
    return '', '', None, None, 'failed'


def main():
    db = json.load(open(DATA, encoding='utf-8'))
    existing = set(db['books'].keys())
    existing_en_titles = set(
        (v.get('title', '') or '').lower().strip()
        for v in db['books'].values() if v.get('language') == 'en')

    pool = json.load(open(POOL, encoding='utf-8'))

    elig = []
    for v in pool:
        if v['isbn'] in existing:
            continue
        if not v.get('title'):
            continue
        if v['ar'] is None or v['ar'] < 0.5 or v['ar'] > 5.7:
            continue
        if SET_PAT.search(v['title']) or SET_PAT.search(v.get('_raw', '')):
            continue
        if v['title'].lower().strip() in existing_en_titles:
            continue
        elig.append(v)

    byband = defaultdict(list)
    for v in elig:
        byband[int(v['ar'])].append(v)
    selected = []
    for b in [1, 2, 3, 4, 5]:
        pool_b = sorted(byband.get(b, []), key=lambda v: (v['lexile'] is None, v['title']))
        selected += pool_b[SLICE_START:SLICE_START + PER_BAND]

    print(f'eligible {len(elig)}, selected {len(selected)}')

    key = kakao_key()
    objs = {}
    failed = []
    seen_titles = set()
    n = 0
    for v in selected:
        tkey = v['title'].lower().strip()
        if tkey in seen_titles:
            continue
        seen_titles.add(tkey)
        author, pub, year, cover, src = enrich(v['isbn'], key)
        if not cover:                       # DROP cover failures (gate: thumbnail 100%)
            failed.append((v['isbn'], v['title']))
            continue
        objs[v['isbn']] = {
            'isbn': v['isbn'],
            'title': v['title'],
            'author': author,
            'publisher': pub,
            'year': year,
            'ar': v['ar'],
            'language': 'en',
            'lexile': v['lexile'],
            'thumbnail': cover,
            'genre': '원서',
            'lists': [],
            'why': '',
            '_src': src,
        }
        n += 1
        if n % 15 == 0:
            json.dump(objs, open(CKPT, 'w'), ensure_ascii=False, indent=1)
            print(f'  checkpoint @ {len(objs)}')
            time.sleep(1)
    json.dump(objs, open(CKPT, 'w'), ensure_ascii=False, indent=1)
    print(f'enriched(kept) {len(objs)}, cover-dropped {len(failed)}')
    if failed:
        print('dropped:', failed)


if __name__ == '__main__':
    main()
