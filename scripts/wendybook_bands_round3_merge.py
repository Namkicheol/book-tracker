#!/usr/bin/env python3
"""Append round-3 wendybook EN books into data/book-recommendations.json.

CRITICAL: append-only, do NOT re-sort the books dict (live file is insertion-ordered,
re-sorting would churn the whole 5600+ entry diff). Preserve meta/books/awards key order.
Run from repo root: python3 scripts/wendybook_bands_round3_merge.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'book-recommendations.json')
NEW = '/tmp/wb3_final.json'

db = json.load(open(DATA, encoding='utf-8'))
new = json.load(open(NEW, encoding='utf-8'))

books = db['books']
before = len(books)
en_before = sum(1 for v in books.values() if v.get('language') == 'en')

added = 0
for isbn, obj in new.items():
    if isbn in books:        # safety: never overwrite existing
        continue
    if not re.match(r'^97[89]\d{10}$', isbn):
        continue
    books[isbn] = obj
    added += 1

db['meta']['lastUpdated'] = '2026-05-30'

after = len(books)
en_after = sum(1 for v in books.values() if v.get('language') == 'en')

with open(DATA, 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'books {before} -> {after} (+{added})')
print(f'EN {en_before} -> {en_after} (+{en_after - en_before})')
