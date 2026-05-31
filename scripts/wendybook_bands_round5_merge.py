#!/usr/bin/env python3
"""Round-5 merge: /tmp/wb5_enriched.json -> data/book-recommendations.json

Run from repo root: python3 scripts/wendybook_bands_round5_merge.py

기존 EN 502권 스키마와 정확히 일치시킨다:
  (isbn, title, author, publisher, year, ar, language, lexile, thumbnail, genre, lists, why)
- thumbnail/lexile 보존(원서 표지·렉사일은 정식 필드), targetAge 미추가(EN은 AR 밴드로 분류).
- 기존 books 키 순서 보존(재정렬 금지), 신규는 끝에 append.
- 제목 내 한글 부기(예: "(QR음원 제공)") 제거, 이중 공백 정리.
"""
import json, os, re
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'book-recommendations.json')
CKPT = '/tmp/wb5_enriched.json'
SOURCE_ID = 'wendybook'

CANON = ['isbn', 'title', 'author', 'publisher', 'year', 'ar',
         'language', 'lexile', 'thumbnail', 'genre', 'lists', 'why']


def clean_title(t):
    t = re.sub(r'\([^)]*[가-힣][^)]*\)', '', t)   # 한글 포함 괄호 통째 제거
    t = re.sub(r'\s{2,}', ' ', t).strip()
    return t


def main():
    db = json.load(open(DATA, encoding='utf-8'))
    new_books = json.load(open(CKPT, encoding='utf-8'))
    books = db['books']
    existing = set(books.keys())

    n_new = 0
    skipped = []
    for isbn, v in new_books.items():
        if not re.match(r'^97[89]\d{10}$', isbn) or isbn in existing:
            skipped.append(isbn)
            continue
        entry = {
            'isbn': v['isbn'],
            'title': clean_title(v['title']),
            'author': v.get('author', ''),
            'publisher': v.get('publisher', ''),
            'year': v.get('year'),
            'ar': v.get('ar'),
            'language': 'en',
            'lexile': v.get('lexile'),
            'thumbnail': v.get('thumbnail', ''),
            'genre': v.get('genre', '원서'),
            'lists': [SOURCE_ID],
            'why': v.get('why', ''),
        }
        books[isbn] = {k: entry[k] for k in CANON}  # 순서 보존, 끝에 append
        n_new += 1

    db['meta']['lastUpdated'] = date.today().isoformat()

    with open(DATA, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
        f.write('\n')

    print(f'Merge done: {n_new} new, {len(skipped)} skipped')
    print(f'Total books: {len(books)}')
    if skipped:
        print('Skipped:', skipped[:10])


if __name__ == '__main__':
    main()
