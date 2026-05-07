#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
데이터 정리 일괄처리:
  1. ISBN 형식 오류 항목 제거 (880/977 프리픽스, 10자리)
  2. textbookGrade 있는 책 genre 수정
  3. 제목 중복 처리 (lists 병합 후 하나 제거)
"""
import json, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(BASE, "data", "book-recommendations.json")

GRADE_TO_GENRE = {
    1: "그림책", 2: "그림책", 3: "동화",
    4: "동화", 5: "소설", 6: "소설",
}


def main():
    d = json.load(open(PATH, encoding="utf-8"))
    books = d["books"]
    total_before = len(books)

    # ── 1. ISBN 형식 오류 제거 ──────────────────────────────────────
    invalid = []
    for isbn in list(books):
        s = str(isbn)
        if len(s) != 13 or not (s.startswith("978") or s.startswith("979")):
            invalid.append(isbn)

    for isbn in invalid:
        title = books[isbn].get("title", isbn) if isinstance(books[isbn], dict) else isbn
        print(f"  [ISBN삭제] {isbn} — {title[:40]}")
        del books[isbn]
    print(f"\nISBN 오류 제거: {len(invalid)}건\n")

    # ── 2. genre 수정 (textbookGrade 있는 책) ──────────────────────
    genre_fixed = 0
    for isbn, book in books.items():
        if not isinstance(book, dict):
            continue
        grade = book.get("textbookGrade")
        if not grade:
            continue
        correct = GRADE_TO_GENRE.get(grade)
        if not correct:
            continue
        cur = book.get("genre", "")
        if cur not in ("그림책", "동화", "소설"):
            book["genre"] = correct
            print(f"  [Genre] {book.get('title','')[:35]} — {cur!r} → {correct!r}")
            genre_fixed += 1
    print(f"\nGenre 수정: {genre_fixed}건\n")

    # ── 3. 제목 중복 처리 ──────────────────────────────────────────
    title_map: dict[str, list] = {}
    for isbn, book in books.items():
        if not isinstance(book, dict):
            continue
        t = book.get("title", "")
        if t:
            title_map.setdefault(t, []).append(isbn)

    removed_dups = 0
    for title, isbns in title_map.items():
        if len(isbns) < 2:
            continue

        def score(isbn):
            b = books[isbn]
            return (
                len(b.get("lists", [])),
                1 if b.get("textbookGrade") else 0,
                1 if b.get("thumbnail") else 0,
                1 if b.get("why") else 0,
            )

        ranked = sorted(isbns, key=score, reverse=True)
        keep = ranked[0]

        # 유지할 항목에 나머지 lists 병합
        merged_lists = set(books[keep].get("lists", []))
        for dup in ranked[1:]:
            merged_lists |= set(books[dup].get("lists", []))
        books[keep]["lists"] = sorted(merged_lists)

        for dup in ranked[1:]:
            print(f"  [중복삭제] {title[:40]} — {dup} (유지: {keep})")
            del books[dup]
            removed_dups += 1

    print(f"\n중복 제거: {removed_dups}건\n")

    json.dump(d, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"완료: {total_before}권 → {len(books)}권 ({total_before - len(books)}건 감소)")


if __name__ == "__main__":
    main()
