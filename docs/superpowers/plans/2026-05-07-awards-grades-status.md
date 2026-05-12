# Awards · Grades · Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문학상 수상작 추천 소스 추가, 초등 학년 저(1-3)/고(4-6) 재편, 필터 칩 가로스크롤 개선, 내 서재 읽기 상태(읽을책/읽는중/읽음) 기능 추가.

**Architecture:**
- 데이터: `data/book-recommendations.json` (meta.sources + books) — 마이그레이션 Python 스크립트로 처리
- UI 필터: `js/recommendations.js` inline-style chip → overflow-x scroll 한 줄로 변경
- 읽기 상태: `js/storage.js` `status` 필드 추가, `js/index.js` 상태 배지 + 필터, `js/detail.js` 상태 편집, `js/book-preview.js` 저장 버튼 분기

**Tech Stack:** Vanilla JS (ES6), Python 3 (데이터 스크립트), localStorage, Aladin API worker

---

## File Map

| 파일 | 변경 유형 | 역할 |
|------|-----------|------|
| `scripts/migrate-grades.py` | 신규 | 학년 key 재매핑 |
| `scripts/add-award-books.py` | 신규 | 문학상 소스 + 수상작 추가 |
| `data/book-recommendations.json` | 수정 | 스크립트 출력 결과 |
| `js/recommendations.js` | 수정 | 학년 목록 + 필터 칩 가로스크롤 |
| `js/storage.js` | 수정 | `status` 필드 추가 |
| `js/book-preview.js` | 수정 | 저장 버튼 → 상태 선택 |
| `js/index.js` | 수정 | 카드 상태 배지 + 상태 필터 탭 |
| `js/detail.js` | 수정 | 상태 편집 UI |

---

## Task 1: 학년 데이터 재매핑 (Python 스크립트)

**Files:**
- Create: `scripts/migrate-grades.py`
- Modify: `data/book-recommendations.json`

현재 targetAge 값 분포: 유아(668), 초등(668), 초등 저학년(553), 초등 중학년(204), 초등 고학년(58), 초등 1-2학년(2)

재매핑 규칙:
- `"초등 저학년"` → `"초등 저학년"` (라벨만 1-3으로 변경, key 유지)
- `"초등 중학년"` → `"초등 저학년"` (3-4학년 → 1-3 범위에서 3학년이 대부분)
- `"초등 고학년"` → `"초등 고학년"` (라벨만 4-6으로 변경, key 유지)
- `"초등 1-2학년"` → `"초등 저학년"` (레거시 2권)
- `"초등"` → `"초등"` (유지 — 학년 무관 공통 도서)
- `"유아"` → `"유아"` (유지)

- [ ] **Step 1: 스크립트 작성**

```python
#!/usr/bin/env python3
"""초등 학년 재매핑: 저(1-2)/중(3-4)/고(5-6) → 저(1-3)/고(4-6)"""
import json, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(BASE, "data", "book-recommendations.json")

REMAP = {
    "초등 중학년":   "초등 저학년",
    "초등 1-2학년": "초등 저학년",
}

def main():
    d = json.load(open(PATH, encoding="utf-8"))
    changed = 0
    for isbn, book in d["books"].items():
        old = book.get("targetAge", "")
        new = REMAP.get(old, old)
        if new != old:
            book["targetAge"] = new
            changed += 1
    json.dump(d, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"완료: {changed}권 재매핑")
    # 분포 확인
    from collections import Counter
    dist = Counter(b.get("targetAge","") for b in d["books"].values())
    for k, v in sorted(dist.items()):
        print(f"  {k}: {v}권")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 실행**

```powershell
cd "C:\Users\Admin\iCloudDrive\Developments\book-tracker"
python scripts/migrate-grades.py
```

기대 출력:
```
완료: 206권 재매핑
  유아: 668권
  초등: 668권
  초등 저학년: 759권
  초등 고학년: 58권
