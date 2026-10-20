# 공개 서재와 로그인 운영 메모 (2026-10-20)

## 변경

- 학교·반·상세 주소·아이 이름·생년월일 입력 기능을 제공하지 않는다. 기존 기기의 알려진 프로필 식별 키는 삭제하되 책·폴더는 보존한다.
- 시·도 및 시·군·구는 선택 항목이며 제공된 행정구역 목록에서만 고른다. 기존 자유 입력 지역은 재사용하지 않는다.
- OAuth의 name/full_name을 서비스 닉네임으로 자동 복사하지 않는다.
- 기존 privacy=public/school 값을 새 공유 동의로 해석하지 않는다. library_public=false가 기본이다. 사용자가 로그인한 뒤 설정에서 공개를 선택하고 서버 저장에 성공해야 공개된다.
- 다른 사람의 프로필 원본 users 행과 books 원본 행을 공개하지 않는다. 공개 서재 API는 로그인 사용자에게 동의한 서재의 축약 ID·선택 지역·책 수, 책 제목·저자·표지·출판사·ISBN만 제한 조회한다. 한줄평·날짜·단어장·폴더·학교·실명은 제외한다.
- 허구의 랭킹·친구 활동 알림·응원 전송 성공 문구를 제거했다. 서버 연결 실패와 공개 서재가 없는 경우를 구분해 표시한다.

## 서버 적용

`migrations/2026-10-20_private_public_libraries.sql`을 현재 스키마/정책과 대조한 뒤 적용한다. 새 API는 private schema의 최소 projection 함수와 public invoker wrapper로 구성된다. auth.uid()와 library_public=true를 매 조회에 검사한다. 익명 EXECUTE 권한을 부여하지 않는다. 이 변경은 사용자 책/폴더 데이터를 삭제하지 않는다.

적용 후 실제 인증 세션 두 개에서 다음을 확인한다.

1. 기본 비공개 계정은 다른 계정의 공개 목록에 나타나지 않는다.
2. 명시 공개한 계정의 선택된 책 필드만 조회된다. 원본 users/books에 대한 타인 직접 SELECT는 차단된다.
3. 비공개로 전환하면 다음 API 요청에서 목록과 도서 조회가 비워진다.
4. 익명 RPC 호출은 권한 오류를 반환한다.
5. 한줄평·독서 날짜·폴더가 RPC 반환에 없는지 확인한다.

## Google OAuth

클라이언트는 Supabase signInWithOAuth({provider:'google'})와 현재 페이지를 redirectTo로 사용한다. 시작 실패를 알리고 로그인 없이 서재 사용을 계속 지원한다. 인증 상태 변경 콜백은 다음 이벤트 루프로 미뤄 auth lock 안에서 재진입하는 상황을 피한다.

운영자가 확인할 외부 항목:

- 프로젝트가 ACTIVE_HEALTHY 상태인지 확인한다.
- Supabase Auth Google provider에 OAuth Client ID/Secret을 설정한다. Secret은 클라이언트나 저장소에 넣지 않는다.
- Google Web OAuth 승인 리디렉션 URI: https://fjmiimpidlwuzuvnsduh.supabase.co/auth/v1/callback
- Google 승인 JavaScript origin과 Supabase Auth redirect allow list에 실제 production origin/사용 페이지 및 필요한 로컬 URL을 등록한다.
- Google 동의 화면이 Testing이면 대상 계정을 Test users에 등록하거나 운영 조건에 맞게 게시한다.
- 실제 Google 로그인 → 앱 복귀 → 세션 유지 → 재방문 복원으로 완료를 검증한다. provider 설정만으로 로그인 성공을 단정하지 않는다.

공식 참고: https://supabase.com/docs/guides/auth/social-login/auth-google

## 로컬 검증

`node --test tests/privacy.test.cjs`는 프로필 식별키 정리 시 책/폴더 보존, 새 프로필 실명 미복사, 서버 upsert 소유권 및 입력 필드 제한을 검사한다. 실제 RLS/OAuth 인증 성공은 별도의 운영 검증이 필요하다.

