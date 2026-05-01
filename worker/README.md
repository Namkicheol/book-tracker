# Aladin Proxy Worker

알라딘 OpenAPI를 클라이언트에 노출하지 않고 호출하기 위한 Cloudflare Worker.
TTBKey는 Worker secret으로 저장되어 GitHub Pages 정적 JS에는 들어가지 않습니다.

## 사전 준비

### 1. 알라딘 TTBKey 발급
1. https://www.aladin.co.kr/ttb/wblog_manage.aspx 접속 (알라딘 계정 필요)
2. **블로그/사이트 등록** → 사이트 주소 `https://namkicheol.github.io/book-tracker/`
3. 등록 완료 후 발급되는 `ttbKEYxxxxxxxxxxxx` 형식 키 복사
4. 무료 쿼터: **5,000 calls/day**

### 2. Cloudflare 계정
- https://dash.cloudflare.com/sign-up — 신용카드 없이 가입 가능
- Workers 무료 플랜: 100,000 req/day

### 3. wrangler CLI
```bash
npm install -g wrangler
wrangler login   # 브라우저 열려 OAuth 인증
```

## 배포

```bash
cd worker
wrangler deploy
```

처음 배포하면 다음과 같이 URL이 출력됩니다:
```
Published book-tracker-aladin (X.XX sec)
  https://book-tracker-aladin.<your-subdomain>.workers.dev
```
이 URL을 복사해두세요. 클라이언트 `js/config.js`의 `WORKER_URL`에 넣습니다.

## TTBKey 등록 (필수)

```bash
wrangler secret put ALADIN_TTBKEY
# 프롬프트에서 ttbKEY... 붙여넣고 Enter
```

확인:
```bash
curl "https://book-tracker-aladin.<your-subdomain>.workers.dev/aladin/lookup?ItemId=9788932473901&ItemIdType=ISBN13&OptResult=ratingInfo,similarBooks,categoryIdList"
```

정상이면 알라딘 책 정보 JSON이 돌아옵니다.

## 운영

- **로그**: `wrangler tail` — 실시간 요청 로그
- **재배포**: `wrangler deploy` (코드 변경 시)
- **TTBKey 갱신**: `wrangler secret put ALADIN_TTBKEY`
- **캐시**: 응답은 6시간 edge cache. 즉시 무효화하려면 응답 헤더 `X-Cache: HIT/MISS` 확인

## 허용 도메인 변경

`aladin-proxy.js` 상단의 `ALLOWED_ORIGINS` 배열에 추가/제거 후 `wrangler deploy`.

## 비용

- Cloudflare Workers 무료 플랜: 100k req/day
- 알라딘 OpenAPI: 5k req/day
- 두 quota 모두 개인 사용 수준에선 충분
