/**
 * 카카오 책 검색 API 설정
 *
 * SECURITY — 이 파일은 git에 커밋됩니다.
 * 키 노출을 막기 위해 카카오 개발자센터에서 반드시 도메인 제한을 거세요:
 *
 *   카카오 개발자센터 → 내 애플리케이션 → 앱 설정 → 플랫폼
 *     → Web 플랫폼 등록
 *     → 사이트 도메인:
 *         http://localhost:8080
 *         https://namkicheol.github.io
 *
 * 도메인 화이트리스트가 설정되면 키가 노출되어도 다른 도메인에선 작동하지 않습니다.
 */

var KAKAO_API_KEY = '2d06d393fabebae4fab202af55a80379';

/**
 * Aladin OpenAPI proxy (Cloudflare Worker)
 *
 * worker/README.md 의 가이드대로 배포 후 URL을 여기에 넣으세요.
 * TTBKey는 Worker secret으로 보관되므로 클라이언트에 노출되지 않습니다.
 *
 * 비워두면 추천이 카카오 폴백으로 동작합니다 (품질 낮음).
 */
var WORKER_URL = 'https://book-tracker-aladin.obangti.workers.dev';

/**
 * 도서관정보나루 API 키
 *
 * 발급: https://www.data4library.kr/ (무료, 회원가입 후 즉시 발급)
 * 사용: 소장 도서관 검색, 대출 가능 여부 조회
 *
 * 🔑 API 키를 받아오신 후 아래에 입력하세요:
 */
var LIBRARY_API_KEY = '';  // ← 여기에 API 키 입력!
