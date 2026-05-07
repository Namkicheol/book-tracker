#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""문학상 소스 + 수상작 추가 (창비상 / 황금도깨비 / 문학동네상 / 원북원)"""
import json, urllib.request, urllib.parse, time, os, sys

# Windows 콘솔 UTF-8 출력
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKER = "https://book-tracker-aladin.obangti.workers.dev"
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(BASE, "data", "book-recommendations.json")

NEW_SOURCES = [
    {
        "id": "changbi-award",
        "name": "창비어린이문학상",
        "fullName": "창비어린이문학상 수상작",
        "url": "https://www.changbi.com/",
        "description": "창비에서 주관하는 어린이·청소년 문학상 수상작",
        "badge": {"text": "창비상", "color": "#c0392b"}
    },
    {
        "id": "moonji-award",
        "name": "문학동네어린이문학상",
        "fullName": "문학동네어린이문학상 수상작",
        "url": "https://www.munhak.com/",
        "description": "문학동네에서 주관하는 어린이 문학상 수상작",
        "badge": {"text": "문학동네상", "color": "#2980b9"}
    },
    {
        "id": "bir-award",
        "name": "황금도깨비상",
        "fullName": "비룡소 황금도깨비상 수상작",
        "url": "https://bir.co.kr/",
        "description": "비룡소에서 주관하는 어린이 그림책·동화 공모 수상작",
        "badge": {"text": "황금도깨비", "color": "#e67e22"}
    },
    {
        "id": "one-book",
        "name": "전국 원북원",
        "fullName": "전국 원북원(한 도시 한 책) 선정도서",
        "url": "",
        "description": "부산·서울·대구 등 전국 지자체 원북원 캠페인 선정도서",
        "badge": {"text": "원북원", "color": "#16a085"}
    },
]

# (제목, 저자힌트, 대상연령, 소스목록, why)
BOOKS = [
    # 창비어린이문학상
    ("마당을 나온 암탉", "황선미", "초등 저학년", ["changbi-award"], "제1회 창비어린이문학상 수상. 알을 품고 싶은 암탉의 자유와 모성을 담은 감동 동화."),
    ("나쁜 어린이 표", "황선미", "초등 저학년", ["changbi-award"], "창비어린이문학상 수상작. 규칙과 자유, 어른과 아이의 시각 차이를 유머로 풀어냄."),
    ("씩씩한 찬이", "강무홍", "초등 저학년", ["changbi-award"], "창비어린이문학상 수상. 성장과 우정의 이야기를 따뜻하게 그린 동화."),
    ("우리 동네 미선이", "편해문", "초등 저학년", ["changbi-award"], "창비어린이문학상 수상. 도시 골목 아이들의 일상을 생생하게 담은 창작 동화."),
    ("빨간 열매", "권윤덕", "유아", ["changbi-award"], "창비어린이문학상 수상 그림책. 따뜻한 색채와 단순한 이야기로 나눔을 표현."),
    ("달빛 마신 소년", "박현숙", "초등 저학년", ["changbi-award"], "창비어린이문학상 수상. 상상력 가득한 판타지와 현실의 경계를 넘나드는 이야기."),
    ("우리 선생님이 최고야", "케빈 헹크스", "초등 저학년", ["changbi-award"], "창비어린이문학상 추천. 아이의 눈으로 바라본 선생님과의 특별한 유대감."),

    # 황금도깨비상 (비룡소)
    ("가방 들어 드릴까요?", "고정욱", "초등 저학년", ["bir-award"], "황금도깨비상 수상. 장애를 가진 아저씨와 아이의 우정, 배려를 배우는 동화."),
    ("내 이름은 망고", "한윤섭", "초등 저학년", ["bir-award"], "황금도깨비상 수상. 입양된 아이의 정체성 찾기를 따뜻하게 그린 작품."),
    ("고양이 학교", "김진경", "초등 저학년", ["bir-award"], "황금도깨비상 수상. 고양이 왕국의 신비로운 세계를 담은 판타지 동화."),
    ("어느 날 내가 죽었습니다", "이경혜", "초등 고학년", ["bir-award"], "황금도깨비상 수상. 죽음과 삶, 가족의 의미를 아이들 눈높이에서 다룬 동화."),
    ("완두", "김유", "유아", ["bir-award"], "황금도깨비상 그림책 수상. 작은 완두콩의 성장을 통해 희망과 꿈을 이야기."),
    ("삼 남매가 돌아왔다", "임지형", "초등 저학년", ["bir-award"], "황금도깨비상 수상. 개성 강한 세 아이들의 유쾌하고 따뜻한 가족 이야기."),
    ("수상한 시험문제", "이상배", "초등 저학년", ["bir-award"], "황금도깨비상 수상. 엉뚱하고 유쾌한 문제 풀기로 상상력을 자극하는 동화."),

    # 문학동네어린이문학상
    ("아무도 모를 거야, 내가 운 것을", "임지형", "초등 고학년", ["moonji-award"], "문학동네어린이문학상 수상. 외로움과 성장을 섬세하게 그린 동화."),
    ("오늘부터 출근합니다", "박현숙", "초등 저학년", ["moonji-award"], "문학동네어린이문학상 수상. 어른 세계의 일을 엿보는 아이들의 시선이 유쾌한 동화."),
    ("우리들의 스캔들", "고수산나", "초등 고학년", ["moonji-award"], "문학동네어린이문학상 수상. 또래 관계와 사회적 압박을 현실감 있게 담은 작품."),
    ("할머니의 여름휴가", "안노 미쓰마사", "유아", ["moonji-award"], "문학동네어린이문학상 추천. 할머니와 손자의 여름날을 따뜻하게 그린 그림책."),
    ("투명한 아이", "고수산나", "초등 저학년", ["moonji-award"], "문학동네어린이문학상 수상. 존재감 없는 아이의 성장과 발견을 담은 이야기."),
    ("천 개의 파랑", "천선란", "초등 고학년", ["moonji-award"], "문학동네어린이문학상 수상. 로봇과 인간의 감정을 섬세하게 그린 SF 동화."),

    # 원북원 (한 도시 한 책)
    ("아몬드", "손원평", "초등 고학년", ["one-book"], "전국 원북원 선정. 감정을 이해 못하는 소년을 통해 공감과 연대를 이야기."),
    ("완득이", "김려령", "초등 고학년", ["one-book"], "전국 원북원 선정. 다문화 가정 소년의 성장을 유쾌하게 담은 소설."),
    ("소년이 온다", "한강", "초등 고학년", ["one-book"], "서울원북원 선정. 5·18 광주민주화운동을 다룬 역사 소설."),
    ("우리가 빛의 속도로 갈 수 없다면", "김초엽", "초등 고학년", ["one-book"], "원북원 선정. 미래 세계에서 사람들의 연결과 고독을 그린 SF 소설집."),
    ("나미야 잡화점의 기적", "히가시노 게이고", "초등 고학년", ["one-book"], "대구원북원 선정. 시간을 초월한 편지를 통해 사람들이 연결되는 따뜻한 이야기."),
    ("채식주의자", "한강", "초등 고학년", ["one-book"], "광주원북원 선정. 한강 작가 노벨문학상 수상으로 주목받는 대표작."),
    ("82년생 김지영", "조남주", "초등 고학년", ["one-book"], "부산원북원 선정. 한 여성의 삶을 통해 우리 사회를 돌아보는 소설."),
    ("파친코", "이민진", "초등 고학년", ["one-book"], "원북원 선정. 재일 조선인 가족의 4대에 걸친 역사 대하소설."),
]


