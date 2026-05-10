-- ============================================================
-- book-tracker Supabase 스키마 — Phase 3-1 (users 테이블 + RLS)
--
-- 실행 위치: Supabase Dashboard → SQL Editor → 새 쿼리 → 아래 전체 복사 → Run
-- 실행 후 검증: Table Editor에서 `users` 테이블 보임 + RLS Enabled 표시
-- ============================================================

-- ── users 테이블 ─────────────────────────────────────────────
-- auth.users(id) 와 1:1로 연결되며 OAuth 가입 직후 자동으로 행 생성되지 않으므로
-- 클라이언트 sync.js가 첫 로그인 시 upsert로 행을 만듭니다.

create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  nickname      text,
  avatar        text,
  grade         text,
  region        text,
  monthly_goal  int,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────
alter table public.users enable row level security;

-- 멱등성 위해 기존 정책 제거 후 재생성
drop policy if exists "users can read own row"   on public.users;
drop policy if exists "users can update own row" on public.users;
drop policy if exists "users can insert own row" on public.users;

create policy "users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "users can update own row"
  on public.users for update
  using (auth.uid() = id);

create policy "users can insert own row"
  on public.users for insert
  with check (auth.uid() = id);

-- ── updated_at 자동 갱신 트리거 ──────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ============================================================
-- 검증 쿼리 (선택) — 실행해보면 빈 결과가 나와야 정상
-- ============================================================
-- select * from public.users;