```

- [ ] **Step 3: 커밋**

```powershell
git add scripts/migrate-grades.py data/book-recommendations.json
git commit -m "data: 초등 학년 재편 — 저(1-3)/고(4-6) 재매핑"
```

---

## Task 2: 문학상 소스 + 수상작 추가 (Python 스크립트)

**Files:**
- Create: `scripts/add-award-books.py`
- Modify: `data/book-recommendations.json`

추가할 소스 (meta.sources):
- `changbi-award` — 창비어린이문학상 (창비상)
- `moonji-award` — 문학동네어린이문학상 (문학동네상)
- `bir-award` — 황금도깨비상 / 비룡소 (황금도깨비)
- `one-book` — 전국 원북원 캠페인 (원북원)

- [ ] **Step 1: 스크립트 작성**

```python
#!/usr/bin/env python3
"""문학상 소스 + 수상작 추가"""
import json, urllib.request, urllib.parse, time, os

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
    ("마당을 나온 암탉", "황선미", "초등", ["changbi-award"], "제1회 창비어린이문학상 수상. 알을 품고 싶은 암탉의 자유와 모성을 담은 감동 동화."),
    ("나쁜 어린이 표", "황선미", "초등 저학년", ["changbi-award"], "창비어린이문학상 수상작. 규칙과 자유, 어른과 아이의 시각 차이를 유머로 풀어냄."),
    ("씩씩한 찬이", "강무홍", "초등 저학년", ["changbi-award"], "창비어린이문학상 수상. 성장과 우정의 이야기를 따뜻하게 그린 동화."),
    ("우리 동네 미선이", "편해문", "초등 저학년", ["changbi-award"], "창비어린이문학상 수상. 도시 골목 아이들의 일상을 생생하게 담은 창작 동화."),
    ("빨간 열매", "권윤덕", "유아", ["changbi-award"], "창비어린이문학상 수상 그림책. 따뜻한 색채와 단순한 이야기로 나눔을 표현."),
    ("지렁이 울음소리", "박방희", "초등 저학년", ["changbi-award"], "창비어린이문학상 수상. 생명 존중과 자연 감수성을 키워주는 동시집."),
    ("달빛 마신 소년", "박현숙", "초등", ["changbi-award"], "창비어린이문학상 수상. 상상력 가득한 판타지와 현실의 경계를 넘나드는 이야기."),

    # 황금도깨비상 (비룡소)
    ("가방 들어 드릴까요?", "고정욱", "초등 저학년", ["bir-award"], "황금도깨비상 수상. 장애를 가진 아저씨와 아이의 우정, 배려를 배우는 동화."),
    ("내 이름은 망고", "한윤섭", "초등 저학년", ["bir-award"], "황금도깨비상 수상. 입양된 아이의 정체성 찾기를 따뜻하게 그린 작품."),
    ("고양이 학교", "김진경", "초등", ["bir-award"], "황금도깨비상 수상. 고양이 왕국의 신비로운 세계를 담은 판타지 동화."),
    ("어느 날 내가 죽었습니다", "이경혜", "초등 고학년", ["bir-award"], "황금도깨비상 수상. 죽음과 삶, 가족의 의미를 아이들 눈높이에서 다룬 동화."),
    ("완두", "김유", "유아", ["bir-award"], "황금도깨비상 그림책 수상. 작은 완두콩의 성장을 통해 희망과 꿈을 이야기."),
    ("삼 남매가 돌아왔다", "임지형", "초등 저학년", ["bir-award"], "황금도깨비상 수상. 개성 강한 세 아이들의 유쾌하고 따뜻한 가족 이야기."),

    # 문학동네어린이문학상
    ("꽃들에게 희망을", "트리나 폴러스", "초등", ["moonji-award"], "문학동네어린이문학상 추천. 변화와 성장에 대한 아름다운 우화."),
    ("연어", "안도현", "초등 고학년", ["moonji-award"], "문학동네어린이문학상 추천. 회귀하는 연어를 통해 삶의 의미를 성찰하는 동화시."),
    ("아무도 모를 거야, 내가 운 것을", "임지형", "초등 고학년", ["moonji-award"], "문학동네어린이문학상 수상. 외로움과 성장을 섬세하게 그린 청소년 소설."),
    ("오늘부터 출근합니다", "박현숙", "초등", ["moonji-award"], "문학동네어린이문학상 수상. 어른 세계의 일을 엿보는 아이들의 시선이 유쾌한 동화."),
    ("천 개의 파랑", "천선란", "초등 고학년", ["moonji-award"], "문학동네어린이문학상 수상. 로봇과 인간의 감정을 섬세하게 그린 SF 동화."),
    ("우리들의 스캔들", "고수산나", "초등 고학년", ["moonji-award"], "문학동네어린이문학상 수상. 또래 관계와 사회적 압박을 현실감 있게 담은 작품."),

    # 원북원
    ("아몬드", "손원평", "초등 고학년", ["one-book"], "전국 원북원 선정. 감정을 이해 못하는 소년을 통해 공감과 연대를 이야기."),
    ("완득이", "김려령", "초등 고학년", ["one-book"], "전국 원북원 선정. 다문화 가정 소년의 성장을 유쾌하게 담은 소설."),
    ("82년생 김지영", "조남주", "초등 고학년", ["one-book"], "부산원북원 선정. 한 여성의 삶을 통해 우리 사회를 돌아보는 소설."),
    ("채식주의자", "한강", "초등 고학년", ["one-book"], "광주원북원 선정. 한강 작가 노벨문학상 수상으로 주목받는 대표작."),
    ("소년이 온다", "한강", "초등 고학년", ["one-book"], "서울원북원 선정. 5·18 광주민주화운동을 다룬 역사 소설."),
    ("우리가 빛의 속도로 갈 수 없다면", "김초엽", "초등 고학년", ["one-book"], "원북원 선정. 미래 세계에서 사람들의 연결과 고독을 그린 SF 소설집."),
    ("파친코", "이민진", "초등 고학년", ["one-book"], "원북원 선정. 재일 조선인 가족의 4대에 걸친 역사 대하소설."),
    ("나미야 잡화점의 기적", "히가시노 게이고", "초등 고학년", ["one-book"], "대구원북원 선정. 시간을 초월한 편지를 통해 사람들이 연결되는 따뜻한 이야기."),
]

