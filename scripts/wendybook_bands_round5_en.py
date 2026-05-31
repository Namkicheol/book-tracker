#!/usr/bin/env python3
"""Round-5 loader: 웬디북 category/levels (AR-band filtered) 영어 원서 추가 수집.

Pool 파일이 세션 간 소멸하여 Wendybook을 처음부터 live 재스크레이프.
Source: https://www.wendybook.com/category/levels?lvt=<band>&page=<n>
  - lvt=1..6  -> AR 0점대 .. 5점대
  - Listing markup: each card has "ISBN : <isbn13>" and "AR x.x" + optional LEXILE

AR 분포 현황 (502권 기준):
  AR 0-1: 14  <- 최소, 우선 보강
  AR 1-2: 93
  AR 2-3: 131
  AR 3-4: 105
  AR 4-5: 86
  AR 5-6: 72

이번 배치 목표 ~80-90권:
  band 0 (lvt=1): 20권 목표 (보강)
  band 1 (lvt=2): 15권
  band 2 (lvt=3): 15권
  band 3 (lvt=4): 15권
  band 4 (lvt=5): 15권
  band 5 (lvt=6): 15권
  = 95권 선별 -> cover-drop 후 ~80-90 예상

Pipeline:
  1. Live-scrape lvt=1..6, pages 1..15 each
  2. Save pool to /tmp/wb5_pool.json (재사용 가능)
  3. Dedup vs current DB (isbn + lowercased EN title)
  4. Filter: AR 0.5~5.9 (6.0+ 금지), drop sets/CD/box bundles, require title
  5. Band-balanced select (alphabetical slice, lexile-first)
  6. Enrich via Aladin Worker + Kakao fallback; DROP cover failures
  7. Checkpoint /tmp/wb5_enriched.json every 15 books
  8. Save remaining eligible pool to /tmp/wb5_eligible.json for round 6

Run from repo root: python3 scripts/wendybook_bands_round5_en.py
"""
import re, json, html, time, os, urllib.request, urllib.parse
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'book-recommendations.json')
ALADIN = 'https://book-tracker-aladin.obangti.workers.dev/aladin/lookup'
KAKAO = 'https://dapi.kakao.com/v3/search/book'
POOL_FILE = '/tmp/wb5_pool.json'
ELIG_FILE = '/tmp/wb5_eligible.json'
CKPT = '/tmp/wb5_enriched.json'

# Per-band targets: [band0, band1, band2, band3, band4, band5]
PER_BAND = {0: 20, 1: 15, 2: 15, 3: 15, 4: 15, 5: 15}
MAX_PAGES = 15   # pages per lvt band

SET_PAT = re.compile(
    r'세트|[0-9]+\s*종|Collection|Box\b|박스|원서\s*&\s*CD|Book\s*&\s*CD|'
    r'Book\s*\+\s*Audio|Book&CD|DVD|시리즈|노부영|베오영|StoryPlus|QR포함|Audio CD|\bCD\b',
    re.I)
LEX = re.compile(r'LEXILE(?:&#174;|®|\s)*\s*(?:AD|HL|IG|GN|NC|BR)?\s*(\d{2,4})L')


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


def parse_html(raw):
    out = []
    markers = list(re.finditer(r'ISBN\s*:\s*(9\d{12})', raw))
    prev = 0
    for m in markers:
        isbn = m.group(1)
        win = raw[prev:m.start()]
        prev = m.end()
        if isbn[:3] not in ('978', '979'):
            continue
        tm = re.findall(r'>\s*([^<>]{2,140}?\(미국판\))\s*<', win)
        title = html.unescape(tm[-1]).replace('(미국판)', '').strip() if tm else None
        ars = re.findall(r'AR\s*(\d\.\d)(?:\s*[-~]\s*(\d\.\d))?', win)
        ar = None
        if ars:
            lo, hi = ars[-1]
            lo = float(lo); hi = float(hi) if hi else lo
            ar = round((lo + hi) / 2, 1)
        lx = LEX.search(win)
        lexile = int(lx.group(1)) if lx else None
        rawtxt = re.sub(r'<[^>]+>', ' ', win)
        out.append({'isbn': isbn, 'title': title, 'ar': ar, 'lexile': lexile, '_raw': rawtxt})
    return out


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


