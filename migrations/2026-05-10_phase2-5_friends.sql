-- ============================================================
-- Phase 2.5 — 같은 학교 친구 서재 공개 인프라
--
-- 실행 위치: Supabase Dashboard → SQL Editor → 새 쿼리 → 아래 전체 복사 → Run
-- 멱등 — 두 번 실행해도 안전.
-- ============================================================

-- ── 1. users 테이블 컬럼 추가 ────────────────────────────────
alter table public.users
  add column if not exists city     text,
  add column if not exists district text,
  add column if not exists school   text,
  add column if not exists privacy  text default 'school';

-- privacy 값 도메인 제약 (전체 공개 / 같은 학교만 / 비공개)
do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'users_privacy_check'
  ) then
    alter table public.users
      add constraint users_privacy_check
      check (privacy in ('public', 'school', 'private'));
  end if;
end $$;

-- ── 2. 학교 검색용 인덱스 ────────────────────────────────────
create index if not exists users_school_privacy_idx
  on public.users (school, privacy)
  where school is not null and privacy <> 'private';

-- ── 3. RLS 정책 업데이트 ────────────────────────────────────
-- 기존 "본인만 SELECT" 정책을 더 정교한 정책으로 교체.
-- 이제 다른 사용자의 row도 조건에 따라 SELECT 가능.

drop policy if exists "users can read own row" on public.users;
drop policy if exists "users readable by self or matching scope" on public.users;

create policy "users readable by self or matching scope"
  on public.users for select
  using (
    -- 본인은 항상 자기 row 읽기 가능
    auth.uid() = id
    -- 또는 다른 사람이라도: privacy != 'private' 이고 ('public' 이거나 같은 학교)
    or (
      privacy <> 'private'
      and (
        privacy = 'public'
        or (
          privacy = 'school'
          and school is not null
          and school = (
            select u.school from public.users u
            where u.id = auth.uid() limit 1
          )
        )
      )
    )
  );

-- update / insert 정책은 이전과 동일 — 본인 row만 변경 가능 (이미 정의됨, 멱등 보장)
drop policy if exists "users can update own row" on public.users;
drop policy if exists "users can insert own row" on public.users;

create policy "users can update own row"
  on public.users for update
  using (auth.uid() = id);

create policy "users can insert own row"
  on public.users for insert
  with check (auth.uid() = id);

-- ── 4. 검증 쿼리 (선택) ─────────────────────────────────────
-- 본인 row 읽기:
--   select * from public.users where id = auth.uid();
-- 같은 학교 친구들:
--   select id, nickname, avatar, grade, school from public.users
--   where school = (select school from public.users where id = auth.uid())
--     and id <> auth.uid();