def fetch_isbn(title, author_hint):
    q = urllib.parse.quote(title)
    url = f"{WORKER}/search?query={q}&maxResults=3&target=book"
    try:
        with urllib.request.urlopen(url, timeout=8) as r:
            items = json.loads(r.read())
        for item in (items if isinstance(items, list) else []):
            t = item.get("title","")
            a = item.get("author","") + item.get("authors","")
            if title[:4] in t and (not author_hint or any(h in a for h in author_hint.split())):
                return item.get("isbn13") or item.get("isbn") or ""
        return items[0].get("isbn13","") if items else ""
    except Exception as e:
        print(f"  lookup 실패 ({title}): {e}")
        return ""

def main():
    d = json.load(open(PATH, encoding="utf-8"))

    # 1. 소스 추가
    existing_ids = {s["id"] for s in d["meta"]["sources"]}
    for src in NEW_SOURCES:
        if src["id"] not in existing_ids:
            d["meta"]["sources"].append(src)
            print(f"소스 추가: {src['id']}")

    # 2. 책 추가
    added = 0
    for title, author, age, lists, why in BOOKS:
        print(f"처리: {title}...", end=" ", flush=True)
        isbn = fetch_isbn(title, author)
        if not isbn:
            print("ISBN 없음 — 건너뜀")
            continue
        isbn = str(isbn).replace("-","")
        if isbn in d["books"]:
            # 기존 책에 소스만 추가
            existing_lists = set(d["books"][isbn].get("lists",[]))
            new_lists = existing_lists | set(lists)
            if new_lists != existing_lists:
                d["books"][isbn]["lists"] = sorted(new_lists)
                print(f"소스 추가 ({isbn})")
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
            print(f"추가 ({isbn})")
            added += 1
        time.sleep(0.3)

    json.dump(d, open(PATH,"w",encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\n완료: {added}권 신규 추가, 총 {len(d['books'])}권")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 실행**

```powershell
cd "C:\Users\Admin\iCloudDrive\Developments\book-tracker"
python scripts/add-award-books.py
```

- [ ] **Step 3: 결과 확인 — 새 소스 4개 추가됐는지**

```powershell
python -c "import json; d=json.load(open('data/book-recommendations.json',encoding='utf-8')); [print(s['id'], s['badge']['text']) for s in d['meta']['sources']]"
```

- [ ] **Step 4: 커밋**

```powershell
git add scripts/add-award-books.py data/book-recommendations.json
git commit -m "data: 창비상/황금도깨비/문학동네상/원북원 수상작 추가"
```

---

## Task 3: recommendations.js — 학년 목록 + 필터 UI 가로스크롤

**Files:**
- Modify: `js/recommendations.js`

변경 사항:
1. grades 배열: 저학년(1-3) / 고학년(4-6) 2단계로 + 초등(공통) 추가
2. 출처 칩 컨테이너: `flex-wrap: wrap` → `overflow-x: auto; white-space: nowrap; flex-wrap: nowrap`
3. 장르 칩도 동일하게 가로스크롤

- [ ] **Step 1: grades 배열 수정** (`js/recommendations.js` line 53–58)

현재:
```javascript
const grades = [
  { id: '유아', icon: '🐣', name: '유아' },
  { id: '초등 저학년', icon: '📖', name: '초등 저학년 (1-2학년)' },
  { id: '초등 중학년', icon: '📚', name: '초등 중학년 (3-4학년)' },
  { id: '초등 고학년', icon: '📕', name: '초등 고학년 (5-6학년)' },
];
```

변경 후:
```javascript
const grades = [
  { id: '유아',        icon: '🐣', name: '유아'               },
  { id: '초등 저학년', icon: '📖', name: '초등 저학년 (1-3학년)' },
  { id: '초등 고학년', icon: '📕', name: '초등 고학년 (4-6학년)' },
  { id: '초등',        icon: '📚', name: '초등 (공통)'          },
];
```

- [ ] **Step 2: 출처 칩 컨테이너 가로스크롤 적용**

`js/recommendations.js`에서 소스 칩 컨테이너 부분 (line ~116–121):

현재:
```javascript
${sourceChips ? `
<!-- 출처(추천 기관) 필터 -->
<div style="margin-bottom:8px;display:flex;flex-wrap:wrap;align-items:center">
  <span style="font-size:11px;color:#999;margin-right:6px;letter-spacing:0.04em">출처</span>
  ${sourceChips}
</div>` : ''}
```

변경 후:
```javascript
${sourceChips ? `
<!-- 출처(추천 기관) 필터 -->
<div style="margin-bottom:8px">
  <span style="font-size:11px;color:#999;letter-spacing:0.04em;display:block;margin-bottom:4px">출처</span>
  <div style="display:flex;overflow-x:auto;white-space:nowrap;gap:4px;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none">
    ${sourceChips}
  </div>
</div>` : ''}
```

- [ ] **Step 3: 장르 칩 컨테이너도 동일하게 적용**

현재 (line ~122–127):
```javascript
<!-- 장르 필터 -->
<div style="margin-bottom:16px;display:flex;flex-wrap:wrap;align-items:center">
  <span style="font-size:11px;color:#999;margin-right:6px;letter-spacing:0.04em">장르</span>
  ${genreChips}
</div>
```

변경 후:
```javascript
<!-- 장르 필터 -->
<div style="margin-bottom:16px">
  <span style="font-size:11px;color:#999;letter-spacing:0.04em;display:block;margin-bottom:4px">장르</span>
  <div style="display:flex;overflow-x:auto;white-space:nowrap;gap:4px;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none">
    ${genreChips}
  </div>
</div>
```

- [ ] **Step 4: 칩 버튼 style에서 `margin:4px` 제거 (gap으로 대체)**

`genreChips`와 `sourceChips` 생성 시 inline style에서 `margin:4px;` 제거 — gap이 대신함.

genreChips (line ~80–82):
```javascript
// 현재
`<button class="genre-chip ..." style="padding:6px 12px;margin:4px;border:...">`
// 변경
`<button class="genre-chip ..." style="padding:6px 12px;border:...;flex-shrink:0">`
```

sourceChips (line ~91, ~94):
```javascript
// 현재 allChip
style="padding:6px 12px;margin:4px;border:..."
// 변경
style="padding:6px 12px;border:...;flex-shrink:0"

// 현재 items
style="padding:6px 12px;margin:4px;border:..."
// 변경
style="padding:6px 12px;border:...;flex-shrink:0"
```

- [ ] **Step 5: 커밋**

```powershell
git add js/recommendations.js
git commit -m "ui: 필터 칩 가로스크롤 + 초등 학년 2단계로 정리"
```

---

## Task 4: storage.js — status 필드 추가

**Files:**
- Modify: `js/storage.js`

`status` 값: `null` (기본, 읽음) | `'want'` (읽을 책) | `'reading'` (읽는 중)

- [ ] **Step 1: normalizeBook에 status 필드 추가** (`js/storage.js` line 156–177)

현재 normalizeBook 반환 객체에 추가:
```javascript
function normalizeBook(b) {
  return {
    id:        b.id,
    isbn:      String(b.isbn || ''),
    title:     b.title || '',
    authors:   Array.isArray(b.authors) ? b.authors : (b.authors ? [b.authors] : []),
    publisher: b.publisher || '',
    thumbnail: b.thumbnail || '',
    contents:  b.contents || '',
    category:  b.category || '',
    language:  b.language || 'ko',
    rating:    Math.max(0, Math.min(5, Number(b.rating) || 0)),
    review:    b.review || '',
    readDate:  b.readDate || '',
    vocab:     Array.isArray(b.vocab) ? b.vocab : [],
    folders:   Array.isArray(b.folders) ? b.folders : [],
    ar:        b.ar != null ? Number(b.ar) : null,
    lexile:    b.lexile || null,
    status:    ['want', 'reading'].includes(b.status) ? b.status : null,  // ← 추가
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}
```

- [ ] **Step 2: Storage 공개 API에 getBooksByStatus 추가** (파일 맨 아래 window.Storage 객체에 추가)

```javascript
// 기존 window.Storage = { ... } 객체에 추가:
getBooksByStatus(status) {
  if (!status) return getAllBooks().filter(b => !b.status);
  return getAllBooks().filter(b => b.status === status);
},
```

- [ ] **Step 3: 커밋**

```powershell
git add js/storage.js
git commit -m "feat: Book status 필드 추가 (want/reading/null)"
```

---

## Task 5: book-preview.js — 저장 버튼 상태 선택

**Files:**
- Modify: `js/book-preview.js`

recommend 모드에서 "＋ 내 서재에 기록" 단일 버튼 → "읽을 책으로 추가" / "읽는 중으로 추가" / "읽었어요" 3개 버튼으로 변경.

- [ ] **Step 1: primaryBtn 생성 로직 수정** (`js/book-preview.js` line 249–256)

현재:
```javascript
} else {
  primaryBtn = `<button type="button" class="btn btn-primary" id="previewSaveBtn">＋ 내 서재에 기록</button>`;
}
```

변경 후:
```javascript
} else {
  primaryBtn = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <button type="button" class="btn btn-primary" id="previewSaveBtn" data-status="null" style="background:#4A90E2">
        ✅ 읽었어요 — 서재에 기록
      </button>
      <div style="display:flex;gap:8px">
        <button type="button" class="btn btn-secondary" id="previewSaveWantBtn" data-status="want"
          style="flex:1;background:#fff;border:1.5px solid #FF6B6B;color:#FF6B6B;font-weight:600">
          📌 읽을 책으로 저장
        </button>
        <button type="button" class="btn btn-secondary" id="previewSaveReadingBtn" data-status="reading"
          style="flex:1;background:#fff;border:1.5px solid #f39c12;color:#f39c12;font-weight:600">
          📖 읽는 중으로 저장
        </button>
      </div>
    </div>`;
}
```

- [ ] **Step 2: wireActions에서 새 버튼 핸들러 추가** (`js/book-preview.js` line 353–374)

```javascript
// wireActions 함수 내 recommend mode 섹션에 추가:
function saveWithStatus(status) {
  const existing = Storage.getBookByIsbn ? Storage.getBookByIsbn(book.isbn) : null;
  if (existing) {
    Storage.updateBook(existing.id, { status });
    toast(status === 'want' ? '읽을 책으로 저장됨' : status === 'reading' ? '읽는 중으로 저장됨' : '서재에 기록됨');
    setTimeout(() => location.href = `detail.html?id=${encodeURIComponent(existing.id)}`, 600);
    return;
  }
  const saved = Storage.saveBook({
    isbn:      book.isbn,
    title:     book.title,
    authors:   book.authors || (book.author ? [book.author] : []),
    publisher: book.publisher,
    thumbnail: book.thumbnail,
    contents:  book.contents || '',
    language:  book.language || 'ko',
    status:    status === 'null' ? null : status,
    categoryId:   book.categoryId   || (window.API && API.extractCategoryId ? API.extractCategoryId(detail || {}) : undefined),
    categoryName: book.categoryName || (detail && detail.categoryName),
  });
  const label = status === 'want' ? '읽을 책으로 저장됨' : status === 'reading' ? '읽는 중으로 저장됨' : '서재에 기록됨';
  toast(label);
  setTimeout(() => location.href = `detail.html?id=${encodeURIComponent(saved.id)}`, 600);
}

// 기존 saveBtn 연결 + 새 버튼 연결
const saveBtn = document.getElementById('previewSaveBtn');
if (saveBtn) saveBtn.addEventListener('click', () => saveWithStatus('null'));

const saveWantBtn = document.getElementById('previewSaveWantBtn');
if (saveWantBtn) saveWantBtn.addEventListener('click', () => saveWithStatus('want'));

const saveReadingBtn = document.getElementById('previewSaveReadingBtn');
if (saveReadingBtn) saveReadingBtn.addEventListener('click', () => saveWithStatus('reading'));
```

- [ ] **Step 3: 기존 saveBtn 단독 핸들러 삭제** (중복 방지)

`js/book-preview.js` 내 기존 단독 saveBtn addEventListener 블록 (line ~354–373) 제거하고 위 saveWithStatus 로직으로 통합.

- [ ] **Step 4: 커밋**

```powershell
git add js/book-preview.js
git commit -m "ui: 추천 미리보기 — 읽을책/읽는중/읽었어요 저장 버튼"
```

---

## Task 6: index.js — 상태 배지 + 상태 필터

**Files:**
- Modify: `js/index.js`

변경 사항:
1. `renderCard`에 상태 배지 추가 (읽을 책 / 읽는 중)
2. 폴더 칩 바 위에 상태 필터 탭 추가 (전체 | 읽을 책 | 읽는 중 | 읽음)

- [ ] **Step 1: 상태 배지 상수 추가** (파일 상단 변수 선언부)

```javascript
const STATUS_BADGE = {
  want:    { label: '📌 읽을 책', bg: '#FF6B6B', fg: '#fff' },
  reading: { label: '📖 읽는 중', bg: '#f39c12', fg: '#fff' },
};
```

- [ ] **Step 2: renderCard에 상태 배지 삽입** (`js/index.js` line 427–468)

기존 `return` 문 직전 starsHtml 선언 아래에:
```javascript
const statusInfo = STATUS_BADGE[book.status];
const statusHtml = statusInfo
  ? `<div style="margin-top:5px"><span style="background:${statusInfo.bg};color:${statusInfo.fg};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${statusInfo.label}</span></div>`
  : '';
```

그리고 return 문 안에서 `${starsHtml}` 바로 위에 `${statusHtml}` 삽입:
```javascript
return `
  <article class="book-card" data-id="${escapeAttr(book.id)}" draggable="true">
    <div class="book-cover-wrap">${cover}</div>
    <h3 class="book-card-title">${escapeHtml(book.title)}</h3>
    <p class="book-card-author">${escapeHtml(author)}</p>
    ${statusHtml}
    ${starsHtml}
    ${badgesHtml}
  </article>
`;
```

- [ ] **Step 3: 상태 필터 변수 + renderBooks 수정** (파일 상단)

```javascript
let currentStatus = 'all'; // 'all' | 'want' | 'reading' | 'read'
```

`renderBooks` 내 books 필터링 로직에 상태 필터 추가 (librarySearchQuery 필터 직후):
```javascript
if (currentStatus !== 'all') {
  if (currentStatus === 'read') {
    books = books.filter(b => !b.status);
  } else {
    books = books.filter(b => b.status === currentStatus);
  }
}
```

- [ ] **Step 4: 상태 필터 탭 HTML 추가** — `index.html`에서 folderBar 위에 상태 탭 div 추가, `renderStatusTabs` 함수 작성

`js/index.js`에 renderStatusTabs 함수 추가:
```javascript
function renderStatusTabs() {
  const all = Storage.getAllBooks();
  const counts = {
    all:     all.length,
    want:    all.filter(b => b.status === 'want').length,
    reading: all.filter(b => b.status === 'reading').length,
    read:    all.filter(b => !b.status && b.readDate).length,
  };

  const tabs = [
    { key: 'all',     label: '전체',    count: counts.all     },
    { key: 'reading', label: '읽는 중', count: counts.reading },
    { key: 'want',    label: '읽을 책', count: counts.want    },
    { key: 'read',    label: '읽은 책', count: counts.read    },
  ];

  const bar = document.getElementById('statusTabBar');
  if (!bar) return;

  bar.innerHTML = tabs.map(t => {
    const active = currentStatus === t.key;
    return `<button class="status-tab ${active ? 'active' : ''}" data-status="${t.key}"
      style="padding:6px 14px;border:none;border-radius:16px;font-size:13px;cursor:pointer;
             background:${active ? '#333' : '#f0f0f0'};color:${active ? '#fff' : '#666'};
             font-weight:${active ? '700' : '400'}">
      ${t.label}${t.count > 0 ? ` <sup>${t.count}</sup>` : ''}
    </button>`;
  }).join('');

  bar.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentStatus = btn.dataset.status;
      renderStatusTabs();
      renderBooks();
    });
  });
}
```

- [ ] **Step 5: index.html에 statusTabBar div 추가**

`index.html`에서 `folderBar` 위에:
```html
<div id="statusTabBar" style="display:flex;gap:6px;padding:8px 16px 4px;overflow-x:auto;white-space:nowrap;scrollbar-width:none"></div>
```

- [ ] **Step 6: renderStatusTabs를 기존 렌더 함수들과 함께 호출**

`renderBooks()` 호출 위치마다 `renderStatusTabs()` 도 함께 호출. 초기 로드 시 DOMContentLoaded 핸들러에서도 추가.

- [ ] **Step 7: 커밋**

```powershell
git add js/index.js index.html
git commit -m "ui: 내 서재 — 읽기 상태 배지 + 상태 필터 탭"
```

---

## Task 7: detail.js — 상태 편집 UI

**Files:**
- Modify: `js/detail.js`
- Modify: `detail.html`

- [ ] **Step 1: detail.html에 status picker HTML 추가**

`detail.html`에서 rating 섹션 위 (또는 아래)에:
```html
<div class="form-section" id="statusSection">
  <label class="form-label">읽기 상태</label>
  <div id="statusPicker" style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="status-pick-btn" data-status="null"    style="padding:8px 16px;border-radius:20px;border:1.5px solid #ddd;background:#fff;cursor:pointer;font-size:13px">✅ 읽었어요</button>
    <button class="status-pick-btn" data-status="reading" style="padding:8px 16px;border-radius:20px;border:1.5px solid #ddd;background:#fff;cursor:pointer;font-size:13px">📖 읽는 중</button>
    <button class="status-pick-btn" data-status="want"    style="padding:8px 16px;border-radius:20px;border:1.5px solid #ddd;background:#fff;cursor:pointer;font-size:13px">📌 읽을 책</button>
  </div>
