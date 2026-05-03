# 📖 도서관정보나루 API 완벽 가이드

## 📌 개요

**도서관정보나루**(국립중앙도서관 운영)는 전국 공공도서관의 장서 및 대출 정보를 제공하는 Open API 서비스입니다.

- **운영**: 국립중앙도서관
- **공식 사이트**: https://www.data4library.kr/
- **API 매뉴얼**: https://www.data4library.kr/downloadApiManual
- **비용**: 무료
- **일일 호출 제한**: 1,000건 (무료 키 기준)

---

## 🔑 인증키 발급 (Step-by-Step)

### 1단계: 회원가입
1. https://www.data4library.kr/ 접속
2. 우측 상단 **"회원가입"** 클릭
3. 이메일 인증 완료

### 2단계: 인증키 신청
1. 로그인 후 **"데이터 활용"** 메뉴 클릭
2. **"Open API 활용방법"** 선택
3. **"인증키 신청/관리"** 페이지로 이동
4. **"인증키 신청"** 버튼 클릭
5. 신청 정보 입력:
   - 사용 목적: "개인 프로젝트 - 독서 관리 앱"
   - 예상 트래픽: "일 100건 미만"

### 3단계: 승인 대기
- ⏱️ **승인 시간**: 약 **1영업일** (빠르면 당일)
- 📧 승인 완료 시 이메일 알림

### 4단계: 키 확인
- "마이페이지" → "인증키 관리"에서 발급된 키 확인
- 형식: 32자리 영숫자 (예: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

---

## 🛠️ 제공 API 목록

### 1. **도서관 검색** (`libSrch`)
전국 공공도서관 정보 조회
```
http://data4library.kr/api/libSrch?authKey=[키]&region=11&pageNo=1&pageSize=10
```

### 2. **인기대출도서** (`loanItemSrch`) ⭐ 핵심!
- 기간별/연령별/지역별 인기 대출 도서
- ISBN으로 소장 도서관 검색
```
http://data4library.kr/api/loanItemSrch?authKey=[키]&startDt=2024-01-01&endDt=2024-12-31&age=10&region=11
```

### 3. **도서관별 장서/대출 정보** (`usageAnalysisList`)
특정 도서관의 장서 및 이용 통계
```
http://data4library.kr/api/usageAnalysisList?authKey=[키]&libCode=111001
```

### 4. **도서 소장/대출 가능 여부** (`bookExist`) ⭐ 핵심!
특정 도서관의 특정 책 대출 가능 여부
```
http://data4library.kr/api/bookExist?authKey=[키]&libCode=111001&isbn13=9788949123493
```

### 5. **추천도서** (`recommandList`)
사서 추천도서 목록
```
http://data4library.kr/api/recommandList?authKey=[키]&type=1
```

---

## 📘 주요 API 상세 설명

### ⭐ `loanItemSrch` - 인기대출도서 / 소장도서관 검색

#### 🎯 맘스북스 활용: ISBN으로 소장 도서관 찾기

**요청 URL:**
```
http://data4library.kr/api/loanItemSrch?authKey=[키]&isbn13=9788949123493&format=json
```

**필수 파라미터:**
- `authKey` (필수): 인증키
- `format` (선택): `json` 또는 `xml` (기본 xml)

**선택 파라미터:**
- `isbn13`: 책 ISBN (13자리)
- `startDt`, `endDt`: 조회 기간 (YYYY-MM-DD)
- `gender`: 성별 (`0`=전체, `1`=남성, `2`=여성)
- `age` 또는 `from_age`, `to_age`: 연령 (예: `10` 또는 `6`~`10`)
- `region`: 지역 코드 (`;`로 구분하여 다중 선택 가능)
  - `11`: 서울
  - `21`: 부산
  - `22`: 대구
  - `23`: 인천
  - `24`: 광주
  - `25`: 대전
  - `26`: 울산
  - `31`: 경기
  - `32`: 강원
  - _(기타 시도 코드 참고)_
- `dtl_region`: 시군구 코드
- `addCode`: ISBN 부가기호
- `kdc`: KDC 분류 코드
- `pageNo`, `pageSize`: 페이지네이션 (기본 1, 10)

**응답 예시 (JSON):**
```json
{
  "response": {
    "request": {
      "isbn13": "9788949123493",
      "pageNo": "1",
      "pageSize": "10"
    },
    "resultNum": 2,
    "docs": [
      {
        "doc": {
          "bookname": "순례 주택",
          "authors": "유은실",
          "publisher": "비룡소",
          "publication_year": "2024",
          "isbn13": "9788949123493",
          "vol": "",
          "class_no": "813.7",
          "class_nm": "소설",
          "loan_count": "152",
          "libCode": "111001",
          "libName": "강남구립도서관"
        }
      },
      {
        "doc": {
          "bookname": "순례 주택",
          "authors": "유은실",
          "publisher": "비룡소",
          "publication_year": "2024",
          "isbn13": "9788949123493",
          "libCode": "111015",
          "libName": "서초구립도서관",
          "loan_count": "87"
        }
      }
    ]
  }
}
```

---

### ⭐ `bookExist` - 도서 소장 및 대출 가능 여부

#### 🎯 맘스북스 활용: "지금 빌릴 수 있나요?" 확인

**요청 URL:**
```
http://data4library.kr/api/bookExist?authKey=[키]&libCode=111001&isbn13=9788949123493&format=json
```

**필수 파라미터:**
- `authKey`: 인증키
- `libCode`: 도서관 코드 (loanItemSrch 결과의 libCode)
- `isbn13`: 책 ISBN

**응답 예시 (JSON):**
```json
{
  "response": {
    "result": {
      "hasBook": "Y",
      "loanAvailable": "Y",
      "libName": "강남구립도서관",
      "isbn13": "9788949123493",
      "loanCount": "3"
    }
  }
}
```

**응답 필드:**
- `hasBook`: 소장 여부 (`Y`/`N`)
- `loanAvailable`: 대출 가능 여부 (`Y`/`N`)
- `libName`: 도서관명
- `loanCount`: 소장 권수

---

## 💡 맘스북스 실전 활용 시나리오

### 시나리오 1: "이 책 우리 동네 도서관에 있나요?"

```javascript
// Step 1: ISBN으로 소장 도서관 검색
const libraries = await fetch(
  `http://data4library.kr/api/loanItemSrch?` +
  `authKey=${API_KEY}&isbn13=9788949123493&region=11&format=json`
).then(r => r.json());

