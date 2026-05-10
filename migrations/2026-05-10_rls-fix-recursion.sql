-- ============================================================
-- Phase 2.5 hotfix — RLS 무한 재귀 수정
--
-- 증상: getProfile / upsertProfile 호출 시 500 + 'infinite recursion
--   detected in policy for relation "users"' 에러.
-- 원인: SELECT 정책 안에서 같은 테이블(public.users)을 다시 SELECT
--   하므로 정책 평가가 무한 반복.
-- 해결: SECURITY DEFINER 헬퍼 함수로 본인 학교를 RLS bypass 하여 조회.
--
-- 실행 위치: Supabase Dashboard → SQL Editor → 새 쿼리 → 아래 전체 복사 → Run
-- ============================================================

-- 1. 본인 school을 가져오는 SECURITY DEFINER 함수
create or replace function public.current_user_school()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select school from public.users where id = auth.uid() limit 1;
$$;

-- public anon/authenticated 둘 다 호출 가능하도록
grant execute on function public.current_user_school() to anon, authenticated;

-- 2. SELECT 정책 교체 — 서브쿼리 대신 함수 호출
drop policy if exists "users readable by self or matching scope" on public.users;

create policy "users readable by self or matching scope"
  on public.users for select
  using (
    auth.uid() = id
    or (
      privacy <> 'private'
      and (
        privacy = 'public'
        or (
          privacy = 'school'
          and school is not null
          and school = public.current_user_school()
        )
      )
    )
  );

-- 검증:
--   select * from public.users where id = auth.uid();
--   select count(*) from public.users where privacy = 'public';
