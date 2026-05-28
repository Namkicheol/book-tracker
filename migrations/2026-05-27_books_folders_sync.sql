-- ============================================================
-- book-tracker 동기화 Phase — books / folders 테이블
--
-- 설계 메모: SYNC_DESIGN_BOOKS_FOLDERS.md
-- 결정:
--   1. Soft-delete (deleted_at)
--   2. 클라이언트 supplied updated_at (서버 트리거 미적용)
--   3. RLS — user_id = auth.uid()
--
-- 실행: Supabase Dashboard → SQL Editor → 전체 복사 → Run
-- 검증: Table Editor에서 books / folders 가시 + RLS Enabled
-- ============================================================

-- ── books 테이블 ────────────────────────────────────────────
create table if not exists public.books (
  id           text primary key,            -- 클라가 생성 (storage.js uid())
  user_id      uuid not null references auth.users(id) on delete cascade,
  isbn         text,
  title        text not null,
  authors      text[]      default '{}'::text[],
  publisher    text,
  thumbnail    text,
  contents     text,
  category     text,
  language     text        default 'ko',
  rating       int         check (rating is null or (rating >= 0 and rating <= 5)),
  review       text,                        -- detail.js sanitizeReviewHtml 거친 HTML만
  read_date    text,                        -- 'YYYY-MM-DD' 형식 (빈 문자열 허용 안 함 — null)
  vocab        jsonb       default '[]'::jsonb,
  folders      text[]      default '{}'::text[],
  ar           numeric,                     -- AR(Accelerated Reader) 레벨
  lexile       text,
  status       text        check (status is null or status in ('want','reading')),
  created_at   timestamptz not null,        -- 클라 supplied
  updated_at   timestamptz not null,        -- 클라 supplied (LWW 기준)
  deleted_at   timestamptz                  -- soft-delete
);

-- 동기화 쿼리에 최적화된 부분 인덱스
create index if not exists books_user_updated_idx
  on public.books (user_id, updated_at desc)
  where deleted_at is null;

create index if not exists books_user_isbn_idx
  on public.books (user_id, isbn)
  where deleted_at is null and isbn is not null and isbn <> '';

-- ── folders 테이블 ──────────────────────────────────────────
create table if not exists public.folders (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  emoji        text,
  color        text,
  ord          int         default 0,       -- 'order'는 SQL 예약어 → ord
  created_at   timestamptz not null,
  updated_at   timestamptz not null,
  deleted_at   timestamptz
);

create index if not exists folders_user_ord_idx
  on public.folders (user_id, ord)
  where deleted_at is null;

-- ── Row Level Security ──────────────────────────────────────
alter table public.books enable row level security;
alter table public.folders enable row level security;

-- books 정책 (멱등)
drop policy if exists "books select own"        on public.books;
drop policy if exists "books insert own"        on public.books;
drop policy if exists "books update own"        on public.books;
drop policy if exists "books delete own"        on public.books;

create policy "books select own"
  on public.books for select
  using (auth.uid() = user_id and deleted_at is null);

create policy "books insert own"
  on public.books for insert
  with check (auth.uid() = user_id);

create policy "books update own"
  on public.books for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE 정책 없음 — soft-delete만 허용. hard-delete는 service role / cron에서만.

-- folders 정책 (동일 패턴)
drop policy if exists "folders select own"      on public.folders;
drop policy if exists "folders insert own"      on public.folders;
drop policy if exists "folders update own"      on public.folders;

create policy "folders select own"
  on public.folders for select
  using (auth.uid() = user_id and deleted_at is null);

create policy "folders insert own"
  on public.folders for insert
  with check (auth.uid() = user_id);

create policy "folders update own"
  on public.folders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 트리거 미적용 의도 ──────────────────────────────────────
-- public.users는 set_updated_at 트리거가 있지만 books/folders는 클라가 권위.
-- 트리거 달면 동기화 충돌 시 "서버에 늦게 도착한 쪽"이 이겨서 사용자 의도 깨짐.

-- ── Data API GRANT (Supabase 2026-05-30 신규 정책 대응) ─────
-- 2026-10-30부터 기존 프로젝트에도 새 테이블의 명시 GRANT가 강제됨.
-- RLS가 행 단위 권한을 책임지므로 테이블 단위 GRANT는 SELECT/INSERT/UPDATE만.
-- DELETE는 GRANT 안 함 — soft-delete 정책과 일관됨 (정책 일치 + 방어 깊이).
grant usage on schema public to authenticated;
grant select, insert, update on public.books   to authenticated;
grant select, insert, update on public.folders to authenticated;

-- anon 키(비로그인 사용자)는 books/folders 접근 불허. supabase-js가 로그인
-- 안 된 상태에서 호출해도 RLS auth.uid() = user_id가 NULL이라 막히지만,
-- GRANT 자체를 안 주는 게 정책의 명시적 의도와 일치.

-- ── 30일 정리 (선택, 수동 실행 또는 Edge Function) ─────────
-- delete from public.books   where deleted_at is not null and deleted_at < now() - interval '30 days';
-- delete from public.folders where deleted_at is not null and deleted_at < now() - interval '30 days';

-- ============================================================
-- 검증 쿼리 (실행 후 빈 결과가 정상)
-- ============================================================
-- select * from public.books   where user_id = auth.uid();
-- select * from public.folders where user_id = auth.uid();
