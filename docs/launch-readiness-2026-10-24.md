# 맘스북스 출시 전 점검 — 2026-10-24

현재 판단: **출시 준비 확인 중**. 계정 삭제 경합을 발견해 로컬에서 수정했다. 추가 검사에서 공식 Admin UI로 만든 폐기 가능한 두 계정의 실제 JWT·운영앱 동기화·공개 철회·서버 삭제를 확인하고 모두 정리했다. Google 신규 가입과 실제 iPhone 검사는 수행하지 않았다.

운영 확인 주소: https://book-tracker-git-main-namkicheols-projects.vercel.app/

## P0 — 수정 후 운영 반영 확인 필요

### 계정 삭제 요청이 설정 화면의 계정과 달라질 수 있었음

- 재현: A 계정으로 설정 화면을 연 뒤 활성 세션을 B로 바꾸면, 기존 handler가 최신 B 세션으로 `delete-account`를 호출했다. 정리에는 처음 캡처한 A ID를 사용했다. 이미 요청 중인 동안 계정이 바뀌면 새 계정을 로그아웃시키는 경로도 있었다.
- 수정: `settings.html`에서 현재 저장소 소유자·현재 사용자·세션 사용자가 처음 확인한 계정과 같은지 검사한다. 삭제 요청에는 그 계정의 JWT를 명시적으로 고정한다. 성공 응답의 `ok`와 `deletedUserId`를 확인한다. 요청 중 계정이 바뀌면 새 계정 데이터를 지우거나 로그아웃하지 않는다. 중복 호출도 차단한다.
- 증거: `tests/account-deletion.test.cjs` 초기 6개는 수정 전 실패, 수정 후 통과. 오래된 handler, 토큰 고정, 세션 조회 중 계정 변경, 요청 진행 중 계정 변경, 중복 호출, 잘못된 성공 응답을 검사한다.
- 별도 WebKit 화면 fixture에서도 오래된 handler 차단·JWT 고정·현재 다른 계정 보존을 확인했다. 이 fixture에서는 실제 Supabase 계정 삭제 요청이 0회다. 아래 추가 검사는 별도의 신규 QA 계정만 사용했다.
- 운영 `settings.html` 재조회 시 새 `ownsAccount` 검사가 아직 없었다. **로컬 수정 완료와 운영 수정 완료는 별개다.** 배포 뒤 운영 문서 바이트와 같은 격리 회귀 검사를 다시 확인해야 한다.

### 탈퇴 완료 뒤 설정 화면이 다시 열리는 경합도 수정

- 실제 신규 QA C의 운영앱에서 `delete-account 200 → 로컬 정리 true → signOut → logout 403 → 완료 alert → settings.html 재로드`를 기록했다. 삭제된 사용자의 logout 403 이후 SDK가 로컬 세션을 제거했으며, 10초 뒤 owner=null·로그인 버튼·저장된 auth 없음·로컬 책 0을 확인했다.
- 원인은 `Sync`의 지연된 `SIGNED_OUT` 콜백이 소유자를 guest로 바꾸며 `location.reload()`를 실행해, 탈퇴 handler의 index 이동을 덮는 것이다.
- `settings.html`에서 로컬 계정 정리 뒤 `Sync.setOwner(null)`을 먼저 완료하고 signOut하도록 최소 수정했다.
- 새 회귀 테스트는 수정 전 settings 재로드로 실패하고 수정 후 index 이동으로 통과했다. 실제 `sync.js`를 쓰는 독립 WebKit에서도 수정 전 `/settings.html → /settings.html`, 수정 후 `/settings.html → /index.html`과 guest owner를 확인했다.
- [운영 진단](../output/playwright/launch-audit-20261024/deletion-diagnostic.json), [수정 전후 WebKit 비교](../output/playwright/launch-audit-20261024/deletion-navigation-fixture.json). 운영 반영 확인은 배포 뒤에 수행한다.

## P1 — 공개 출시 전에 완료할 실제 계정 검증

