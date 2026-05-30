#!/usr/bin/env python3
"""기존 한글책 메타 보수: 표지/출판사/출판연도 누락분만 알라딘(카카오 폴백)으로 채운다.

- 대상: language != 'en' 이면서 thumbnail/publisher/year 중 하나라도 비어 있는 책.
- 원칙: 비어 있는 필드만 채운다. 기존 비어있지 않은 값은 절대 덮어쓰지 않는다.
- 880-prefix(EAN) 등 비정상 ISBN-13 키는 자동수정 대상에서 제외하고 보고만 한다.
- 증분 체크포인트(/tmp/repair_ko_ckpt.json)로 세션 중단 대비.

Run: python3 scripts/repair_korean_meta.py
"""
import re, json, time, os, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'book-recommendations.json')
CKPT = '/tmp/repair_ko_ckpt.json'
ALADIN = 'https://book-tracker-aladin.obangti.workers.dev/aladin/lookup'
KAKAO = 'https://dapi.kakao.com/v3/search/book'
ISBN13 = re.compile(r'97[89]\d{10}')


def kakao_key():
    for line in open(os.path.join(ROOT, 'js', 'config.js'), encoding='utf-8', errors='replace'):
        if 'KAKAO_API_KEY' in line:
            m = re.search(r"KAKAO_API_KEY\s*=\s*'([^']+)'", line)
            if m:
                return m.group(1)
    return None


def fetch(url, headers=None, timeout=20):
    req = urllib.request.Request(url, headers=headers or {'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=timeout).read().decode('utf-8', 'replace')


def lookup(isbn, key):
    """Return dict of {publisher, year, thumbnail} found (only present keys)."""
    out = {}
    try:
        d = json.loads(fetch(f'{ALADIN}?ItemId={isbn}&ItemIdType=ISBN13&Cover=Big'))
        items = d.get('item') or []
        if items:
            it = items[0]
            if it.get('publisher'):
                out['publisher'] = it['publisher'].strip()
            yr = (it.get('pubDate') or '')[:4]
            if yr.isdigit():
                out['year'] = int(yr)
            if it.get('cover'):
                out['thumbnail'] = it['cover']
    except Exception:
        pass
    if {'publisher', 'year', 'thumbnail'} <= set(out):
        return out, 'aladin'
    try:
        q = urllib.parse.urlencode({'target': 'isbn', 'query': isbn})
        d = json.loads(fetch(f'{KAKAO}?{q}', headers={'Authorization': f'KakaoAK {key}'}))
        docs = d.get('documents', [])
        if docs:
            x = docs[0]
            out.setdefault('publisher', (x.get('publisher') or '').strip() or None)
            yr = (x.get('datetime') or '')[:4]
            if 'year' not in out and yr.isdigit():
                out['year'] = int(yr)
            if 'thumbnail' not in out and x.get('thumbnail'):
                out['thumbnail'] = x['thumbnail']
            out = {k: v for k, v in out.items() if v}
            return out, 'kakao' if out else 'failed'
    except Exception:
        pass
    return out, 'aladin' if out else 'failed'


def main():
    db = json.load(open(DATA, encoding='utf-8'))
    books = db['books']
    key = kakao_key()

    targets, skipped_isbn = [], []
    for k, v in books.items():
        if not isinstance(v, dict) or v.get('language') == 'en':
            continue
        missing = [f for f in ('thumbnail', 'publisher', 'year') if not v.get(f)]
        if not missing:
            continue
        if not ISBN13.fullmatch(str(k)):
            skipped_isbn.append((k, v.get('title')))
            continue
        targets.append((k, missing))

    print(f'대상 {len(targets)}권, 비정상ISBN 제외 {len(skipped_isbn)}건')
    for k, t in skipped_isbn:
        print('  SKIP', k, t)

    ckpt = {}
    if os.path.exists(CKPT):
        ckpt = json.load(open(CKPT))
        print(f'체크포인트 재개: {len(ckpt)}건 기수집')

    filled = {f: 0 for f in ('thumbnail', 'publisher', 'year')}
    failed = []
    for i, (isbn, missing) in enumerate(targets):
        if isbn in ckpt:
            found = ckpt[isbn]
        else:
            found, src = lookup(isbn, key)
            ckpt[isbn] = found
            if (i + 1) % 20 == 0:
                json.dump(ckpt, open(CKPT, 'w'))
                print(f'  ...{i+1}/{len(targets)}')
                time.sleep(0.5)
        got = False
        for f in missing:
            if found.get(f):
                books[isbn][f] = found[f]
                filled[f] += 1
                got = True
        if not got:
            failed.append((isbn, books[isbn].get('title')))
    json.dump(ckpt, open(CKPT, 'w'))

    json.dump(db, open(DATA, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('\n=== 보수 결과 ===')
    print('채움 thumbnail:', filled['thumbnail'], '| publisher:', filled['publisher'], '| year:', filled['year'])
    print('못 채운(소스 없음):', len(failed))
    for isbn, t in failed[:30]:
        print('  MISS', isbn, t)


if __name__ == '__main__':
    main()