console.log(libraries.response.docs);
// → [{ libName: "강남구립도서관", libCode: "111001", ... }, ...]

// Step 2: 각 도서관의 대출 가능 여부 확인
for (const lib of libraries.response.docs) {
  const availability = await fetch(
    `http://data4library.kr/api/bookExist?` +
    `authKey=${API_KEY}&libCode=${lib.doc.libCode}&isbn13=9788949123493&format=json`
  ).then(r => r.json());
  
  console.log(availability.response.result);
  // → { hasBook: "Y", loanAvailable: "Y", ... }
}
```

### 시나리오 2: "우리 아이 또래가 많이 읽는 책"

```javascript
// 초등 5학년 (만 10~11세) 인기 대출 도서
const popular = await fetch(
  `http://data4library.kr/api/loanItemSrch?` +
  `authKey=${API_KEY}&startDt=2025-01-01&endDt=2025-12-31&` +
  `from_age=10&to_age=11&region=11&pageSize=20&format=json`
).then(r => r.json());

console.log(popular.response.docs);
// → 초등 5학년이 가장 많이 빌린 책 TOP 20
```

---

## 🚨 주의사항 & 팁

### API 호출 제한
- **일일 1,000건** (무료 키)
- 초과 시 에러 응답: `{ error: "일일 트래픽 초과" }`

### 성능 최적화
1. **캐싱 필수**
   ```javascript
   // localStorage에 1시간 캐싱
   const cacheKey = `library_${isbn}_${region}`;
   const cached = localStorage.getItem(cacheKey);
   if (cached && Date.now() - cached.timestamp < 3600000) {
     return JSON.parse(cached.data);
   }
   ```

2. **배치 요청 금지**
   - 여러 ISBN을 한 번에 조회할 수 없음
   - 대신: 사용자가 클릭한 책만 조회 (on-demand)

3. **지역 필터링**
   - 전국 검색 대신 사용자 지역만 조회 (API 호출 절약)

### 에러 처리
```javascript
try {
  const res = await fetch(apiUrl);
  const data = await res.json();
  
  if (data.response.resultNum === 0) {
    return '소장 도서관 없음';
  }
  
  return data.response.docs;
} catch (error) {
  console.error('API 오류:', error);
  return '도서관 정보 조회 실패';
}
```

---

## 📊 지역 코드 전체 목록

| 코드 | 지역 |
|------|------|
| 11 | 서울특별시 |
| 21 | 부산광역시 |
| 22 | 대구광역시 |
| 23 | 인천광역시 |
| 24 | 광주광역시 |
| 25 | 대전광역시 |
| 26 | 울산광역시 |
| 31 | 경기도 |
| 32 | 강원특별자치도 |
| 33 | 충청북도 |
| 34 | 충청남도 |
| 35 | 전북특별자치도 |
| 36 | 전라남도 |
| 37 | 경상북도 |
| 38 | 경상남도 |
| 39 | 제주특별자치도 |
| 41 | 세종특별자치시 |

---

## 🎨 초등맘 친화 UI 문구

### 대출 가능
✅ **"지금 바로 빌릴 수 있어요!"**
- 강남구립도서관 (도보 15분)
- 📞 02-1234-5678
- 🕐 화~금 09:00~20:00

### 대출 중
⏳ **"지금은 다른 친구가 읽고 있어요"**
- 강남구립도서관 소장 (3권)
- 💡 예약하시면 반납 시 알려드려요

### 소장 없음
❌ **"우리 동네 도서관엔 없네요"**
- 📚 알라딘에서 구매하기
- 📝 도서관 희망도서 신청하기

---

## 🔗 참고 자료

- [도서관정보나루 공식 사이트](https://www.data4library.kr/)
- [Open API 활용방법](https://www.data4library.kr/apiUtilization)
- [API 매뉴얼 다운로드](https://www.data4library.kr/downloadApiManual)
- [국립중앙도서관 Open API 안내](https://www.nl.go.kr/NL/contents/N31101010000.do)

---

_API 키 받으시면 바로 테스트 가능합니다! 🚀_
