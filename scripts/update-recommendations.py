#!/usr/bin/env python3
"""
추천 DB 업데이트 스크립트
1. expanded-database.json 유아/초등 책 머지
2. 썸네일 없는 책 Aladin API 로 보충
3. 책따세 유명 도서 추가
"""

import json, urllib.request, urllib.parse, time, sys, os

WORKER = "https://book-tracker-aladin.obangti.workers.dev"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REC_PATH = os.path.join(BASE_DIR, "data", "book-recommendations.json")
EXP_PATH = os.path.join(BASE_DIR, "data", "expanded-database.json")

TARGET_AGES = {"유아", "초등", "초등 저학년", "초등 고학년", "초등 중학년", "초등 1-2학년"}

# 책따세 유명 도서 목록 (제목으로 검색해서 ISBN 확보)
CHAEKTASE_TITLES = [
    "강아지똥",
    "마당을 나온 암탉",
    "나쁜 어린이 표",
    "초정리 편지",
    "내 짝꿍 최영대",
    "오소리네 집 꽃밭",
    "도토리 신발",
    "훨훨 간다",
    "귀신 선생님과 진진이",
    "받아쓰기 왕",
    "열두 살에 부자가 된 키라",
    "구름빵",
    "100만번 산 고양이",
    "괴물들이 사는 나라",
    "그레이트 빅 북 오브 패밀리스",
    "솔이의 추석 이야기",
    "연이네 설맞이",
    "봄비",
    "팥죽 할멈과 호랑이",
    "토끼의 의자",
    "너는 특별하단다",
    "피터 래빗",
    "구름을 가두는 사람들",
    "고양이 해결사 깜냥",
    "신기한 스쿨버스",
    "무기 팔지 마세요",
    "내가 라면을 먹을 때",
    "소중한 것들",
    "비밀 정원",
    "돼지책",
]

# 새 소스 추가 (북스타트)
NEW_SOURCES = [
    {
        "id": "bookstart",
        "name": "북스타트 추천",
        "fullName": "북스타트 코리아 추천도서",
        "url": "https://www.bookstart.or.kr/",
        "description": "영아·유아(0~7세)를 위한 그림책 중심 추천 프로그램",
        "badge": {"text": "북스타트", "color": "#e67e22"}
    }
]

# 북스타트 추천 ISBN 목록 (0-7세 그림책)
BOOKSTART_BOOKS = [
    ("9788949180014", "강아지똥", "권정생"),
    ("9788937462443", "구름빵", "백희나"),
    ("9788962477016", "달 샤베트", "백희나"),
    ("9788937462375", "이상한 엄마", "백희나"),
    ("9788936445096", "알사탕", "백희나"),
    ("9788934980230", "손이 나왔네", "하야시 아키코"),
    ("9788934980216", "무엇이 무엇이 똑같을까", "하야시 아키코"),
    ("9788949180748", "100만번 산 고양이", "사노 요코"),
    ("9788936435400", "팥죽 할멈과 호랑이", "박윤규"),
    ("9788984131781", "솔이의 추석 이야기", "이억배"),
    ("9788998751524", "토끼의 의자", "기무라 유이치"),
    ("9788901204543", "어린이 생명의 책 1-5세", "하야시 아키코"),
    ("9788992505581", "괴물들이 사는 나라", "모리스 샌닥"),
    ("9788955471571", "그대로 멈춰라", "하야시 아키코"),
    ("9788937460302", "피터 래빗 이야기", "베아트릭스 포터"),
    ("9788949109367", "아낌없이 주는 나무", "쉘 실버스타인"),
    ("9788974787417", "너는 특별하단다", "맥스 루케이도"),
    ("9788958287810", "세상에서 제일 힘센 수탉", "이호백"),
    ("9788955470420", "연이네 설맞이", "채인선"),
    ("9788984131460", "봄봄봄", "이억배"),
]


def fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "moms-books/1.0"})
        with urllib.request.urlopen(req, timeout=12) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  [ERR] {url[:80]} → {e}")
        return None


def aladin_lookup(isbn):
    url = f"{WORKER}/aladin/lookup?ItemId={isbn}&ItemIdType=ISBN13"
    data = fetch(url)
    if not data:
        return None
    items = data.get("item", [])
    return items[0] if items else None


def aladin_search(title):
    q = urllib.parse.quote(title)
    url = f"{WORKER}/aladin/search?Query={q}&QueryType=Title&SearchTarget=Book&MaxResults=3&CategoryId=2551"
    data = fetch(url)
    if not data:
        return None
    items = data.get("item", [])
    # 제목이 가장 비슷한 것 선택
    for item in items:
        if title[:4] in item.get("title", ""):
            return item
    return items[0] if items else None


def normalize_age(age_str):
    if not age_str:
        return "초등"
    if "유아" in age_str or "영아" in age_str:
        return "유아"
    if "저학년" in age_str or "1-2" in age_str:
        return "초등 저학년"
    if "중학년" in age_str or "3-4" in age_str:
        return "초등 중학년"
    if "고학년" in age_str or "5-6" in age_str:
        return "초등 고학년"
    return age_str


