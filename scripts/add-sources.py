#!/usr/bin/env python3
"""어린이도서연구회 보강 + 전국독서새물결모임 추가"""

import json, urllib.request, urllib.parse, time, os

WORKER = "https://book-tracker-aladin.obangti.workers.dev"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REC_PATH = os.path.join(BASE_DIR, "data", "book-recommendations.json")

# 새 소스
NEW_SOURCES = [
    {
        "id": "jeondokse",
        "name": "전국독서새물결모임 추천",
        "fullName": "전국독서새물결모임 추천도서",
        "url": "https://www.readingwave.or.kr/",
        "description": "현장 초등교사들이 직접 읽히고 검증한 교실 독서 추천 도서",
        "badge": {"text": "전독새", "color": "#5a7a5a"}
    },
    {
        "id": "kclw",
        "name": "한국어린이문학협의회 추천",
        "fullName": "한국어린이문학협의회 우수작품",
        "url": "https://www.kclw.or.kr/",
        "description": "국내 어린이 문학 전문가들이 선정한 우수 창작 도서",
        "badge": {"text": "어린이문학협", "color": "#7b5ea7"}
    }
]

# (제목, 저자힌트, 연령, 소스목록)
BOOKS = [
    # 어린이도서연구회 (childbook) — 유아 그림책
    ("배고픈 애벌레", "에릭 칼", "유아", ["childbook"]),
    ("알록달록 동물원", "에릭 칼", "유아", ["childbook"]),
    ("소피가 화나면", "몰리 뱅", "유아", ["childbook"]),
    ("지각대장 존", "존 버닝햄", "유아", ["childbook"]),
    ("세 강도", "토미 웅게러", "유아", ["childbook"]),
    ("스위밍", "레오 리오니", "유아", ["childbook"]),
    ("프레드릭", "레오 리오니", "유아", ["childbook"]),
    ("엄마 까투리", "권정생", "유아", ["childbook"]),
    ("몽실 언니", "권정생", "초등", ["childbook"]),
    ("쫄보 우리 형", "임정진", "초등 저학년", ["childbook"]),
    ("아낌없이 주는 나무", "쉘 실버스타인", "유아", ["childbook"]),
    ("아기 오리는 어디로 갔을까", "로버트 맥클로스키", "유아", ["childbook"]),
    ("꼬마 기관차 토마스", "윌버트 오드리", "유아", ["childbook"]),
    ("검피 아저씨의 뱃놀이", "존 버닝햄", "유아", ["childbook"]),
    ("꼭 한번만", "존 버닝햄", "유아", ["childbook"]),
    ("미피", "딕 브루너", "유아", ["childbook"]),
    ("구름 공항", "데이비드 위즈너", "유아", ["childbook"]),
    ("파도야 놀자", "이수지", "유아", ["childbook", "kclw"]),
    ("여름이 온다", "이수지", "유아", ["childbook", "kclw"]),
    ("줄 잇기", "이수지", "유아", ["childbook"]),
    ("동생이 태어날 거야", "레이첼 이사도라", "유아", ["childbook"]),
    ("으악, 도깨비다", "손정원", "유아", ["childbook"]),
    ("연두와 친구들", "성효숙", "유아", ["childbook", "kclw"]),
    # 전국독서새물결모임 (jeondokse) — 초등
    ("책과 노니는 집", "이영서", "초등", ["jeondokse"]),
    ("짜장 짬뽕 탕수육", "김홍신", "초등 저학년", ["jeondokse"]),
    ("왜요?", "린지 캠프", "초등 저학년", ["jeondokse"]),
    ("꼴찌라도 괜찮아", "백은하", "초등 저학년", ["jeondokse"]),
    ("아름다운 실수", "코리나 루켄", "초등 저학년", ["jeondokse"]),
    ("용기를 내, 헨리에타", "고인돌", "초등 저학년", ["jeondokse"]),
    ("우리들의 일그러진 영웅", "이문열", "초등 고학년", ["jeondokse"]),
    ("완득이", "김려령", "초등 고학년", ["jeondokse"]),
    ("공부독립 선언", "이범", "초등", ["jeondokse"]),
    ("5번 레인", "은소홀", "초등 고학년", ["jeondokse", "kclw"]),
    ("아몬드", "손원평", "초등 고학년", ["jeondokse"]),
    ("어쩌다 마주친 그 표현", "서유재", "초등", ["jeondokse"]),
    # 한국어린이문학협의회 (kclw) 우수작
    ("소나기 소년", "강무홍", "초등", ["kclw"]),
    ("비밀 독서단", "한윤섭", "초등", ["kclw"]),
    ("나 혼자 산다", "박현숙", "초등", ["kclw"]),
    ("수상한 인형의 집", "황선미", "초등", ["kclw"]),
    ("훈민정음 구출 작전", "김종렬", "초등", ["kclw"]),
    ("도깨비폰을 개통하시겠습니까", "임지형", "초등", ["kclw"]),
    ("나는 나의 주인", "채인선", "초등 저학년", ["kclw"]),
    ("줄무늬 파자마를 입은 소년", "존 보인", "초등 고학년", ["kclw"]),
]

def fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "moms-books/1.0"})
        with urllib.request.urlopen(req, timeout=12) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  [ERR] {e}")
        return None

def search(title):
    q = urllib.parse.quote(title)
    url = f"{WORKER}/aladin/search?Query={q}&QueryType=Title&SearchTarget=Book&MaxResults=5"
    data = fetch(url)
    if not data:
        return None
    items = data.get("item", [])
    key = title[:4]
    for item in items:
        if key in item.get("title", ""):
            return item
    return items[0] if items else None

def main():
    with open(REC_PATH, encoding="utf-8") as f:
        rec = json.load(f)
    rec_books = rec["books"]

    # 소스 추가
    existing_ids = {s["id"] for s in rec["meta"]["sources"]}
    for src in NEW_SOURCES:
        if src["id"] not in existing_ids:
            rec["meta"]["sources"].append(src)
            print(f"소스 추가: {src['name']}")

    added = tagged = failed = 0
    print(f"\n도서 {len(BOOKS)}개 처리 중...\n")

    for i, (title, author_hint, age, lists) in enumerate(BOOKS):
        item = search(title)
        if not item:
            print(f"  [{i+1:2d}] 실패: {title}")
            failed += 1
            time.sleep(0.5)
            continue

        isbn = str(item.get("isbn13", "")).replace("-", "")
        if not isbn:
            print(f"  [{i+1:2d}] ISBN없음: {title}")
            failed += 1
            time.sleep(0.5)
            continue

        if isbn in rec_books:
            b = rec_books[isbn]
            new_tags = [l for l in lists if l not in b.get("lists", [])]
            if new_tags:
                b.setdefault("lists", []).extend(new_tags)
                tagged += 1
                print(f"  [{i+1:2d}] 태그추가({','.join(new_tags)}): {b['title'][:28]}")
            else:
                print(f"  [{i+1:2d}] 이미완료: {b['title'][:28]}")
        else:
            rec_books[isbn] = {
                "isbn": isbn,
                "title": item.get("title", title),
                "author": item.get("author", author_hint),
                "publisher": item.get("publisher", ""),
                "thumbnail": item.get("cover", ""),
                "year": int(item.get("pubDate", "2000")[:4]) if item.get("pubDate") else None,
                "targetAge": age,
                "genre": "그림책" if age == "유아" else "문학",
                "lists": lists,
                "why": _why(lists),
            }
            added += 1
            print(f"  [{i+1:2d}] 추가({','.join(lists)}): {item.get('title','')[:28]}")
        time.sleep(0.35)

    with open(REC_PATH, "w", encoding="utf-8") as f:
        json.dump(rec, f, ensure_ascii=False, indent=2)

    print(f"\n완료 — 신규: {added}, 태그추가: {tagged}, 실패: {failed}, 총: {len(rec_books)}권")

def _why(lists):
    msgs = {
        "childbook": "어린이도서연구회가 선정한 권장도서입니다.",
        "jeondokse": "전국독서새물결모임 현장 교사들이 직접 검증한 추천도서입니다.",
        "kclw": "한국어린이문학협의회 우수 창작 도서로 선정된 책입니다.",
    }
    for lid in lists:
        if lid in msgs:
            return msgs[lid]
    return "추천 도서입니다."

if __name__ == "__main__":
    main()