</div>
```

- [ ] **Step 2: detail.js에 renderStatus / wireStatus 함수 추가**

```javascript
function renderStatus() {
  const current = book.status || null;
  const COLORS = { null: '#4A90E2', reading: '#f39c12', want: '#FF6B6B' };
  document.querySelectorAll('.status-pick-btn').forEach(btn => {
    const v = btn.dataset.status === 'null' ? null : btn.dataset.status;
    const active = v === current;
    btn.style.background = active ? COLORS[btn.dataset.status] : '#fff';
    btn.style.color = active ? '#fff' : '#333';
    btn.style.borderColor = active ? COLORS[btn.dataset.status] : '#ddd';
    btn.style.fontWeight = active ? '700' : '400';
  });
}

function wireStatus() {
  document.querySelectorAll('.status-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newStatus = btn.dataset.status === 'null' ? null : btn.dataset.status;
      book = Storage.updateBook(book.id, { status: newStatus });
      renderStatus();
    });
  });
}
```

- [ ] **Step 3: loadBook에서 renderStatus, wireStatus 호출**

`loadBook` 함수 내 기존 `renderHero()` ~ `wireActions()` 호출 블록에 추가:
```javascript
renderStatus();
wireStatus();
```

- [ ] **Step 4: 커밋**

```powershell
git add js/detail.js detail.html
git commit -m "ui: 책 상세 — 읽기 상태 편집 (읽었어요/읽는중/읽을책)"
```

---

## 최종 확인

- [ ] `python scripts/migrate-grades.py` — 학년 분포 정상 확인
- [ ] `python scripts/add-award-books.py` — 4개 소스, 수상작 추가 확인
- [ ] 브라우저에서 `recommendations.html` 열어 저학년(1-3)/고학년(4-6) 섹션 확인
- [ ] 출처 칩, 장르 칩 가로스크롤 동작 확인
- [ ] 추천 카드 클릭 → 미리보기 → 3개 저장 버튼 확인
- [ ] 저장 후 `index.html` → 상태 배지 표시 확인
- [ ] `index.html` 상태 탭 필터 동작 확인
- [ ] `detail.html` 상태 편집 버튼 동작 확인

```powershell
git log --oneline -8
```
