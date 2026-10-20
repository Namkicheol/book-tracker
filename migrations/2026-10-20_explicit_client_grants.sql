-- Explicit Data API grants for new-project/reset environments.
-- Row-level security still limits each signed-in user to their own rows.
begin;
grant usage on schema public to authenticated;
grant select, insert, update on public.users, public.books, public.folders to authenticated;
revoke all on public.users, public.books, public.folders from anon;
commit;
