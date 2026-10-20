-- Offline retries must not replace a newer row (including a deletion marker).
begin;
create or replace function library_private.keep_newest_record()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.updated_at < old.updated_at
     or (new.updated_at = old.updated_at and old.deleted_at is not null and new.deleted_at is null) then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function library_private.keep_newest_record() from public, anon, authenticated;
drop trigger if exists books_keep_newest on public.books;
create trigger books_keep_newest before update on public.books
for each row execute function library_private.keep_newest_record();
drop trigger if exists folders_keep_newest on public.folders;
create trigger folders_keep_newest before update on public.folders
for each row execute function library_private.keep_newest_record();
commit;
