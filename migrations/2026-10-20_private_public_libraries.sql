-- Reviewed against live schema/policies on 2026-10-20 after project resume.
-- Legacy public/school settings are NOT consent to the new book-list sharing.
begin;
alter table public.users add column if not exists library_public boolean not null default false;
alter table public.users alter column privacy set default 'private';
update public.users set school = null, grade = null, region = null,
 privacy = case when library_public then 'public' else 'private' end;
-- Owner profiles remain private, including future columns.
drop policy if exists "users readable by self or matching scope" on public.users;
drop policy if exists "users can read own row" on public.users;
alter table public.users enable row level security;
create policy "users can read own row" on public.users for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "users can update own row" on public.users;
create policy "users can update own row" on public.users for update to authenticated
 using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop function if exists public.current_user_school();

-- Privileged projection lives outside the exposed public schema. Public wrappers
-- are invokers. Only authenticated callers can execute; every lookup requires opt-in.
create schema if not exists library_private;
revoke all on schema library_private from public, anon;
grant usage on schema library_private to authenticated;
-- Keep legacy columns for old clients, but do not persist their identifying values.
create or replace function library_private.scrub_profile_identifiers()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 new.school := null;
 new.grade := null;
 new.region := null;
 new.privacy := case when new.library_public then 'public' else 'private' end;
 return new;
end;
$$;
revoke all on function library_private.scrub_profile_identifiers() from public, anon, authenticated;
drop trigger if exists users_scrub_profile_identifiers on public.users;
create trigger users_scrub_profile_identifiers before insert or update on public.users
 for each row execute function library_private.scrub_profile_identifiers();

create or replace function library_private.list_libraries(filter_city text default null, filter_district text default null)
returns table(owner_id uuid, city text, district text, book_count bigint)
language sql stable security definer set search_path = '' as $$
 select u.id, u.city, u.district, count(b.id)
 from public.users u left join public.books b on b.user_id = u.id and b.deleted_at is null
 where (select auth.uid()) is not null and u.library_public = true
   and (filter_city is null or u.city = filter_city)
   and (filter_district is null or u.district = filter_district)
 group by u.id, u.city, u.district order by u.updated_at desc, u.id limit 50;
$$;
create or replace function library_private.library_books(owner uuid)
returns table(isbn text, title text, authors text[], publisher text, thumbnail text)
language sql stable security definer set search_path = '' as $$
 select b.isbn, b.title, b.authors, b.publisher, b.thumbnail
 from public.books b join public.users u on u.id = b.user_id
 where (select auth.uid()) is not null and u.id = owner and u.library_public = true and b.deleted_at is null
 order by b.created_at desc, b.id limit 200;
$$;
revoke all on function library_private.list_libraries(text,text) from public, anon;
revoke all on function library_private.library_books(uuid) from public, anon;
grant execute on function library_private.list_libraries(text,text) to authenticated;
grant execute on function library_private.library_books(uuid) to authenticated;
create or replace function public.list_public_libraries(filter_city text default null, filter_district text default null)
returns table(owner_id uuid, city text, district text, book_count bigint)
language sql stable security invoker set search_path = '' as $$
 select * from library_private.list_libraries(filter_city, filter_district);
$$;
create or replace function public.get_public_library_books(owner uuid)
returns table(isbn text, title text, authors text[], publisher text, thumbnail text)
language sql stable security invoker set search_path = '' as $$
 select * from library_private.library_books(owner);
$$;
revoke all on function public.list_public_libraries(text,text) from public, anon;
revoke all on function public.get_public_library_books(uuid) from public, anon;
grant execute on function public.list_public_libraries(text,text) to authenticated;
grant execute on function public.get_public_library_books(uuid) to authenticated;
commit;