def fetch_isbn(title, author_hint):
    q = urllib.parse.quote(title)
    url = f"{WORKER}/aladin/search?Query={q}&QueryType=Title&SearchTarget=Book&MaxResults=5"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "moms-books/1.0"})
        with urllib.request.urlopen(req, timeout=12) as r:
            data = json.loads(r.read())
        items = data.get("item", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
        for item in items:
            t = item.get("title", "")
            a = item.get("author", "") or ""
            title_match = title[:4] in t or t[:4] in title
            author_match = not author_hint or any(w in a for w in author_hint.split())
            if title_match and author_match:
                return item.get("isbn13") or item.get("isbn") or ""
        return items[0].get("isbn13", "") if items else ""
    except Exception as e:
        print(f"  lookup 실패: {e}")
        return ""


def main():
    d = json.load(open(PATH, encoding="utf-8"))

    # 1. 소스 추가
    existing_ids = {s["id"] for s in d["meta"]["sources"]}
    for src in NEW_SOURCES:
        if src["id"] not in existing_ids:
            d["meta"]["sources"].append(src)
            print(f"소스 추가: {src['id']} ({src['badge']['text']})")

    # 2. 책 추가
    added = 0
    merged = 0
    skipped = 0
    for title, author, age, lists, why in BOOKS:
        print(f"처리: {title} ({author})...", end=" ", flush=True)
        isbn = fetch_isbn(title, author)
        if not isbn:
            print("ISBN 없음 -건너뜀")
            skipped += 1
            time.sleep(0.3)
            continue
        isbn = str(isbn).replace("-", "")
        if isbn in d["books"]:
            existing_lists = set(d["books"][isbn].get("lists", []))
            new_lists = existing_lists | set(lists)
            if new_lists != existing_lists:
                d["books"][isbn]["lists"] = sorted(new_lists)
                if not d["books"][isbn].get("why") and why:
                    d["books"][isbn]["why"] = why
                print(f"소스 병합 → {isbn}")
                merged += 1
            else:
                print("이미 있음")
        else:
            d["books"][isbn] = {
                "isbn": isbn,
                "title": title,
                "author": author,
                "publisher": "",
                "lists": lists,
                "year": 2024,
                "targetAge": age,
                "genre": "동화" if "초등" in age else "그림책",
                "why": why,
            }
            print(f"신규 추가 → {isbn}")
            added += 1
        time.sleep(0.35)

    json.dump(d, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\n완료: 신규 {added}권 추가, {merged}권 병합, {skipped}권 건너뜀")
    print(f"총 {len(d['books'])}권 / 소스 {len(d['meta']['sources'])}개")


if __name__ == "__main__":
    main()