## 실제 서버 조회 (2026-10-20)

프로젝트 복원 후 ACTIVE_HEALTHY 확인. 읽기 전용 스키마 조회로 users/books/folders 컬럼이 마이그레이션과 일치함을 확인했고 public view는 없다. 기존 users SELECT는 학교/공개 범위 정책 한 개이며 새 마이그레이션이 이를 교체한다. 기존 책·폴더의 타인 읽기 정책은 없다.

공개 Auth settings endpoint 결과는 google=false, kakao=true였다. 따라서 현재 Google 로그인은 provider 활성화와 OAuth 자격 증명 등록이 필요하다. Client Secret·OAuth 동의 화면·테스트 사용자 설정은 이번 읽기 전용 조회로 확인하지 않았다. 로컬 마이그레이션 작성은 서버 적용이나 로그인 성공 증거가 아니다.

## 서버 적용 후 독립 검증 (2026-10-20)

상위 작업에서 마이그레이션 적용 성공 후 별도 읽기 전용 조회로 확인했다. 프로필 1개가 비공개이고 새 공개 동의는 0개다. school/grade/region 값은 모두 비어 있다. 책 0개·폴더 0개이며 마이그레이션에는 책/폴더 DML이 없다. 이 하위 검증에서는 적용 전 건수를 독립 측정하지 않았으므로 전후 건수 동일성은 상위 기록과 함께 판단한다.

users SELECT는 authenticated 본인만, UPDATE는 본인 USING과 WITH CHECK다. public wrapper는 SECURITY INVOKER이고 anon EXECUTE=false, authenticated EXECUTE=true다. private projection은 최소 반환 필드만 가진 SECURITY DEFINER이고 auth.uid() 및 새 공유 동의를 매 호출 확인한다.

롤백 트랜잭션에서 authenticated 역할과 테스트용 JWT sub를 지정한 읽기 검증 결과 공개 서재·공개 도서·타인 프로필·책·폴더가 모두 0개였다. anon 역할의 실제 목록 RPC는 42501 permission denied로 거절됐다. 실제 계정 공개 동의를 변경하거나 테스트 책을 만들지 않았다.

Aside 기존 localhost 탭에서 함께 보는 서재 화면과 프로필 편집창을 확인했다. 비로그인 시 공개 서재 로그인 안내가 나오고 가짜 랭킹은 없다. 프로필은 닉네임, 선택형 시·도/시·군·구, 월 목표만 입력받는다. 실제 인증 계정의 공개 전환→타인 조회→철회 흐름은 사용자 동의 변경을 하지 않아 이번 검증 범위에 포함하지 않았다.

## Google OAuth 활성화 후 — 2026-10-20

초기 google=false 조회 이후 설정이 완료됐다. 상위 작업에서 Google Web OAuth 클라이언트 생성, Supabase provider 활성화, 정확한 callback과 로컬/production redirect allow list 등록, 테스트 계정 등록 및 실제 로컬 로그인 왕복을 확인했다. 독립 Auth settings 조회는 google=true/kakao=true이고 서버 집계에서 Google 계정·identity 각 1개를 확인했다. OAuth는 Testing 상태이며 일반 사용자용 공개 전환은 하지 않았다.

서버 readback에서 새 Google Auth 계정에 서비스 프로필이 아직 없는 점을 발견했다. 공통 AuthUI에 프로필 동기화를 추가해 SIGNED_IN/INITIAL_SESSION 및 DOM 로드 전 완료된 세션 복원도 처리하도록 수정했다. share 페이지 방문에 의존하지 않는다. 테스트를 추가해 4개 통과했다. 최신 로컬 앱을 새로고침한 뒤 독립 SQL 집계로 Google 서비스 프로필 1개, 공개 설정 0개를 확인했다. 자격 증명과 개인 이메일·실명은 문서에 기록하지 않는다.
