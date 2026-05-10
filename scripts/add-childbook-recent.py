#!/usr/bin/env python3
"""어린이도서연구회 2024·2025 권장도서 추가 (2026은 별도 스크립트로 이미 적재됨)."""

import json, urllib.request, urllib.parse, time, os, re, sys

WORKER = "https://book-tracker-aladin.obangti.workers.dev"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REC_PATH = os.path.join(BASE_DIR, "data", "book-recommendations.json")

sys.path.insert(0, os.path.join(BASE_DIR, "scripts"))
from childbook_books_data import BOOKS_2024, BOOKS_2025

GENRE_MAP = {
    "유아":          "그림책",
    "초등 저학년":   "문학",
    "초등 중학년":   "문학",
    "초등 고학년":   "문학",
    "청소년":        "청소년 문학",
}


def clean_title_for_search(t):
    t = re.sub(r'\s*\[[^\]]+\]\s*$', '', t)
    t = re.sub(r'\s*[·:‐–—\-]\s.*$', '', t)
    t = re.sub(r'[\-–—?!,]', ' ', t)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()


def display_title(t):
    return re.sub(r'\s*\[[^\]]+\]\s*$', '', t).strip()


def author_first_name(a):
    if not a:
        return ""
    a = re.sub(r'\s*[/∙·〮┃┇│|]\s*.*$', '', a)
    a = re.sub(r'\s+(글|그림|지음|옮김|엮음|편역|시|사진|글∙그림|글그림).*$', '', a)
    return a.strip()


def fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "moms-books/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"    [ERR] {e}")
        return None


def search(title, author_hint):
    cleaned = clean_title_for_search(title)
    if not cleaned:
        return None
    q = urllib.parse.quote(cleaned[:30])
    url = f"{WORKER}/aladin/search?Query={q}&QueryType=Title&SearchTarget=Book&MaxResults=10"
    data = fetch(url)
    if not data:
        return None
    items = data.get("item", [])
    if not items:
        return None

    title_key = re.sub(r'\s+', '', cleaned)[:6]
    author_key = author_first_name(author_hint)

    for item in items:
        i_title = re.sub(r'\s+', '', item.get("title", ""))
        i_author = item.get("author", "")
        if title_key in i_title and (not author_key or author_key in i_author):
            return item
    for item in items:
        i_title = re.sub(r'\s+', '', item.get("title", ""))
        if title_key in i_title:
            return item
    return items[0]


def process_year(year, books, rec_books):
    added = tagged = failed = 0
    total = len(books)
    print(f"\n=== {year} 어린이도서연구회 {total}권 ===\n")

    for i, (title, author_hint, age) in enumerate(books):
        item = search(title, author_hint)
        if not item:
            print(f"  [{year}/{i+1:3d}] 실패: {title[:30]}")
            failed += 1
            time.sleep(0.30)
            continue

        isbn = str(item.get("isbn13", "")).replace("-", "")
        if not isbn:
            print(f"  [{year}/{i+1:3d}] ISBN없음: {title[:30]}")
            failed += 1
            time.sleep(0.30)
            continue

        if isbn in rec_books:
            b = rec_books[isbn]
            if "childbook" not in b.get("lists", []):
                b.setdefault("lists", []).append("childbook")
                tagged += 1
        else:
            year_int = 2024
            try:
                pub = item.get("pubDate", "")
                if pub and len(pub) >= 4:
                    year_int = int(pub[:4])
            except Exception:
                pass

            rec_books[isbn] = {
                "isbn": isbn,
                "title": item.get("title", display_title(title)),
                "author": item.get("author", author_first_name(author_hint)),
                "publisher": item.get("publisher", ""),
                "thumbnail": item.get("cover", ""),
                "year": year_int,
                "targetAge": age,
                "genre": GENRE_MAP.get(age, "문학"),
                "lists": ["childbook"],
                "why": f"{year} 어린이도서연구회 권장도서로 선정된 책입니다.",
            }
            added += 1
        if (i + 1) % 30 == 0:
            print(f"  [{year}] 진행 {i+1}/{total} (신규 {added}, 태그 {tagged}, 실패 {failed})")
        time.sleep(0.30)

    print(f"\n--- {year} 결과: 신규 {added}, 태그추가 {tagged}, 실패 {failed} ---")
    return added, tagged, failed


def main():
    with open(REC_PATH, encoding="utf-8") as f:
        rec = json.load(f)
    rec_books = rec["books"]

    initial = len(rec_books)
    print(f"시작 시 총 {initial}권")

    grand_added = grand_tagged = grand_failed = 0
    for year, books in [(2024, BOOKS_2024), (2025, BOOKS_2025)]:
        a, t, f_ = process_year(year, books, rec_books)
        grand_added += a
        grand_tagged += t
        grand_failed += f_

        with open(REC_PATH, "w", encoding="utf-8") as f:
            json.dump(rec, f, ensure_ascii=False, indent=2)
        print(f"  ※ 중간 저장 ({len(rec_books)}권)")

    print(f"\n========== 최종 ==========")
    print(f"  신규 {grand_added}, 태그 {grand_tagged}, 실패 {grand_failed}")
    print(f"  총권수 {len(rec_books)} (시작 {initial} → +{len(rec_books) - initial})")


if __name__ == "__main__":
    main()
