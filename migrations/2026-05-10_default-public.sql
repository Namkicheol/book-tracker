-- ============================================================
-- Phase 2.5 follow-up — privacy 기본값을 'public' 으로 변경
--
-- 사용자 결정: 첫 가입 시 기본은 '전체 공개', 비공개로 바꾸려면
-- 프로필 편집에서 명시적으로 선택해야 함.
--
-- 실행 위치: Supabase Dashboard → SQL Editor → 새 쿼리 → 아래 전체 복사 → Run
-- ============================================================

-- 1. 컬럼 기본값을 'school' → 'public'
alter table public.users
  alter column privacy set default 'public';

-- 2. 기존 row 중 자동 default로 들어간 'school' 값을 'public'으로 갱신
--    (사용자가 프로필 편집에서 명시적으로 'school'/'private' 저장한 적 없는 row만 대상)
--    안전을 위해: privacy='school' 이고 school 컬럼이 NULL 인 row만 변경
--    (school 이 채워져 있다면 사용자가 의도적으로 'school' 공개 선택한 가능성 있음)
update public.users
   set privacy = 'public'
 where privacy = 'school'
   and school is null;

-- 검증:
--   select id, privacy, school from public.users;
