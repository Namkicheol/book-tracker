#!/usr/bin/env python3
"""One-off loader: 웬디북 category/levels (AR-band filtered) 영어 원서 수집.

Source: https://www.wendybook.com/category/levels?lvt=<band>&page=<n>
  - lvt=2..6  -> AR 1점대 .. 5점대 (per-book AR shown in listing)
  - Listing markup: each card ends with "도서번호 : <id>|ISBN : <isbn13>",
    preceded by "<Title> (미국판)" and "AR x.x" (+ optional LEXILE).
AR accuracy spot-checked against arbookfind.com (ATOS Book Level): 16/16 exact.

Pipeline:
  1. parse pre-fetched HTML in /tmp/wb2 (or fetch live)
  2. dedup against ALL existing books dict keys (never overwrite existing)
  3. filter: AR 0.5~5.7 only, drop sets/CD/box bundles, require title
  4. balanced cross-band selection (12 per band 1..5)
  5. enrich via Aladin Worker (primary) + Kakao (fallback): author(KO), publisher, year, cover
  6. emit EN book objects ready to merge into data/book-recommendations.json

Run from repo root: python3 scripts/wendybook_levels_en.py
"""
import re, json, html, time, glob, os, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'book-recommendations.json')
ALADIN = 'https://book-tracker-aladin.obangti.workers.dev/aladin/lookup'
KAKAO = 'https://dapi.kakao.com/v3/search/book'

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


def fetch(url, headers=None, timeout=40):
    req = urllib.request.Request(url, headers=headers or {'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=timeout).read().decode('utf-8', 'replace')


def clean_author(a):
    """Aladin author -> first Korean name, strip role suffixes & English alias."""
    if not a:
        return ''
    a = re.split(r'\s*[,;]\s*', a)[0]            # first author
    a = re.sub(r'\s*\([^)]*\)\s*', '', a).strip()  # drop (지은이) etc.
    return a.strip()


def enrich(isbn, key):
    """Return (author, publisher, year, thumbnail, source)."""
    # Aladin primary
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
    # Kakao fallback
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

    # parse all pre-fetched band pages
    allbooks = {}
    for fp in sorted(glob.glob('/tmp/wb2/*.html')):
        for b in parse_html(open(fp, encoding='utf-8', errors='replace').read()):
            allbooks.setdefault(b['isbn'], b)

    elig = []
    for v in allbooks.values():
        if v['isbn'] in existing:
            continue
        if v['ar'] is None or v['ar'] < 0.5 or v['ar'] > 5.7:
            continue
        if not v['title']:
            continue
        if SET_PAT.search(v['title']) or SET_PAT.search(v['_raw']):
            continue
        if v['title'].lower().strip() in existing_en_titles:
            continue
        elig.append(v)

    # balanced selection: 12 per band 1..5, lexile-present first
    from collections import defaultdict
    byband = defaultdict(list)
    for v in elig:
        byband[int(v['ar'])].append(v)
    selected = []
    for b in [1, 2, 3, 4, 5]:
        pool = sorted(byband.get(b, []), key=lambda v: (v['lexile'] is None, v['title']))
        selected += pool[:12]

    print(f'eligible {len(elig)}, selected {len(selected)}')

    key = kakao_key()
    objs = {}
    failed = []
    for i, v in enumerate(selected):
        author, pub, year, cover, src = enrich(v['isbn'], key)
        if not cover:
            failed.append((v['isbn'], v['title']))
        objs[v['isbn']] = {
            'isbn': v['isbn'],
            'title': v['title'],
            'author': author,
            'publisher': pub,
            'year': year,
            'ar': v['ar'],
            'language': 'en',
            'lexile': v['lexile'],
            'thumbnail': cover or '',
            'genre': '원서',
            'lists': [],
            'why': '',
            '_src': src,
        }
        if (i + 1) % 50 == 0:
            time.sleep(1)
    json.dump(objs, open('/tmp/wb_enriched.json', 'w'), ensure_ascii=False, indent=1)
    print(f'enriched {len(objs)}, cover-failed {len(failed)}')
    if failed:
        print('failed:', failed)


if __name__ == '__main__':
    main()
