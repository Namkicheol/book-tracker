-- Owners must receive deletion markers so another device cannot resurrect books.
-- Public-library RPCs still exclude deleted rows and expose no private metadata.
begin;
drop policy if exists "books select own" on public.books;
create policy "books select own" on public.books for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "folders select own" on public.folders;
create policy "folders select own" on public.folders for select to authenticated
  using ((select auth.uid()) = user_id);
commit;
