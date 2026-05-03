# 📍 도서관 API 연동 가이드

## 1. API 키 발급 (5분)

### 도서관정보나루 회원가입
1. https://www.data4library.kr/ 접속
2. **회원가입** → 이메일 인증
3. **마이페이지** → **인증키 신청/관리**
4. **인증키 신청** 버튼 클릭
5. **즉시 발급** (승인 대기 없음!)

### API 키 복사
```
예시: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## 2. 프로젝트에 API 키 등록

### `js/config.js` 파일 수정
```javascript
var LIBRARY_API_KEY = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';  // ← 여기에 붙여넣기
```

---

## 3. 사용 예시

### A. 소장 도서관 검색
```javascript
// ISBN으로 소장 도서관 찾기
const libraries = await LibraryAPI.searchLibraries('9788949123493', {
  region: '서울',
  pageSize: 10
});

console.log(libraries);
// [
//   { libName: '강남구립도서관', address: '서울 강남구...', tel: '02-1234-5678', ... },
//   { libName: '서초구립도서관', ... }
// ]
```

### B. 대출 가능 여부 확인
```javascript
const availability = await LibraryAPI.checkAvailability(
  '9788949123493',
  'LIB12345'  // 도서관 코드
);

console.log(availability);
// {
//   available: true,
//   hasBook: true,
//   loanCount: 2,
//   libName: '강남구립도서관'
// }
```

### C. 가까운 도서관 찾기 (위치 기반)
```javascript
// 사용자 위치에서 5km 이내 도서관 검색
const nearby = await LibraryAPI.findNearbyLibraries('9788949123493', 5);

console.log(nearby);
// [
//   { libName: '강남구립도서관', distance: 1.2, available: true, ... },
//   { libName: '서초구립도서관', distance: 2.8, available: false, ... }
// ]
```

---

## 4. UI 통합 (예정)

### detail.html 추천 책 미리보기 모달에 추가

```html
<div class="preview-library">
  <button type="button" class="btn btn-secondary" id="findLibraryBtn">
    📍 가까운 도서관에서 찾기
  </button>
</div>

<!-- 도서관 목록 팝업 -->
<div class="library-list-modal" id="libraryModal">
  <h3>이 책을 소장한 가까운 도서관</h3>
  <ul id="libraryList">
    <li>
      <strong>강남구립도서관</strong>
      <span class="distance">1.2km</span>
      <span class="status available">대출 가능 ✓</span>
      <a href="tel:02-1234-5678">📞 02-1234-5678</a>
    </li>
  </ul>
</div>
```

### JavaScript 연동
```javascript
document.getElementById('findLibraryBtn').addEventListener('click', async () => {
  showToast('가까운 도서관 검색 중...');
  
  try {
    const libraries = await LibraryAPI.findNearbyLibraries(book.isbn, 5);
    
    if (libraries.length === 0) {
      showToast('주변 5km 이내에 소장 도서관이 없어요');
      return;
    }
    
    renderLibraryList(libraries);
    openLibraryModal();
    
  } catch (error) {
    if (error.message.includes('권한')) {
      showToast('위치 권한을 허용해주세요');
    } else {
      showToast('도서관 검색 실패. 다시 시도해주세요.');
    }
  }
});
```

---

## 5. API 명세

### 주요 API 엔드포인트

#### 도서 소장도서관 조회
```
GET https://www.data4library.kr/api/loanItemSrch

Parameters:
- authKey (required): 인증키
- isbn13 (required): ISBN (하이픈 제거)
- format: json
- region: 시도명 (서울, 경기, ...)
- dtl_region: 시군구명
- pageNo, pageSize
```

#### 도서관별 소장여부 및 대출가능여부 조회
```
GET https://www.data4library.kr/api/bookExist

Parameters:
- authKey (required)
- isbn13 (required)
- libCode (required): 도서관 코드
- format: json
```

---

## 6. 초등맘 맞춤 UX 아이디어

### 감성 카피
- ❌ "소장 도서관 2곳"
- ✅ "우리 동네에 2곳이나 있어요!"

- ❌ "대출 불가"
- ✅ "지금은 다른 친구가 읽고 있어요 📖"

### 추가 정보
- 도서관까지 도보 시간 (1.2km → 도보 15분)
- 예약 가능 여부
- 휴관일 알림
- "이 도서관, 아이들이 좋아해요 ⭐ (리뷰 3.2k)"

---

## 7. 주의사항

### API 제한
- **일일 호출 제한**: 1,000건/일 (무료 키 기준)
- 제한 초과 시: 에러 응답

### 성능 최적화
- 검색 결과 캐싱 (localStorage, 1시간)
- 디바운싱 (연속 클릭 방지)
- 로딩 인디케이터 필수

### 개인정보
- 위치 권한 요청 시 명확한 설명
- 위치 정보 저장 금지 (일회성 사용)

---

## 8. 테스트 시나리오

### Case 1: 정상 케이스
```
1. 책 미리보기 열기
2. "📍 가까운 도서관 찾기" 클릭
3. 위치 권한 허용
4. 2초 내 결과 표시
5. "강남구립도서관 (1.2km) - 대출 가능 ✓"
```

### Case 2: 위치 권한 거부
```
1. "가까운 도서관 찾기" 클릭
2. 위치 권한 거부
3. 토스트: "위치 권한을 허용해주세요"
4. (대안) "지역 직접 선택" 버튼 표시
```

### Case 3: 소장 도서관 없음
```
1. 검색 실행
2. 결과 0건
3. 메시지: "주변 5km 이내에 소장 도서관이 없어요"
4. (대안) "알라딘에서 구매하기" 링크 제공
```

---

_Ready to go! API 키만 받아오시면 바로 작동합니다 🚀_
