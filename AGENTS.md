# book-tracker — AGENTS.md (Codex)

> 이 파일이 이 레포의 canonical agent instruction이다. Codex는 작업 시작 시 이 파일을 우선 참고한다. Claude Code 진입 문서는 `CLAUDE.md`이고, 두 파일은 도구 framing만 다르고 섹션·순서·규칙은 동일하다.
> 새 규칙은 양쪽 모두 갱신한다.

## 프로젝트 개요

- 서비스명: 맘스북스 / book-tracker
- 형태: 프레임워크 없는 순수 HTML/CSS/JavaScript 모바일 우선 독서기록 웹앱
- 호스팅: Vercel 정적 사이트
- 책 검색: 카카오 API + 알라딘 API Cloudflare Worker 프록시
- 로그인/동기화: Supabase Auth + DB

주요 화면:

- `index.html`: 내 서재, 그리드/목록 토글, 검색
- `scan.html`: 바코드 스캔 + 책 검색
- `detail.html`: 책 상세, 별점, 한줄평, AR 사다리
- `recommendations.html`: 추천 도서, 출처별/연령별, 다중 선택 후 일괄 담기
- `stats.html`: 통계, 캘린더, 월간 리포트
- `share.html`: 랭킹, 공유 카드, 프로필 편집
- `settings.html`: 공개 범위, 다크모드 등

## 외부 리소스

### GitHub

- 저장소: `https://github.com/Namkicheol/book-tracker`
- 기본 브랜치: `main`
- GitHub 사용자: `Namkicheol`

### Vercel

- Production URL: `https://book-tracker-git-main-namkicheols-projects.vercel.app`
- `main` push는 production 배포, 다른 브랜치 push는 preview 배포
- 정적 사이트라 별도 빌드 명령은 없다.

### Cloudflare Worker

- Worker 이름: `book-tracker-aladin`
- Worker URL: `https://book-tracker-aladin.obangti.workers.dev`
- 코드: `worker/aladin-proxy.js`
- 설정: `worker/wrangler.toml`
- 배포: `cd worker && wrangler deploy`
- 알라딘 TTBKey는 Worker secret으로만 관리한다. 클라이언트나 지침 파일에 새로 노출하지 않는다.

### Supabase

- Project URL: `https://fjmiimpidlwuzuvnsduh.supabase.co`
- Project ref: `fjmiimpidlwuzuvnsduh`
- 클라이언트 설정: `js/config.js`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `js/config.js`는 환경별 로컬 설정 파일로 취급한다.
- 스키마/마이그레이션: `SUPABASE_SCHEMA.sql`, `migrations/*.sql`

### 카카오 / 알라딘 API

- 카카오 API 키는 `js/config.js`에서 사용한다.
- 알라딘 OpenAPI 호출은 반드시 Cloudflare Worker를 경유한다. TTBKey를 브라우저 코드에 넣지 않는다.

## 로컬 개발

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 연다.

- 별도 프레임워크나 번들러가 없다.
- `package.json`은 현재 앱 실행용 스크립트를 제공하지 않는다.
- `js/config.js`가 없거나 새 머신이면 `js/config.example.js`를 참고해 만든다.
- iCloud Drive 경로라 line-ending noise가 생길 수 있다. diff에서 의도하지 않은 CRLF/LF 변경을 조심한다.

## 코드 구조

- `css/`: 공통 스타일
- `js/config.js`: API 키와 환경 설정. 민감값 취급, 로컬 설정 우선
- `js/storage.js`: localStorage 기반 책/폴더/프로필 저장
- `js/supabase.js`: Supabase Auth 래퍼
- `js/sync.js`: localStorage와 Supabase 동기화
- `js/auth-ui.js`: 우상단 프로필 원 + 로그인 픽커
- `js/theme.js`: 다크모드
- `js/api.js`: 카카오/알라딘 Worker 호출
- `js/library-api.js`: 도서관정보나루 연동 스캐폴딩
- `js/recommendations.js`: 추천 페이지
- `js/detail.js`: 책 상세
- `js/stats.js`: 통계
- `js/share.js`: 공유/랭킹
- `data/`: 추천 큐레이션 JSON
- `migrations/`: Supabase SQL
- `worker/`: Cloudflare Worker

## 작업 원칙

