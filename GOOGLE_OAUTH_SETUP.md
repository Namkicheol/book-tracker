# 구글 로그인 활성화 가이드 (book-tracker)

코드 측 구현은 완료된 상태(`js/supabase.js`의 `signInWithGoogle`, `js/auth-ui.js`의 `#authLoginGoogle` 버튼)이므로, 아래 외부 설정 4단계만 거치면 즉시 활성화된다.

소요 시간: 약 15–20분.

---

## 1. Google Cloud Console — OAuth 2.0 Client ID 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 로그인.
2. 프로젝트 선택(또는 새로 만들기) — 이름은 `book-tracker-auth` 정도 권장.
3. 좌측 메뉴 → **APIs & Services → OAuth consent screen**.
   - User Type: **External** 선택 (개인 Google 계정으로 운영 중이면).
   - 앱 이름: `맘스북스`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처: 본인 이메일
   - **Scopes**: 기본 (`email`, `profile`, `openid`)만. 추가 안 해도 됨.
   - **Test users**: 본인 + 베타 테스터 Gmail 주소 등록. **반드시 등록된 계정만 로그인 가능** (publish하기 전까지).
4. 좌측 메뉴 → **APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID**.
   - Application type: **Web application**
   - Name: `book-tracker-web`
   - **Authorized JavaScript origins**: (선택사항 — Supabase가 PKCE를 사용하므로 보통 생략 가능)
   - **Authorized redirect URIs**: 다음 한 줄만 정확히 추가
     ```
     https://fjmiimpidlwuzuvnsduh.supabase.co/auth/v1/callback
     ```
   - **CREATE** → 모달에 표시되는 `Client ID`와 `Client secret`을 복사해 둔다.

---

## 2. Supabase Dashboard — Google Provider 활성화

1. [Supabase Dashboard](https://supabase.com/dashboard/project/fjmiimpidlwuzuvnsduh) 로그인.
2. 좌측 메뉴 → **Authentication → Providers**.
3. **Google** 항목 펼치기.
4. **Enable Sign in with Google**: ON
5. **Client ID(상단)**: 1단계에서 복사한 값 붙여넣기.
6. **Client Secret**: 1단계에서 복사한 값 붙여넣기.
7. 하단의 **Callback URL** 표시가 `https://fjmiimpidlwuzuvnsduh.supabase.co/auth/v1/callback`과 동일한지 확인.
8. **Save**.

---

## 3. Supabase — Authentication URL Configuration 점검

좌측 메뉴 → **Authentication → URL Configuration**.

- **Site URL**: `https://book-tracker-git-main-namkicheols-projects.vercel.app`
  (또는 운영하는 메인 도메인. 로컬 테스트 시 임시로 `http://localhost:8080`도 무방하지만, 끝낸 뒤엔 production URL로 되돌리는 게 안전.)
- **Redirect URLs (allow list)**: 다음을 한 줄씩 추가 (이미 있으면 추가 안 해도 됨).
  - `https://book-tracker-git-main-namkicheols-projects.vercel.app/**`
  - `https://*.vercel.app/**` (Vercel preview 배포에서도 OAuth 테스트하려면)
  - `http://localhost:8080/**`

`js/supabase.js`의 `getRedirectTo()`는 `origin + pathname`을 보내므로, allow list에 해당 origin이 포함되어 있어야 한다.

---

## 4. 동작 확인

1. 우상단 프로필 원 클릭 → 로그인 픽커 열기.
2. **"구글로 시작하기"** 클릭.
3. Google OAuth consent 화면이 뜨고, 1단계에서 등록한 test user로 로그인.
4. Supabase로 리다이렉트된 뒤 원래 페이지로 복귀.
5. 우상단 프로필 원이 본인 이름/이니셜로 바뀌면 성공.

문제가 생기면 브라우저 콘솔에서 `[supabase]` prefix로 찍히는 로그를 확인.

---

## 운영 단계 전환 (선택)

OAuth consent screen이 **Testing** 상태이면 test users로만 로그인 가능 + 7일마다 token 만료. 일반 사용자가 쓸 수 있게 하려면:

1. Google Cloud Console → OAuth consent screen → **PUBLISH APP**.
2. 검증이 필요한 scope(`profile`, `email`, `openid`만 쓰면 검증 불필요) — 본 앱은 기본 scope만 쓰므로 별도 verification 없이 published.
3. Publish 후엔 누구나 Google 로그인 가능.

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `redirect_uri_mismatch` | 1단계의 Authorized redirect URI와 Supabase Callback URL 불일치. 정확히 `https://fjmiimpidlwuzuvnsduh.supabase.co/auth/v1/callback` 인지 재확인. |
| Google OAuth 화면 안 뜸, 로그만 `provider not enabled` | 2단계 미완료. Supabase Provider 페이지에서 Google 토글 확인. |
| 로그인 직후 빈 페이지 / 무한 로딩 | 3단계 Redirect URLs 누락. 현재 origin이 allow list에 있어야 함. |
| Test user가 아닌 계정 → `access_denied` | 1단계 OAuth consent screen → Test users에 해당 Gmail 추가하거나, PUBLISH APP. |
| 로그인됐는데 `users` 테이블에 row 없음 | `js/auth-ui.js`의 onAuthChange → `upsertProfile` 흐름 확인. RLS 정책 점검 (`SUPABASE_SCHEMA.sql`의 `users` 정책). |

---

## 코드 측 상태 (참고)

- `js/supabase.js:83-89` `signInWithGoogle` — PKCE flow, `redirectTo` 처리 완료
- `js/auth-ui.js:233-234, 245` 로그인 픽커에 "구글로 시작하기" 버튼 + 핸들러 결선 완료
- 추가 코드 변경 불필요. 위 4단계만 끝나면 동작.
