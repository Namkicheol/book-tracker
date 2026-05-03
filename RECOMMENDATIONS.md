# 📚 추천 도서 시스템

## 구현 완료 기능

### 1. 추천 목록 배지 표시
- 책 상세 페이지에서 자동으로 추천 목록 배지 표시
- 추천 책 미리보기 모달에 "WHY THIS BOOK" 섹션 강화
- **AI가 추천하는 것처럼** 자연스러운 UX

### 2. 수집된 추천 목록
현재 `data/book-recommendations.json`에 포함:
- **책따세 추천도서** (초등맘 최고 신뢰)
- **서울대 권장도서 100**
- **아침독서 추천도서**
- **학교도서관저널**
- **어린이도서연구회**
- **국립어린이청소년도서관 사서추천**

### 3. 현재 등록된 도서 수
**10권** - 책따세 2024~2025 추천작 샘플

---

## 더 많은 데이터 수집 방법

### A. 공식 다운로드 (추천)

1. **행복한아침독서 2025 엑셀**
   - URL: http://www.morningreading.org/
   - 907권 (어린이책 404권 포함)
   - ISBN 포함된 엑셀 파일 다운로드 가능

2. **학교도서관저널 추천도서목록**
   - URL: https://www.slj.co.kr/
   - 연간 400여 권 엑셀 다운로드

3. **국립어린이청소년도서관 API**
   - 공공데이터포털: https://www.data.go.kr/data/15104976/openapi.do
   - 무료 API 키 발급 → 자동 업데이트 가능

### B. 크롤링/수동 입력

1. **알라딘 추천 컬렉션**
   - 책따세: https://www.aladin.co.kr/m/mbrowse.aspx?CID=200316
   - 아침독서: CID 별도 존재
   - 알라딘 API 활용 가능

2. **교보문고 추천 도서**
   - 서울대 권장서: https://store.kyobobook.co.kr/recommend/1523/1752
   - 페이지 스크래핑

---

## 다음 단계

### 1. 대량 데이터 추가
```bash
# 1. 엑셀 파일 다운로드 후 JSON 변환
# 2. data/book-recommendations.json에 병합
```

### 2. 도서관 소장/대출 정보 (초등맘 핵심 니즈!)

**도서관정보나루 API**
- URL: https://www.data4library.kr/
- 키 발급: 무료, 회원가입 후 즉시 사용
- 기능:
  - `loanItemSrch`: ISBN으로 소장 도서관 검색
  - `bookExist`: 대출 가능 여부 조회

**구현 계획:**
```javascript
// js/library-api.js 신규 파일
async function findNearbyLibraries(isbn, lat, lng) {
  // 1. Geolocation API로 사용자 위치
  // 2. 도서관정보나루 API로 소장 도서관 검색
  // 3. 거리 계산 후 가까운 순 정렬
  // 4. 대출 가능 여부 표시
}
```

**UI 추가:**
- 미리보기 모달에 "📍 가까운 도서관에서 찾기" 버튼
- 팝업: "OO도서관 (1.2km) - **대출 가능** ✓"

### 3. 추천 이유 자동 생성 (GPT 활용)

```javascript
// 추천 목록 DB에 없는 책도 자동으로 "왜 이 책?" 생성
async function generateWhyThisBook(book) {
  const prompt = `
    초등학생 자녀를 둔 학부모 시각에서:
    - 책: ${book.title}
    - 저자: ${book.authors}
    - 분야: ${book.categoryName}
    
    이 책을 왜 읽어야 하는지, 어떤 면에서 좋은지 2-3문장으로.
  `;
  return await callGPT(prompt);
}
```

---

## JSON 데이터 구조

```json
{
  "meta": {
    "sources": [
      {
        "id": "chaektase",
        "name": "책따세 추천도서",
        "badge": { "text": "책따세", "color": "#8b3a3a" }
      }
    ]
  },
  "books": {
    "9788949123493": {
      "title": "순례 주택",
      "author": "유은실",
      "lists": ["chaektase"],
      "targetAge": "청소년",
      "why": "초등맘 시각의 추천 이유..."
    }
  }
}
```

---

## 사용 예시

사용자가 추천 책 카드를 클릭하면:

1. **배지 표시**: "책따세", "서울대 권장", "아침독서"
2. **WHY THIS BOOK**:
   ```
   📚 책따세  🎓 서울대 권장
   
   청소년기 자아 찾기와 성장의 과정을 섬세하게 그려낸 작품. 
   가족의 의미와 집의 본질에 대해 생각해볼 수 있어요.
   
   (알고리즘 추천 이유)
   같은 작가의 다른 작품입니다. 이 책이 마음에 들었다면 
   같은 작가의 다음 이야기도 어울릴 거예요.
   ```
3. **📍 가까운 도서관에서 찾기** 버튼 (향후)

---

## 빠른 시작

1. 로컬 서버 실행:
   ```bash
   cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Developments/book-tracker
   python3 -m http.server 8000
   ```

2. 브라우저: http://localhost:8000

3. 추천 책 클릭 → 배지 확인!