def main():
    print("=== 추천 DB 업데이트 시작 ===\n")

    with open(REC_PATH, encoding="utf-8") as f:
        rec = json.load(f)
    with open(EXP_PATH, encoding="utf-8") as f:
        exp = json.load(f)

    rec_books = rec["books"]
    exp_books = exp.get("books", {})

    # ── 1. 새 소스 메타 추가 ────────────────────────
    existing_ids = {s["id"] for s in rec["meta"]["sources"]}
    for src in NEW_SOURCES:
        if src["id"] not in existing_ids:
            rec["meta"]["sources"].append(src)
            print(f"소스 추가: {src['name']}")

    # ── 2. expanded-database 머지 ────────────────────
    merged = 0
    for isbn, b in exp_books.items():
        if isbn in rec_books:
            continue
        age = b.get("targetAge", "")
        if age not in TARGET_AGES:
            continue
        rec_books[isbn] = {
            "isbn": isbn,
            "title": b.get("title", ""),
            "author": b.get("author", ""),
            "publisher": b.get("publisher", ""),
            "thumbnail": b.get("thumbnail", ""),
            "year": b.get("year"),
            "targetAge": normalize_age(age),
            "genre": b.get("genre", ""),
            "lists": b.get("lists", []),
            "why": b.get("why", ""),
        }
        merged += 1
    print(f"expanded-database 머지: {merged}권 추가\n")

    # ── 3. 책따세 도서 검색·추가 ─────────────────────
    print(f"책따세 도서 검색 ({len(CHAEKTASE_TITLES)}개)...")
    chaektase_added = 0
    for i, title in enumerate(CHAEKTASE_TITLES):
        item = aladin_search(title)
        if not item:
            print(f"  [{i+1}/{len(CHAEKTASE_TITLES)}] 검색 실패: {title}")
            time.sleep(0.4)
            continue
        isbn = str(item.get("isbn13", "")).replace("-", "")
        if not isbn:
            print(f"  [{i+1}/{len(CHAEKTASE_TITLES)}] ISBN 없음: {title}")
            time.sleep(0.4)
            continue
        if isbn not in rec_books:
            rec_books[isbn] = {
                "isbn": isbn,
                "title": item.get("title", title),
                "author": item.get("author", ""),
                "publisher": item.get("publisher", ""),
                "thumbnail": item.get("cover", ""),
                "year": int(item.get("pubDate", "2000")[:4]) if item.get("pubDate") else None,
                "targetAge": "초등",
                "genre": "문학",
                "lists": ["chaektase"],
                "why": "책읽는교육사회실천회의가 선정한 추천도서입니다.",
            }
            chaektase_added += 1
            print(f"  [{i+1}/{len(CHAEKTASE_TITLES)}] 추가: {item.get('title','')[:30]}")
        else:
            b = rec_books[isbn]
            if "chaektase" not in b.get("lists", []):
                b.setdefault("lists", []).append("chaektase")
            print(f"  [{i+1}/{len(CHAEKTASE_TITLES)}] 이미 있음 (chaektase 태그 추가): {title}")
        time.sleep(0.4)
    print(f"책따세 새 도서: {chaektase_added}권\n")

    # ── 4. 북스타트 도서 추가 ────────────────────────
    print(f"북스타트 도서 처리 ({len(BOOKSTART_BOOKS)}개)...")
    bs_added = 0
    for isbn, title, author in BOOKSTART_BOOKS:
        if isbn in rec_books:
            b = rec_books[isbn]
            if "bookstart" not in b.get("lists", []):
                b.setdefault("lists", []).append("bookstart")
            continue
        item = aladin_lookup(isbn)
        if item:
            rec_books[isbn] = {
                "isbn": isbn,
                "title": item.get("title", title),
                "author": item.get("author", author),
                "publisher": item.get("publisher", ""),
                "thumbnail": item.get("cover", ""),
                "year": int(item.get("pubDate", "2000")[:4]) if item.get("pubDate") else None,
                "targetAge": "유아",
                "genre": "그림책",
                "lists": ["bookstart"],
                "why": "북스타트 코리아 추천 그림책입니다. 영아·유아(0~7세)에게 적합해요.",
            }
            bs_added += 1
        else:
            rec_books[isbn] = {
                "isbn": isbn, "title": title, "author": author,
                "publisher": "", "thumbnail": "",
                "year": None, "targetAge": "유아", "genre": "그림책",
                "lists": ["bookstart"],
                "why": "북스타트 코리아 추천 그림책입니다.",
            }
            bs_added += 1
        time.sleep(0.3)
    print(f"북스타트 도서: {bs_added}권 추가\n")

    # ── 5. 썸네일 없는 책 보충 ───────────────────────
    no_thumb = [isbn for isbn, b in rec_books.items() if not b.get("thumbnail")]
    print(f"썸네일 없는 책: {len(no_thumb)}권 → Aladin 조회 시작...")
    fixed = 0
    for i, isbn in enumerate(no_thumb):
        item = aladin_lookup(isbn)
        if item and item.get("cover"):
            rec_books[isbn]["thumbnail"] = item["cover"]
            fixed += 1
            if fixed % 10 == 0:
                print(f"  진행 {i+1}/{len(no_thumb)} (보충 {fixed})")
        time.sleep(0.3)
    print(f"썸네일 보충: {fixed}/{len(no_thumb)}권\n")

    # ── 저장 ────────────────────────────────────────
    total = len(rec_books)
    with open(REC_PATH, "w", encoding="utf-8") as f:
        json.dump(rec, f, ensure_ascii=False, indent=2)
    print(f"=== 완료 ===")
    print(f"총 책: {total}권")
    print(f"저장: {REC_PATH}")


if __name__ == "__main__":
    main()
