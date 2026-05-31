#!/usr/bin/env python3
"""청소년(targetAge) 보수적 트리아지.

맘스북스는 유초등 전용. data/book-recommendations.json 의 targetAge=="청소년" 항목을
- PROMOTE: 명백히 초등 고학년 적합 -> targetAge="초등 고학년" 으로 변경(유지)
- DELETE : 그 외 전부 -> books dict 에서 제거

기준은 보수적(default DELETE). PROMOTE 는 명백한 것만(allow-list).
DELETE = (전체 청소년) - (PROMOTE allow-list).

산출물:
- data/book-recommendations.json 갱신 (in-place mutate, 재정렬/재포맷 금지)
- data/triage-cheongsonyeon-deleted.json
- data/triage-cheongsonyeon-promoted.json
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "data", "book-recommendations.json")

# 명백히 초등 고학년 적합한 ISBN-13 allow-list (개별 판단).
# - 7인의 마법사: 다이애나 윈 존스 초등 판타지(출판사 가람어린이)
# - 종달새 언덕의 마법사: 일본 동화풍 가벼운 마법사 판타지
# - 달력으로 배우는 세계 역사문화 수업: 제목에 "초등생을 위한" 명시(청소년은 수상명에만 등장)
# - 프린들 파일: 앤드루 클레먼츠, 그림 수록, 햇살과나무꾼 옮김 — 초등 중·고학년 대표 작가
# 뉴베리 수상작 중 초등 고학년 대표 스테디셀러(개별 검토 후 복원):
# - 구덩이/손도끼/별을 헤아리며/그리운 메이 아줌마/루비 홀러/홀리스 우즈의 그림들
# (기억 전달자·아프리카 소녀 나모·나를 통째로 삼켜 버린 소녀는 성숙 주제로 삭제 유지)
PROMOTE_ISBNS = {
    "9791165182694",  # 7인의 마법사
    "9791173321641",  # 종달새 언덕의 마법사
    "9791191309355",  # 달력으로 배우는 세계 역사문화 수업 (초등생을 위한)
    "9791169814003",  # 프린들 파일
    "9788936456023",  # 구덩이 (Holes, 루이스 새커)
    "9788971967867",  # 손도끼 (Hatchet, 게리 폴슨)
    "9788963724294",  # 별을 헤아리며 (Number the Stars, 로이스 로리)
    "9788958280835",  # 그리운 메이 아줌마 (Missing May)
    "9788961700054",  # 루비 홀러 (Ruby Holler, 샤론 크리치)
    "9788961703970",  # 홀리스 우즈의 그림들
}

NEW_AGE = "초등 고학년"


def reason_for(b):
    """DELETE 사유 한 줄 생성. newbery 는 사용자 별도 검토용으로 태그."""
    lists = b.get("lists", [])
    if "newbery-award" in lists:
        return "newbery: 뉴베리 수상작이나 청소년/중등 무게(보수적 기준상 삭제, 사용자 검토 요망)"
    title = b.get("title", "")
    markers = ["십 대", "십대", "10대", "사춘기", "중학", "고등", "청소년", "입시",
               "진로", "수능", "연애"]
    if any(m in title for m in markers):
        return "title-marker: 제목/부제 청소년 마커"
    return "청소년 대상 교양·논픽션 또는 YA 문학(보수적 기준상 삭제)"


def main():
    with open(PATH, encoding="utf-8") as f:
        d = json.load(f)
    books = d["books"]

    cheong = [(k, b) for k, b in books.items() if b.get("targetAge") == "청소년"]
    assert len(cheong) == 864, f"expected 864 cheongsonyeon, got {len(cheong)}"

    promoted = []
    deleted = []

    for k, b in cheong:
        if k in PROMOTE_ISBNS:
            b["targetAge"] = NEW_AGE  # in-place, 순서 보존
            promoted.append({
                "isbn": k,
                "title": b["title"],
                "author": b["author"],
                "genre": b.get("genre"),
                "lists": b.get("lists", []),
            })
        else:
            deleted.append({
                "isbn": k,
                "title": b["title"],
                "author": b["author"],
                "genre": b.get("genre"),
                "lists": b.get("lists", []),
                "reason": reason_for(b),
            })

    # PROMOTE 누락 검증: allow-list 전부 매칭됐는지
    matched = {p["isbn"] for p in promoted}
    missing = PROMOTE_ISBNS - matched
    assert not missing, f"PROMOTE ISBNs not found among cheongsonyeon: {missing}"
    assert len(promoted) + len(deleted) == 864, "PROMOTE + DELETE != 864"

    # DELETE 적용 (in-place)
    for entry in deleted:
        del books[entry["isbn"]]

    d["meta"]["lastUpdated"] = "2026-05-30"

    # 매니페스트 저장
    with open(os.path.join(ROOT, "data", "triage-cheongsonyeon-deleted.json"),
              "w", encoding="utf-8") as f:
        json.dump(deleted, f, ensure_ascii=False, indent=2)
        f.write("\n")
    with open(os.path.join(ROOT, "data", "triage-cheongsonyeon-promoted.json"),
              "w", encoding="utf-8") as f:
        json.dump(promoted, f, ensure_ascii=False, indent=2)
        f.write("\n")

    # 본 파일 저장 (재정렬 금지, 기존 포맷 유지: indent=2, ensure_ascii=False, 끝 개행)
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"PROMOTE {len(promoted)}, DELETE {len(deleted)}, total now {len(books)}")


if __name__ == "__main__":
    main()
