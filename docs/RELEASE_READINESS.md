# 맘스북스 출시 준비 — 2026-10-20

## 이번 변경

- 기존 핑크 UI와 Gowun Batang 계열 글꼴 유지.
- 자체 주제별 탐색·대화 질문, 출판사 서지로 확인한 첫 책장 4권.
- 연령 분류 검색, 전집·세트 제외, 여러 권 선택 저장, 보유 도서 표시.
- 서로 다른 완독 도서 20권마다 나무 한 그루. 나무별 씨앗 선택을 보존하며 정원에 누적.
- GPT 정원 배경과 세 종류 나무 그림, 맘스북스 워드마크가 있는 독서 카드.
- 카드에는 실제 책 정보·전체 메모·실제 독서 정원 수치를 사용. 긴 메모는 세로 확장하며 과도하게 긴 기록은 PDF 안내.
- 계정별 로컬 책·폴더·프로필·정원 분리, 계정이 바뀐 뒤 도착한 동기화 응답 차단.
- 키보드로 독서 카드 창 닫기·초점 복원, 한줄평 작성 전에도 카드 내보내기.

## 외부 설정에서 확인한 것

- Google 로그인은 등록된 테스트 계정으로 인증 및 앱 복귀, 프로필 생성 확인.
- Google OAuth는 **Testing** 상태. 일반 사용자용 공개 완료가 아님.
- 개인정보·공개서재 마이그레이션 적용. 학교·학년·자유입력 지역 제거, 기본 비공개.
- 책·폴더 소유자는 삭제 표시도 동기화할 수 있도록 SELECT 정책 수정. 타인은 조회할 수 없음.
- 오래된 오프라인 쓰기가 최신 서버 기록이나 삭제 표시를 덮어쓰지 못하도록 서버 트리거 적용.
- authenticated 역할의 필요한 Data API 권한을 명시하고 anon의 원본 테이블 권한 제거.
- `delete-account` Edge Function ACTIVE v1, JWT 검사 사용. OPTIONS 200, 인증 없는 POST 401 확인.
- 탈퇴 함수는 전달된 JWT의 사용자를 다시 확인하고 그 계정만 삭제하도록 작성됨. 실제 계정 삭제는 실행하지 않음.

서버 회귀 검사는 롤백 트랜잭션에서 수행했다. 소유자는 삭제 표시 1개를 확인하고 타인은 0개를 확인했다. 과거 버전 덮어쓰기 차단·동일 시각 삭제 복구 차단·더 최신 변경 허용도 확인했다.

## 최종 검증

- `node --test tests/*.test.cjs`: 30개 통과.
- JavaScript 문법 및 CRLF를 고려한 diff 검사 통과.
- 독립 브라우저 환경에서 320/390/820px × 7개 화면 가로 넘침 없음, JavaScript 오류 없음.
- 추천 첫 책장 4권, 기본 검색 단권 24권 확인. Aside 실제 로그인 세션에서 과학 주제 23권과 대화 질문 확인.
- 추천 선택 저장 → 정원 성장 → PNG 다운로드 및 Escape 닫기·초점 복원 확인.
- Sol 독립 재검토에서 계정 교차 접근, 재접속, 오래된 전송 대기 기록 재생 문제의 수정 확인.
- 서버 검사 임시 기록은 트랜잭션 롤백. 실제 사용자의 책이나 계정을 테스트 목적으로 삭제하지 않음.

## 웹 배포 전 남은 확인

- 현재 HTML/JS/CSS 변경은 로컬 작업 상태. 커밋·푸시 및 웹 운영 배포는 아직 하지 않음.
- 운영 배포 후 캐시 갱신, Google 운영 URL 인증 왕복, 로그아웃·재로그인, 서로 다른 기기에서 기록 동기화 확인.
- Google 일반 사용자 공개 전환에 필요한 Branding/Audience/도메인·개인정보처리방침 설정 확인.
- 추천 API의 실제 서비스·수익화 방식에 맞는 이용 허용 범위 확인. 자체 선정 목록을 만들었다고 API 이용 허락까지 확보된 것은 아님.
- 실제 사용자가 공개 동의 → 다른 계정으로 조회 → 공개 철회를 수행하는 전체 UI 흐름 확인.
- 탈퇴는 별도 폐기 가능한 테스트 계정으로 생성·기록·삭제·재조회까지 검증 필요.
- 씨앗 선택·물 주기는 기기별 로컬 설정이며, 나무 수는 동기화된 완독 기록에서 계산됨.
- 현재 구현물은 모바일 우선 웹/PWA. 앱스토어·플레이스토어용 패키지 제작이나 심사 제출을 한 상태가 아님.