| 항목 | 이번에 확인한 증거 | 남은 확인 |
|---|---|---|
| Google 로그인 | 운영 로그인 선택에 Google 버튼. 현재 Auth settings의 Google/Kakao 모두 enabled. 인증 시작 endpoint가 Google로 302, callback 일치. 쿠키 없는 Google 응답은 200 `Sign in - Google Accounts`, 명시적 redirect/client 오류 없음 | 새 일반 계정으로 로그인→동의→앱 복귀→프로필 생성→재방문 복원. OAuth Audience가 Testing인지 Production인지 및 테스트 사용자 밖 접근은 로그인 전 화면으로 판정할 수 없음 |
| 로컬 기록 | 로그인 비활성화한 독립 WebKit에서 저장→새로고침 후 동일 책 유지 | 실제 iPhone Safari의 저장 공간/사이트 데이터 삭제 안내 및 설치형 PWA 재방문 |
| 계정별 격리·동기화 | Node 계정/guest/outbox 경합 회귀 및 실제 신규 A/B의 독립 WebKit context에서 프로필·책·폴더 서버 저장·새로고침·상대 QA 원본 접근 차단 통과 | 서로 다른 실제 기기·오프라인 편집→재접속 및 같은 책 수정 충돌 |
| 공개/비공개 | 운영 READ ONLY 역할 검사 및 실제 신규 JWT에서 A 공개/B 비공개 거절→B 공개 허용→A 철회 거절 통과. 실제 회원 목록을 조회하지 않고 QA 두 UUID만 대상 | 실제 iPhone 및 서로 다른 실제 기기의 기존 화면에서 철회 결과 갱신. Google OAuth 왕복은 별도 |
| 회원 탈퇴 | 운영 Edge Function ACTIVE/JWT 및 최소 자기 삭제 확인. 신규 QA A/C의 운영 설정 탈퇴→Auth/프로필/책/폴더 제거 확인. B는 Admin UI 정리. 화면 복귀 경합을 실제 재현하고 로컬 수정/fixture 검증 | 로컬 계정 경합·화면 복귀 수정의 운영 배포 반영 확인 |
| 모바일 내보내기 | WebKit iPhone 입력 모드에서 카드 8종 실제 PNG 다운로드, signature·1080×1350 전부 통과 | 실제 iPhone에서 사진 저장/파일 저장/공유 시트의 최종 동작. WebKit 다운로드 통과가 iOS 공유 시트 검증을 대신하지 않음 |

과거 `docs/RELEASE_READINESS.md`에는 Google OAuth Testing 기록이 있다. 이번에는 일반 사용자 공개 상태를 독립 확인하지 않았으므로 과거 상태가 현재도 유지된다고 단정하지 않는다.

### 추가 검사: 실제 신규 QA 계정 두 개 — 완료 및 정리

초기에는 CLI/admin 자격증명이 없어 생성을 보류했다. 이후 기존 Aside Supabase Dashboard 로그인을 확인했고, 공식 `Auth → Add user → Create new user` UI에 `Auto confirm user` 및 **확인 이메일을 보내지 않는다**는 안내가 있어 이 경로로 두 계정을 생성했다. 서비스키 추출과 `auth.users` 직접 삽입은 하지 않았다.

- 합성 계정: confirmed `example.invalid` 두 개. 이번 실행에서 생성한 UUID `22556b44-bfc3-4cf4-ba68-0247674cff93`와 `9b5c6f2b-4d4b-477e-9df4-40803243fff4`만 변경했다.
- 임시 비밀번호는 비공개 REPL 메모리에서 생성했다. 권한 0600의 FIFO로 격리 프로세스 메모리에 전달한 뒤 FIFO와 REPL 값을 제거했다. 비밀번호·JWT·refresh token은 출력·문서·일반 파일에 저장하지 않았다.
- 공식 password token endpoint로 두 신규 계정의 실제 JWT를 받았다. 이 단계는 Google OAuth 신규 가입 검사가 아니다.
- 운영앱의 서로 다른 WebKit context에서 실제 세션을 설치했다. 두 계정 모두 UI에서 별명 `맘스북스 점검`과 비공개 프로필을 저장했다.
- 앱 `Storage.saveBook`/`saveFolder` → 앱 동기화 코드 → 운영 DB의 자기 책/폴더 각 1개 → 새로고침 유지까지 확인했다. 책 입력 폼의 전체 필드를 클릭한 검사는 아니다.
- 각 JWT로 상대 QA 계정의 원본 책/폴더 SELECT가 0행임을 확인했다.
- 설정 UI에서 A 공개/B 비공개일 때 B의 A 개별 도서 RPC 거절, B 공개 후 A 합성 도서 1권 허용, A 비공개 철회 후 다시 0행, 마지막 B도 비공개로 복원했다. 조회 대상은 이 두 UUID뿐이었다.
- A는 운영앱 설정의 탈퇴 버튼으로 삭제했다. 이후 Auth/프로필/책/폴더가 제거된 것을 서버에서 독립 확인했다. **삭제 뒤 `index.html` 이동을 기다리는 자동 검사만 30초 타임아웃했다.** 당시 브라우저 URL은 보존하지 못했다. 별도 운영 HTTP 조회에서는 `index.html`이 그대로 200이므로 이를 canonical `/` 리다이렉트라고 단정하지 않는다. 이후 QA C 운영 진단에서 settings 재로드 및 로컬 세션 제거를 확인했고, 위 P0 섹션대로 이동 경합을 수정했다. 스크립트는 향후 루트/`index.html` 둘 다 허용하고 실패 시 현재 URL을 기록하도록 수정했다.
- B는 공식 Admin UI에서 정확한 합성 이메일과 UUID를 확인한 후 삭제했다.
- 최종 독립 SQL readback: 최초 두 QA UUID 및 추가 진단 QA C `785962e0-2510-496a-8646-1477291f7d33`의 **Auth 0, profiles 0, books 0, folders 0**. 기존 회원에 대한 수정/삭제는 0건이다.

