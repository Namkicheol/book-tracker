# Cloudflare Pages 마이그레이션 체크리스트

상업적 이용을 위해 호스팅을 Vercel(무료 Hobby = 비상업 전용)에서 **Cloudflare Pages(무료 + 상업 이용 허용 + 무제한 대역폭)**로 옮기는 절차.

> 코드는 순수 static이고 `getRedirectTo()`가 `window.location.origin`을 동적으로 쓰므로,
> **하드코딩된 도메인이 없어** 거의 그대로 동작한다. 핵심은 새 도메인을 인증 허용목록에 넣는 것.

## 1) Cloudflare Pages 프로젝트 생성 (대시보드 — 사용자)
- Cloudflare 대시보드 → **Workers & Pages → Create → Pages → Connect to Git**
- GitHub `Namkicheol/book-tracker` 연결
- 빌드 설정:
  - **Framework preset**: None
  - **Build command**: (비움)
  - **Build output directory**: `/` (루트)
- 배포 후 도메인: `https://book-tracker-xxx.pages.dev` (또는 커스텀 도메인 연결)

## 2) Supabase Auth 허용목록 갱신 ← **필수 (안 하면 로그인 깨짐)**
[Supabase Dashboard](https://supabase.com/dashboard/project/fjmiimpidlwuzuvnsduh) → **Authentication → URL Configuration**
- **Site URL**: 새 Pages 도메인으로 변경(또는 커스텀 도메인)
- **Redirect URLs**: 새 도메인 추가 — 예) `https://<새도메인>/**` (와일드카드)
- 기존 Vercel 도메인은 병행 운영하려면 같이 남겨둬도 됨.

> 카카오/구글 provider의 redirect URI는 Supabase 콜백
> (`https://fjmiimpidlwuzuvnsduh.supabase.co/auth/v1/callback`)이라 **변경 불필요**.
> 최종적으로 앱으로 되돌아오는 주소만 Supabase 허용목록이 통제한다.

## 3) (선택) 커스텀 도메인
- Pages → Custom domains 에서 도메인 연결. 연결 시 위 2)의 Site URL/Redirect도 그 도메인으로.

## 4) repo 반영 (코드 — 완료)
- `_headers` 추가됨(캐시·보안 헤더). Vercel은 이 파일을 무시하므로 양쪽 안전.
- 옮긴 뒤 `AGENTS.md`의 Production URL 표기를 새 도메인으로 갱신.

## 참고: 어디서 Vercel 상업제한이 실제로 걸리나
- **앱스토어(Capacitor)·앱인토스**: 웹 자산이 앱에 번들 → 런타임에 Vercel이 안 서빙 → 상업제한 무관(개발/프리뷰는 Vercel Hobby 계속 사용 가능).
- **상업적 웹/PWA 서빙**: 이때 Vercel Hobby 제한이 걸림 → Cloudflare Pages로.

## 백엔드는 그대로
- Supabase(무료 상업 가능), Cloudflare Worker(알라딘 프록시, 이미 Cloudflare) 변경 없음.
