#!/usr/bin/env python3
"""행복한아침독서 2024·2025·2026 추천도서 추가."""

import json, urllib.request, urllib.parse, time, os, re, sys

WORKER = "https://book-tracker-aladin.obangti.workers.dev"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REC_PATH = os.path.join(BASE_DIR, "data", "book-recommendations.json")

sys.path.insert(0, os.path.join(BASE_DIR, "scripts"))
from morningreading_books_data import BOOKS_2024, BOOKS_2025, BOOKS_2026

GENRE_MAP = {
    "유아":          "그림책",
    "초등 저학년":   "문학",
    "초등 중학년":   "문학",
    "초등 고학년":   "문학",
    "청소년":        "청소년 문학",
}

WHY_TEMPLATE = "{year} 행복한아침독서 추천도서로 선정된 책입니다."


def clean_title_for_search(t):
    """대괄호 시리즈명 제거 후 검색용 키워드 추출."""
    t = re.sub(r'\s*\[[^\]]+\]\s*$', '', t)
    t = re.sub(r'\s*:\s.*$', '', t)
    # 알라딘 검색 안 먹는 구두점 제거
    t = re.sub(r'[\-–—?!,]', ' ', t)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()


def display_title(t):
    """표시용: 시리즈 대괄호 제거."""
    return re.sub(r'\s*\[[^\]]+\]\s*$', '', t).strip()


def author_first_name(a):
    """저자 cell에서 검색·매칭용 첫 이름만 추출."""
    if not a:
        return ""
    # "이상교 글/윤순정 그림" → "이상교"
    a = re.sub(r'\s*[/∙·〮]\s*.*$', '', a)
    a = re.sub(r'\s+(글|그림|지음|옮김|엮음|편역|글∙그림|글그림).*$', '', a)
    a = re.sub(r'^\s+|\s+$', '', a)
    return a


def fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "moms-books/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"    [ERR] {e}")
        return None


def search(title, author_hint):
    """알라딘에서 제목 검색 → 저자 매칭으로 best item 반환."""
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

    # 1순위: 제목 prefix 일치 + 저자 일치
    for item in items:
        i_title = re.sub(r'\s+', '', item.get("title", ""))
        i_author = item.get("author", "")
        if title_key in i_title and (not author_key or author_key in i_author):
            return item
    # 2순위: 제목 prefix 일치
    for item in items:
        i_title = re.sub(r'\s+', '', item.get("title", ""))
        if title_key in i_title:
            return item
    return items[0]


def process_year(year, books, rec_books):
    added = tagged = failed = 0
    total = len(books)
    print(f"\n=== {year} 행복한아침독서 {total}권 처리 시작 ===\n")

    for i, (title, author_hint, age) in enumerate(books):
        item = search(title, author_hint)
        if not item:
            print(f"  [{year}/{i+1:4d}/{total}] 실패: {title[:30]}")
            failed += 1
            time.sleep(0.30)
            continue

        isbn = str(item.get("isbn13", "")).replace("-", "")
        if not isbn:
            print(f"  [{year}/{i+1:4d}/{total}] ISBN없음: {title[:30]}")
            failed += 1
            time.sleep(0.30)
            continue

        if isbn in rec_books:
            b = rec_books[isbn]
            if "morning-reading" not in b.get("lists", []):
                b.setdefault("lists", []).append("morning-reading")
                tagged += 1
                if (i + 1) % 50 == 0:
                    print(f"  [{year}/{i+1:4d}/{total}] 태그: {b['title'][:25]}")
        else:
            year_int = 2025
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
                "lists": ["morning-reading"],
                "why": WHY_TEMPLATE.format(year=year),
            }
            added += 1
            if (i + 1) % 50 == 0:
                print(f"  [{year}/{i+1:4d}/{total}] 추가({age}): {item.get('title','')[:25]}")
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

    for year, books in [(2024, BOOKS_2024), (2025, BOOKS_2025), (2026, BOOKS_2026)]:
        a, t, f_ = process_year(year, books, rec_books)
        grand_added += a
        grand_tagged += t
        grand_failed += f_

        # 매 연도 끝나면 중간 저장 (장시간 작업 보호)
        with open(REC_PATH, "w", encoding="utf-8") as f:
            json.dump(rec, f, ensure_ascii=False, indent=2)
        print(f"  ※ 중간 저장 ({len(rec_books)}권)")

    print(f"\n========== 최종 결과 ==========")
    print(f"  신규 추가:   {grand_added}")
    print(f"  태그 추가:   {grand_tagged}")
    print(f"  실패:        {grand_failed}")
    print(f"  최종 총권수: {len(rec_books)} (시작 {initial} → +{len(rec_books) - initial})")


if __name__ == "__main__":
    main()