[실제 계정 검사 결과](../output/playwright/launch-audit-20261024/real-accounts-results.json)는 정상 통과 단계와 마지막 UI 대기 타임아웃을 함께 보존한다. 서버 삭제 확인을 근거로 전체 UI 검사가 통과했다고 바꾸지 않았다.

## 현재 운영 DB에서 확인한 개인정보 경계

데이터를 넣거나 공개 범위를 변경하지 않았다. READ ONLY 트랜잭션에서 기존 프로필 ID를 서버 내부 JWT `sub`로 지정하고 `authenticated` 역할로 읽었다. 결과는 식별자·책 내용 대신 참/거짓 집계로만 받았고 종료 시 rollback했다.

- `users`, `books`, `folders`: 모두 RLS 활성화. 본인 소유 SELECT 및 INSERT/UPDATE 소유권 조건 확인.
- 공개 viewer는 다른 공개 owner의 목록과 도서를 읽을 수 있었다.
- 비공개 viewer는 legacy 목록·v2 목록·feed·개별 도서 RPC 모두 0행이었다.
- 공개 viewer에게 비공개 owner의 목록과 도서는 숨겨졌다.
- 공개 viewer도 원본 `users`/`books`의 타인 행을 직접 읽지 못했다.
- 미등록 authenticated JWT의 네 RPC와 세 원본 테이블은 모두 0행이었다.
- 네 public RPC의 `anon EXECUTE=false`, `authenticated EXECUTE=true` 확인.
- feed의 표지는 최대 3권, 책 반환 key는 `authors,isbn,publisher,thumbnail,title` 5개. 한줄평·독서 날짜·폴더·학교·아이 정보·OAuth 실명은 반환하지 않는다.
- 원격 `get_public_library_books`도 같은 최소 서지 필드만 반환한다. 공개 별명은 직접 저장한 `public_nickname`을 사용한다.

## 실제 운영 화면과 정책 링크

Aside에서 운영 서재, 로그인 선택, 설정, 개인정보 처리방침, 이웃 서재 비로그인 화면을 읽었다. 로그인 전 타인 회원 서재는 로그인/공개 동의 안내로 제한되고, 별도의 주제 책장은 비로그인으로 표시된다. 기존 사용자 책·프로필·공개 범위는 변경하지 않았다.

- `privacy.html`, `terms.html` 운영 HTTP 200, 설정 링크 연결 확인.
- 개인정보 문서에는 직접 정한 별명·선택형 시/구·명시적 공개 저장·상호 공개 정책·학교/아이 신원/상세 위치 제외·탈퇴 항목이 있다.
- 연락처는 실제 `mailto:obangti1@gmail.com`이며 placeholder 주소가 아니다. 두 문서에 운영자 `개인(비사업자) · 맘스북스`가 표시된다. 사업자번호가 필요한 사업 형태인지 법적 적합성을 판정한 감사는 아니다.
- 로그인 후 설정의 탈퇴 entry를 격리 WebKit에서 확인했고, 추가 생성한 QA A 계정에 한해 운영 버튼으로 실제 삭제했다. 기존 회원 버튼은 누르지 않았다.
- Google 로그인 신규 사용자 프로필 fixture는 실명 미복사·초기 공개 선택 미저장·서버 저장 성공 후만 로컬 반영·실패/취소·계정 경합을 검사한다.

