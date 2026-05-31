#!/usr/bin/env python3
"""Round-7 loader: round6 eligible 풀(/tmp/wb6_eligible.json)에서 다음 배치 선별
→ 알라딘 Worker/카카오로 표지·메타 보강. 재스크레이프 없음.

성인/YA 프랜차이즈·성숙 콘텐츠 제외(MATURE) 필터 유지 (#49 교훈).
타겟: band0=18, band1~5=14 (현재 680권 분포상 band0 최저).

Run from repo root: python3 scripts/wendybook_bands_round7_en.py
"""
import re, json, time, os, urllib.request, urllib.parse
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'book-recommendations.json')
ALADIN = 'https://book-tracker-aladin.obangti.workers.dev/aladin/lookup'
KAKAO = 'https://dapi.kakao.com/v3/search/book'
ELIG_IN = '/tmp/wb6_eligible.json'
CKPT = '/tmp/wb7_enriched.json'
ELIG_OUT = '/tmp/wb7_eligible.json'

DROP_ISBN = set()
MATURE = re.compile(
    r'game of thrones|song of ice and fire|good girl.?s guide to murder|hunger games|'
    r'catching fire|mockingjay|ballad of songbirds|twilight|divergent|insurgent|allegiant|'
    r'maze runner|fault in our stars|throne of glass|court of thorns|sarah j\.? maas|'
    r'all my rage|fourth wing|it ends with us|colleen hoover|outlander|fifty shades|'
    r'the summer i turned|\bDRY\b|scythe', re.I)
SET_PAT = re.compile(
    r'세트|[0-9]+\s*종|Collection|\bBox\b|박스|&\s*CD|Book\s*\+\s*Audio|Book&CD|DVD|'
    r'노부영|베오영|StoryPlus|QR포함|Audio CD|\bCD\b', re.I)
TARGET = {0: 18, 1: 14, 2: 14, 3: 14, 4: 14, 5: 14}


def kakao_key():
    for line in open(os.path.join(ROOT, 'js', 'config.js'), encoding='utf-8', errors='replace'):
        if 'KAKAO_API_KEY' in line:
            m = re.search(r"KAKAO_API_KEY\s*=\s*'([^']+)'", line)
            if m:
                return m.group(1)
    return None


def fetch(url, headers=None, timeout=25):
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
    DB = json.load(open(DATA, encoding='utf-8'))['books']
    existing = set(DB.keys())
    en_titles = set((v.get('title', '') or '').lower().strip()
                    for v in DB.values() if v.get('language') == 'en')
    elig = json.load(open(ELIG_IN, encoding='utf-8'))

    cand = []
    for v in elig:
        isbn = v['isbn']
        t = v.get('title', '')
        if isbn in existing or isbn in DROP_ISBN or not t:
            continue
        ar = v.get('ar')
        if ar is None or ar < 0.5 or ar > 5.9:
            continue
        if t.lower().strip() in en_titles:
            continue
        if MATURE.search(t) or SET_PAT.search(t):
            continue
        cand.append(v)

    byband = defaultdict(list)
    for v in cand:
        byband[int(v['ar'])].append(v)

    selected = []
    for bd in range(6):
        pool = sorted(byband.get(bd, []), key=lambda v: (v.get('lexile') is None, v['title']))
        selected += pool[:TARGET[bd]]
    print(f'Selected: {len(selected)}')

    key = kakao_key()
    objs = {}
    failed = []
    seen = set()
    n = 0
    for v in selected:
        tk = v['title'].lower().strip()
        if tk in seen:
            continue
        seen.add(tk)
        isbn = v['isbn']
        author, pub, year, cover, src = enrich(isbn, key)
        if not cover:
            failed.append(v['title'])
            print(f'  DROP (no cover): {v["title"]} [{isbn}]')
            continue
        objs[isbn] = {
            'isbn': isbn, 'title': v['title'], 'author': author, 'publisher': pub,
            'year': year, 'ar': v['ar'], 'language': 'en', 'lexile': v.get('lexile'),
            'thumbnail': cover, 'genre': '원서', 'lists': [], 'why': '', '_src': src,
        }
        n += 1
        if n % 15 == 0:
            json.dump(objs, open(CKPT, 'w'), ensure_ascii=False, indent=1)
            print(f'  checkpoint @ {len(objs)}')
            time.sleep(0.5)

    json.dump(objs, open(CKPT, 'w'), ensure_ascii=False, indent=1)
    print(f'Enriched (kept): {len(objs)}, cover-dropped: {len(failed)}')
    if failed:
        print('Dropped:', failed)

    sel_isbns = {v['isbn'] for v in selected}
    remaining = [v for v in cand if v['isbn'] not in sel_isbns]
    json.dump(remaining, open(ELIG_OUT, 'w'), ensure_ascii=False, indent=1)
    print(f'Remaining eligible for round 8: {len(remaining)} -> {ELIG_OUT}')


if __name__ == '__main__':
    main()