def scrape_pool():
    """Live-scrape wendybook lvt=1..6, return dict keyed by isbn."""
    allbooks = {}
    for lvt in range(1, 7):
        print(f'  scraping lvt={lvt}...', flush=True)
        for page in range(1, MAX_PAGES + 1):
            url = f'https://www.wendybook.com/category/levels?lvt={lvt}&page={page}'
            try:
                raw = fetch(url, timeout=30)
            except Exception as e:
                print(f'    lvt={lvt} page={page} fetch error: {e}')
                break
            parsed = parse_html(raw)
            if not parsed:
                print(f'    lvt={lvt} page={page}: empty, stopping band')
                break
            new_count = 0
            for b in parsed:
                if b['isbn'] not in allbooks:
                    b['lvt'] = lvt
                    allbooks[b['isbn']] = b
                    new_count += 1
            print(f'    lvt={lvt} page={page}: {len(parsed)} items, {new_count} new (total {len(allbooks)})')
            time.sleep(0.4)
        time.sleep(0.5)
    return allbooks


def main():
    # Step 1: scrape or load cached pool
    if os.path.exists(POOL_FILE):
        print(f'Loading cached pool from {POOL_FILE}')
        allbooks = json.load(open(POOL_FILE, encoding='utf-8'))
        allbooks = {v['isbn']: v for v in allbooks} if isinstance(allbooks, list) else allbooks
    else:
        print('Scraping Wendybook live...')
        allbooks = scrape_pool()
        pool_list = list(allbooks.values())
        json.dump(pool_list, open(POOL_FILE, 'w'), ensure_ascii=False, indent=1)
        print(f'Pool saved: {len(pool_list)} books -> {POOL_FILE}')

    # Step 2: load DB, dedup
    db = json.load(open(DATA, encoding='utf-8'))
    existing = set(db['books'].keys())
    existing_en_titles = set(
        (v.get('title', '') or '').lower().strip()
        for v in db['books'].values() if v.get('language') == 'en')

    # Step 3: filter eligible
    elig = []
    for v in allbooks.values():
        if v['isbn'] in existing:
            continue
        if not v.get('title'):
            continue
        ar = v.get('ar')
        if ar is None or ar < 0.5 or ar > 5.9:
            continue
        if SET_PAT.search(v['title']) or SET_PAT.search(v.get('_raw', '')):
            continue
        if v['title'].lower().strip() in existing_en_titles:
            continue
        elig.append(v)

    print(f'Eligible after dedup+filter: {len(elig)}')

    # Step 4: band-balanced selection
    byband = defaultdict(list)
    for v in elig:
        band = int(v['ar'])
        byband[band].append(v)

    for b in sorted(byband.keys()):
        print(f'  band {b}: {len(byband[b])} eligible')

    selected = []
    for b in [0, 1, 2, 3, 4, 5]:
        pool_b = sorted(byband.get(b, []), key=lambda v: (v['lexile'] is None, v['title']))
        n = PER_BAND.get(b, 15)
        selected += pool_b[:n]
        print(f'  selected band {b}: {len(pool_b[:n])}')

    print(f'Total selected: {len(selected)}')

    # Step 5: enrich
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
        isbn = v['isbn']
        author, pub, year, cover, src = enrich(isbn, key)
        if not cover:
            failed.append((isbn, v['title']))
            print(f'  DROP (no cover): {v["title"]} [{isbn}]')
            continue
        objs[isbn] = {
            'isbn': isbn,
            'title': v['title'],
            'author': author,
            'publisher': pub,
            'year': year,
            'ar': v['ar'],
            'language': 'en',
            'lexile': v.get('lexile'),
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
    print(f'\nEnriched (kept): {len(objs)}, cover-dropped: {len(failed)}')
    if failed:
        print('Dropped:', [t for _, t in failed])

    # Step 6: save remaining eligible pool for round 6
    selected_isbns = {v['isbn'] for v in selected}
    remaining = [v for v in elig if v['isbn'] not in selected_isbns]
    json.dump(remaining, open(ELIG_FILE, 'w'), ensure_ascii=False, indent=1)
    print(f'Remaining eligible for round 6: {len(remaining)} -> {ELIG_FILE}')


if __name__ == '__main__':
    main()