- 사용자 요청 범위만 해결한다. 추측성 기능, 과한 설정 가능성, 불필요한 추상화는 넣지 않는다.
- 변경 전 `git status`로 사용자 WIP를 확인한다.
- 다수 파일이 이미 modified면 학교/집 iCloud 동기화 WIP일 수 있다. 본 세션 변경만 골라 작업하고, 관련 없는 변경은 건드리지 않는다.
- `git add -A`를 쓰지 않는다. 커밋 요청 시 의도한 파일만 명시적으로 stage한다.
- 인접 코드 포맷 정리, 죽은 코드 삭제, 대규모 리팩터링은 요청 없이는 하지 않는다.
- 본인이 만든 미사용 import/변수/함수는 제거한다.
- 작은 HTML/JS 수정은 브라우저 또는 정적 서버로 직접 확인한다.

## 캐시 버스터 규칙

HTML에서 JS/CSS 참조를 바꿀 때는 다음 형식을 유지한다.

```html
<script src="js/foo.js?v=YYYYMMDDa"></script>
```

- 같은 날짜에 두 번째 변경이면 `a -> b -> c`처럼 letter를 올린다.
- 신규 파일도 같은 포맷을 사용한다.

## 배포 / 커밋 워크플로

사용자가 "커밋", "배포", "Vercel 확인" 등을 요청하면 가능한 한 끝까지 수행한다.

1. `git status`, `git diff`로 변경 범위를 확인한다.
2. 의도한 파일만 `git add path/to/file`로 stage한다.
3. `main` 직접 push는 정책상 막힐 수 있으므로 PR 경로를 기본으로 한다.
4. feature 브랜치를 만들 때 Codex 기본 prefix는 `codex/`를 사용한다.
5. `git push -u origin <branch>`, `gh pr create`, `gh pr merge` 순서로 main에 반영한다.
6. Vercel 배포는 production deployment SHA가 main HEAD와 일치하고 state가 READY인지 확인한다.

충돌이나 미동기화 WIP가 보이면 먼저 사용자 변경을 보호한다. destructive 명령은 명시 요청 없이는 쓰지 않는다.

## Codex 환경 메모

- Codex 진입 문서는 이 `AGENTS.md`다. `CLAUDE.md`는 Claude Code용 parallel 문서.
- 로컬 웹 확인이 필요하면 정적 서버를 띄운 뒤 Browser/Playwright 계열 도구로 확인한다.
- 플러그인/스킬은 실제 가치가 있을 때만 사용한다. 단순 조회나 소규모 수정에는 강제 적용하지 않는다.
- 네트워크가 필요한 `gh`, `wrangler`, Vercel 확인 등은 sandbox/승인이 필요할 수 있다. 실패하면 승인 요청 후 재시도한다.

## 개인정보 / 표시 정책

- 사용자 실명을 UI에 노출하지 않는다.
- 공개 표시 가능: 축약 사용자 ID, 닉네임, 아바타
- 카카오에서 가져온 닉네임도 사용자가 별명으로 변경할 수 있는 현재 구조를 유지한다.
- 랭킹 카드, 친구 리스트, 서재 헤더의 표기 규칙을 일관되게 유지한다.

## 현재 우선순위 백로그

### A. 구글 로그인 활성화

코드는 `js/supabase.js`의 `signInWithGoogle` 및 로그인 픽커 버튼까지 준비되어 있다. 남은 일은 외부 설정이다.

- Google Cloud Console OAuth Client ID 생성
- 승인된 리디렉션 URI: `https://fjmiimpidlwuzuvnsduh.supabase.co/auth/v1/callback`
- Supabase Dashboard에서 Google provider 활성화 후 Client ID/Secret 입력
- OAuth 동의 화면 테스트 사용자 등록

### B. 도서관정보나루 API 연동

참고 문서:

- `LIBRARY_API_GUIDE.md`
- `LIBRARY_API_DETAILED.md`

남은 작업:

- `LIBRARY_API_KEY` 도입 방식 결정. 도메인 제한이 어렵다면 Worker 경유 검토
- `detail.html`에 "가까운 도서관 찾기" UI 추가
- 대출 가능 여부 배지
- 사용자 위치 기반 도서관 리스트

### C. books/folders Supabase 동기화

- 신규 테이블: `books`, `folders`
- RLS: 자기 행만 read/write
- 로그인 상태에서는 `js/storage.js`가 Supabase에도 dual-write
- 비로그인 상태에서는 localStorage만 유지
- `js/sync.js`는 첫 로그인 시 books/folders도 업로드
- 충돌 해결은 `updated_at` 기준 last-write-wins

### D. 실제 랭킹

- `monthly_ranking` view 추가
- `share.js`의 mock ranking을 실데이터로 교체
- 기존 friends 관련 migration은 `migrations/2026-05-10_phase2-5_friends.sql` 참고

### E. 추천 데이터 수집

- 행복한아침독서 2025
- 학교도서관저널 2024-2025
- 책따세 전체
