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
 * 도서관정보나루 API 키는 Cloudflare Worker secret(LIBRARY_API_KEY)으로만 관리합니다.
 * 브라우저 클라이언트에는 노출하지 않습니다.
 */

/**
 * Supabase 백엔드 (Auth · DB · Storage)
 *
 * anon key는 클라이언트 노출 안전 — 진짜 방어는 Supabase RLS(Row Level Security)에서.
 * service_role key는 절대 클라이언트·git에 두지 마세요 (관리자 전용).
 *
 * 비워두면 모든 Supabase 호출이 비활성화되고 앱은 localStorage 전용 모드로 동작합니다.
 */
var SUPABASE_URL = 'https://fjmiimpidlwuzuvnsduh.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbWlpbXBpZGx3dXp1dm5zZHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODgwNjIsImV4cCI6MjA5Mzk2NDA2Mn0.VPRGgbavB4w7SkH3jcOM9GTqXOPTJVRX9fPU_E-0w18';
