-- Only names explicitly saved by the member are exposed; legacy OAuth names stay private.
alter table public.users add column if not exists public_nickname text;
create or replace function library_private.list_libraries_v2(filter_city text default null, filter_district text default null)
returns table(owner_id uuid, nickname text, city text, district text, book_count bigint)
language sql stable security definer set search_path = '' as $$
 select u.id, nullif(left(trim(u.public_nickname),20),''), u.city, u.district, count(b.id)
 from public.users u left join public.books b on b.user_id = u.id and b.deleted_at is null
 where (select auth.uid()) is not null and u.library_public = true
   and (filter_city is null or u.city = filter_city)
   and (filter_district is null or u.district = filter_district)
 group by u.id, u.public_nickname, u.city, u.district order by u.updated_at desc, u.id limit 50;
$$;
revoke all on function library_private.list_libraries_v2(text,text) from public, anon;
grant execute on function library_private.list_libraries_v2(text,text) to authenticated;
create or replace function public.list_public_libraries_v2(filter_city text default null, filter_district text default null)
returns table(owner_id uuid, nickname text, city text, district text, book_count bigint)
language sql stable security invoker set search_path = '' as $$
 select * from library_private.list_libraries_v2(filter_city, filter_district);
$$;
revoke all on function public.list_public_libraries_v2(text,text) from public, anon;
grant execute on function public.list_public_libraries_v2(text,text) to authenticated;
