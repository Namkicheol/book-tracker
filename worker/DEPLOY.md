# 🚀 Worker 배포 가이드 (3분 완성)

## 1. Secret 등록

```bash
cd worker
wrangler secret put LIBRARY_API_KEY
# → [입력 프롬프트] 도서관정보나루에서 받은 키 붙여넣기
```

## 2. 배포

```bash
wrangler deploy
```

끝! 🎉

---

## 사용법

프론트엔드에서:

```javascript
// 소장 도서관 검색
const libs = await fetch(
  'https://book-tracker-aladin.obangti.workers.dev/library/search?isbn=9788949123493&region=11'
).then(r => r.json());

// 대출 가능 여부
const avail = await fetch(
  'https://book-tracker-aladin.obangti.workers.dev/library/available?isbn=9788949123493&libCode=111001'
).then(r => r.json());
```

**캐싱**: 1시간 (자동)