## 모바일 회귀와 카드 증거

`output/playwright/launch-audit-20261024/`에 실제 다운로드와 결과를 남겼다. 브라우저는 새 독립 WebKit context이고 Supabase 설정을 비활성화한 local fixture다. 실제 회원 기록은 사용하지 않았다.

- 320/390/820px × index·scan·detail·stats·share·settings·privacy·terms·recommendations = 27조합: 가로 넘침 0, JavaScript page error 0, 해당 실행의 실패 HTTP 응답 0, 로컬 href 존재 검사 실패 0.
- 8종 카드 각각 실제 다운로드 PNG header와 1080×1350 확인. [카드 모아보기](../output/playwright/launch-audit-20261024/cards-contact-sheet.jpg).
- Escape 닫기와 원래 내보내기 버튼 초점 복원 확인.
- [전체 WebKit 결과](../output/playwright/launch-audit-20261024/results.json), [격리 탈퇴 결과](../output/playwright/launch-audit-20261024/deletion-webkit.json), [OAuth 시작 결과](../output/playwright/launch-audit-20261024/oauth-start.json).
- 최종 통합 자동 테스트: `node --test tests/*.test.cjs` **94/94 통과**. 탈퇴 회귀 7개 포함. 영어 추천 확장 통합 후 실행했다.
- 인증·프로필·계정 격리/동기화·공개 서재 UI·정원/내보내기·탈퇴 관련 파일을 묶은 회귀 검사는 초기 50/50 통과했고, 이후 탈퇴 화면 이동 회귀 1개를 추가해 전체 94/94에 포함했다. `settings.html`의 CRLF를 보존했고 해당 diff whitespace 검사도 통과했다.

## P2 — 출시 후속 정리

- Supabase security advisor: `public.set_updated_at`의 mutable search_path 경고 1건. 함수 및 트리거 영향 확인 후 빈 search_path/명시적 스키마 적용 검토. [공식 설명](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
- 유출 비밀번호 보호 비활성 경고가 있다. 현재 화면은 Google/Kakao OAuth 중심이므로 비밀번호 가입 제공 여부와 실제 정책에 맞춰 판단한다. [공식 설명](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Supabase CDN과 Edge Function import가 `@2` 범위이므로 재현 가능한 의존 버전 고정은 후속 점검 대상이다. 이번에는 의존성을 변경하지 않았다.
- `AGENTS.md`의 Google 활성화 백로그와 오래된 출시 메모 일부는 현재 provider enabled 결과보다 오래됐다. 외부 일반 사용자 인증 검증 뒤 최신 결과로 정리한다.

## 최종 배포 전 체크

- [x] 영어 추천 확장 통합 후 전체 테스트 94/94 통과.
- [ ] 탈퇴 경합 수정 운영 반영 및 운영 바이트 readback.
- [ ] 일반 Google 계정 인증 왕복/새 프로필/세션 복원.
- [x] 새로 생성한 두 QA 계정·독립 WebKit context의 실제 JWT 동기화/공개 철회 및 최종 제거.
- [ ] 서로 다른 실제 기기에서 동기화 및 오프라인 충돌 확인.
- [x] 폐기 가능한 QA A의 운영앱 탈퇴와 서버 cascade 삭제 확인.
- [x] 추가 QA C로 탈퇴 화면 이동 타임아웃 원인 재현 및 로컬 수정/수정 전후 WebKit 검증.
- [ ] 배포 후 운영 탈퇴 화면 이동 수정 반영 확인.
- [ ] 실제 iPhone 공유/다운로드 및 카메라 바코드 허용/거절 확인.
- [ ] 최종 production deployment SHA/READY와 배포된 HTML/JS/CSS 확인.

이 감사에서는 commit/push/배포와 기존 회원 변경을 수행하지 않았다. 외부 변경은 추가 승인된 새 QA 세 계정의 생성·합성 기록·짧은 공개/철회·삭제에 한정했고, 끝난 뒤 모두 제거된 것을 확인했다.