관련 원본: [개인정보와 공개서재](PRIVACY_AND_PUBLIC_LIBRARIES.md), [추천 출처 감사](recommendation-source-audit.md), [Google 로그인 설정](../GOOGLE_OAUTH_SETUP.md).

## 2026-10-21 추천 목록 확장 검증

- 자체 추천 4권 + 국립어린이청소년도서관 추천 확인 10권 + 칼데콧·뉴베리 8권 + 공식 출판사 인스타그램 소개 4권 = 서로 다른 26권. 출판사 소개 필터는 일부 책과 중복 분류.
- 출처·연령·주제 필터, 6권씩 더보기, 최대 4개 동시 조회 및 실패 재시도. 원래 핑크/폰트 유지.
- 실API에서 26권 전체 ISBN·제목·저자 일치 확인, 자동 테스트34개 통과. SNS 인기도 순위나 Threads 목록으로 표시하지 않음.
- 로컬 변경이며 웹 운영 배포 및 앞서 남긴 출시 전 확인 사항은 여전히 남음.

### 2026-10-21 review update

- Restored cover-first catalog, grade/source/textbook navigation and English AR/award filters. Catalog 5,625 records; original input preserved.
- Reading-card modal now offers 8 themes: letter, coffee, garden, flowers, evening, picnic, animal friends and doodle notebook. Child themes use “우리 아이 책자랑”; no profile/school metadata. All themes keep actual cover/review, Momsbooks wordmark, 4:5 standard output and long-text preservation.
- Generated backgrounds are local runtime assets. Nanum Pen Script is bundled with its OFL license; existing app font and pink palette are preserved.
- Login control is a simple outline person in the header, with the existing profile/login flow.
- Local automated checks: 48 passed. Rendering: all 8 themes generated 1080×1350 with the local handwriting font loaded. CRLF-aware diff whitespace check passed.
- Latest review preview: https://book-tracker-2u80uqt88-namkicheols-projects.vercel.app (READY; selected public runtime bytes match local). Browser readback confirms 5,625 books and English 1,059; independent Newbery/Caldecott filters return 43/35. At 390px no horizontal overflow. All 8 modal themes selected and PNG download signature/dimensions verified (1080×1350); zero console errors. Isolated test ISBN caused the expected missing-product warning only. No real account/library data used.

### 2026-10-21 production deployment

User requested deployment and testing after reviewing the preview. Vercel CLI published the verified runtime snapshot as production deployment `dpl_FMnf7eQzsQo6oR13udnvgievzg3D` (READY). Both `https://book-tracker-psi-one.vercel.app` and the existing `https://book-tracker-git-main-namkicheols-projects.vercel.app` resolve to this deployment. Forty-three public HTML/JS/CSS responses match local file bytes; raw data and internal docs return 404. Automated tests: 48 passed.

GitHub CLI authentication is invalid. This production release is a direct CLI working-tree snapshot, not a pushed/merged Git release; its source cannot be described as main HEAD. `docs/production-release-20261021.json` records the deployment identity and runtime content hashes (excluding config). Commit/PR/main synchronization remains outstanding.

### 2026-10-23 profile and catalog verification

- Added 77 individually verified publisher books: Korean 43 (science 18, society 8, mathematics 7, history 5, art 5), English 34 (early readers 8, picture books 11, chapter nonfiction 15). Catalog total 5,702: Korean 4,609 and English 1,093. Six additional English candidates held because exact ISBN API lookup was unavailable; no inferred AR or age is published.
- Excluded legacy third-party recommendation memberships; kept 78 verified award records and grade/language/AR/publisher navigation. Original research records remain outside public runtime.
- First profile setup: editable city/district, required nickname, public choice preselected but saved explicitly, private option below. Existing private settings retained. Login outline uses the common muted icon color. Cross-account save races are guarded before writes.
- Automated verification: 63 tests passed. Isolated 390px WebKit profile save verified using mocks, with no actual account writes. Aside verified catalog and English AR/award navigation. Database v2 public nickname RPC applied and tested with rolled-back fixtures.
- Deployment status for this change is recorded after Git/production readback, not inferred from local checks.
