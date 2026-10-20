# Google 로그인 설정과 확인 기록

## 현재 상태 — 2026-10-20

- Google Cloud 프로젝트 `book-tracker-auth`에 Web OAuth 클라이언트 `book-tracker-web`을 생성했다.
- 승인 callback: `https://fjmiimpidlwuzuvnsduh.supabase.co/auth/v1/callback`.
- OAuth 자격 증명을 Supabase Google provider에 저장하고 provider를 활성화했다. Client ID·Secret은 이 문서나 저장소에 기록하지 않는다.
- Supabase redirect allow list는 `http://localhost:8080/**` 및 정확한 production origin의 `/**`로 한정했다. `https://*.vercel.app/**` 같은 다른 프로젝트까지 포함하는 패턴을 사용하지 않는다.
- 운영자 테스트 계정을 등록하고 Aside에서 localhost → Google 인증 → 앱 복귀를 확인했다. 로그인 프로필 버튼도 표시됐다.
- Google OAuth 동의 화면은 **Testing**이다. 일반 사용자 공개 전환은 하지 않았다. 현재 등록된 테스트 계정에서 검증한 결과다.
- 독립적인 공개 Auth settings 조회에서 `google=true`, `kakao=true`를 확인했고, 서버 집계로 Google 계정 및 identity 각각 1개를 확인했다. 이메일·이름·토큰은 검증 출력에 포함하지 않았다.

## 유지할 설정

Supabase Auth의 Site URL은 production URL로 유지한다.

```
https://book-tracker-git-main-namkicheols-projects.vercel.app
```

Redirect URLs:

```
https://book-tracker-git-main-namkicheols-projects.vercel.app/**
http://localhost:8080/**
```

클라이언트는 현재 `origin + pathname`을 `redirectTo`로 전달한다. Preview에서 테스트해야 하면 해당 deployment origin만 별도로 등록한다. Google OAuth callback과 앱 복귀 URL은 서로 다른 설정이다.

Google의 Web OAuth 설정에서는 실제 앱 origin을 승인된 JavaScript origin으로 확인하고, redirect URI에는 Supabase callback을 정확히 등록한다. PKCE 사용만으로 origin 설정을 생략해도 된다고 단정하지 않는다.

Supabase 로그인에 필요한 기본 scope는 `openid`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`이다. `openid`를 포함해 Google Auth Platform Data Access의 설정을 확인한다. 이 앱에 Gmail·Drive 등 추가 권한은 필요하지 않다. 실제 계정 실명은 공개 닉네임으로 자동 복사하지 않는다.

## 기능 확인

1. 앱의 Google 로그인 버튼으로 시작한다.
2. 등록된 테스트 계정으로 인증하고 원래 앱 페이지로 돌아오는지 확인한다.
3. 프로필 버튼, 재로딩 후 세션 복원, 프로필 서버 동기화를 확인한다.
4. 프로필에서 학교·반·상세주소·아이 이름·생년월일 입력을 제공하지 않는지 확인한다.
5. 서재 공개는 기본 비공개이고 별도의 명시적 설정으로만 변경되는지 확인한다.

`SIGNED_IN`과 복원된 세션 모두 공통 `AuthUI`가 프로필 동기화를 시작한다. `share.html`을 먼저 방문해야 프로필이 생성되는 구조에 의존하지 않는다. 서버 Auth 계정 생성과 서비스용 `public.users` 프로필 생성은 별도 검증 대상이다.

## 운영 공개 전환

Testing을 유지한다. 일반 사용자에게 공개할 때는 별도 작업으로 Google의 Audience·Branding·홈페이지·개인정보처리방침·scope·도메인 설정과 요구되는 검증 절차를 확인한다. 기본 scope만 쓴다는 이유로 모든 검증이 면제되거나 Publish 즉시 누구나 로그인된다고 단정하지 않는다.

Google Testing의 refresh token 만료에는 scope에 따른 예외가 있으므로 “모든 토큰이 7일마다 만료된다”고 안내하지 않는다. Google provider 토큰과 Supabase 세션 토큰도 구분한다.

## 문제 확인

| 증상 | 확인할 항목 |
|---|---|
| `redirect_uri_mismatch` | Google 승인 redirect URI와 Supabase callback 일치 여부 |
| `provider not enabled` | Supabase provider 활성화와 공개 Auth settings |
| `access_denied` | 테스트 계정 등록, Audience 및 조직 정책 |
| 앱에 복귀하지 못함 | 정확한 앱 origin과 경로가 Supabase redirect allow list에 있는지 |
| Auth 계정만 있고 프로필이 없음 | 공통 AuthUI 프로필 동기화, users INSERT/SELECT RLS, 브라우저의 스크립트 버전 |

공식 문서: [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google), [Google OAuth 운영 준비](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance), [Google 토큰 만료](https://developers.google.com/identity/protocols/oauth2#expiration).
