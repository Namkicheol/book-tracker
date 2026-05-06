#!/usr/bin/env python3
"""책따세 도서 보강 스크립트"""

import json, urllib.request, urllib.parse, time, os

WORKER = "https://book-tracker-aladin.obangti.workers.dev"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REC_PATH = os.path.join(BASE_DIR, "data", "book-recommendations.json")

# 책따세 + 어린이도서연구회 유명 도서 (유아~초등)
CHAEKTASE_BOOKS = [
    # 그림책 (유아~초등 저학년)
    ("강아지똥", "권정생", "유아"),
    ("오소리네 집 꽃밭", "권정생", "유아"),
    ("훨훨 간다", "권정생", "유아"),
    ("도토리 신발", "권정생", "유아"),
    ("나쁜 어린이 표", "황선미", "초등 저학년"),
    ("마당을 나온 암탉", "황선미", "초등"),
    ("구름빵", "백희나", "유아"),
    ("달 샤베트", "백희나", "유아"),
    ("이상한 엄마", "백희나", "유아"),
    ("100만번 산 고양이", "사노 요코", "유아"),
    ("괴물들이 사는 나라", "모리스 샌닥", "유아"),
    ("팥죽 할멈과 호랑이", "박윤규", "유아"),
    ("솔이의 추석 이야기", "이억배", "유아"),
    ("봄비", "이억배", "유아"),
    ("세상에서 제일 힘센 수탉", "이호백", "유아"),
    ("돼지책", "앤서니 브라운", "유아"),
    ("너는 특별하단다", "맥스 루케이도", "유아"),
    ("피터 래빗 이야기", "베아트릭스 포터", "유아"),
    ("내가 라면을 먹을 때", "하세가와 요시후미", "유아"),
    ("토끼의 의자", "기무라 유이치", "유아"),
    ("소중한 날의 꿈", "한나 바르바라", "유아"),
    ("내 짝꿍 최영대", "채인선", "초등 저학년"),
    ("연이네 설맞이", "채인선", "유아"),
    # 초등
    ("초정리 편지", "배유안", "초등"),
    ("귀신 선생님과 진진이", "박기범", "초등 저학년"),
    ("받아쓰기 왕", "강무홍", "초등 저학년"),
    ("신기한 스쿨버스", "조애너 콜", "초등"),
    ("열두 살에 부자가 된 키라", "보도 섀퍼", "초등"),
    ("고양이 해결사 깜냥", "박유미", "초등 저학년"),
    ("무기 팔지 마세요", "에리크 바튀", "초등"),
    ("구름을 가두는 사람들", "론 알리 클라인", "초등"),
    ("비밀의 화원", "프랜시스 호지슨 버넷", "초등"),
    ("어린 왕자", "생텍쥐페리", "초등"),
    ("키다리 아저씨", "진 웹스터", "초등"),
    ("플란더스의 개", "위다", "초등"),
    ("나의 라임오렌지나무", "조제 마우로 데 바스콘셀로스", "초등"),
    ("그레이트 빅 북 오브 패밀리스", "메리 호프만", "유아"),
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
    # 제목 첫 4글자 매칭
    key = title[:4]
    for item in items:
        if key in item.get("title", ""):
            return item
    return items[0] if items else None

def main():
    with open(REC_PATH, encoding="utf-8") as f:
        rec = json.load(f)
    rec_books = rec["books"]

    added = tagged = 0
    print(f"책따세 도서 {len(CHAEKTASE_BOOKS)}개 처리 중...\n")

    for i, (title, author_hint, age) in enumerate(CHAEKTASE_BOOKS):
        item = search(title)
        if not item:
            print(f"  [{i+1:2d}] 실패: {title}")
            time.sleep(0.5)
            continue

        isbn = str(item.get("isbn13", "")).replace("-", "")
        if not isbn:
            print(f"  [{i+1:2d}] ISBN없음: {title}")
            time.sleep(0.5)
            continue

        if isbn in rec_books:
            b = rec_books[isbn]
            changed = False
            if "chaektase" not in b.get("lists", []):
                b.setdefault("lists", []).append("chaektase")
                changed = True
            print(f"  [{i+1:2d}] 태그{'추가' if changed else '있음'}: {b['title'][:30]}")
            tagged += 1
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
                "lists": ["chaektase"],
                "why": "책읽는교육사회실천회의가 선정한 추천도서입니다. 교육 현장 교사들이 직접 읽고 검증한 양서예요.",
            }
            added += 1
            print(f"  [{i+1:2d}] 추가: {item.get('title','')[:30]}")
        time.sleep(0.35)

    with open(REC_PATH, "w", encoding="utf-8") as f:
        json.dump(rec, f, ensure_ascii=False, indent=2)

    print(f"\n완료 — 신규: {added}, 태그추가: {tagged}, 총: {len(rec_books)}권")

if __name__ == "__main__":
    main()
