// 참고용 — 실제 설정은 config.js 사용
// (config.js는 도메인 제한 가정 하에 git에 커밋됨)

var KAKAO_API_KEY = 'YOUR_KAKAO_REST_API_KEY_HERE';

// Cloudflare Worker (worker/aladin-proxy.js) 배포 후 받은 URL
// 배포 가이드: worker/README.md
// 미설정 시 추천이 카카오 폴백으로 동작 (품질 낮음)
var WORKER_URL = 'https://book-tracker-aladin.<your-subdomain>.workers.dev';
