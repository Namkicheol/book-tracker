-- Both the viewer and the owner must currently share their libraries.
-- Apply to legacy and current RPC paths; do not change member preferences.
create or replace function library_private.list_libraries(filter_city text default null, filter_district text default null)
returns table(owner_id uuid, city text, district text, book_count bigint)
language sql stable security definer set search_path = '' as $$
 select u.id, u.city, u.district, count(b.id)
 from public.users u left join public.books b on b.user_id = u.id and b.deleted_at is null
 where (select auth.uid()) is not null
   and exists (select 1 from public.users viewer where viewer.id = (select auth.uid()) and viewer.library_public = true)
   and u.library_public = true
   and (filter_city is null or u.city = filter_city)
   and (filter_district is null or u.district = filter_district)
 group by u.id, u.city, u.district order by u.updated_at desc, u.id limit 50;
$$;

create or replace function library_private.library_books(owner uuid)
returns table(isbn text, title text, authors text[], publisher text, thumbnail text)
language sql stable security definer set search_path = '' as $$
 select b.isbn, b.title, b.authors, b.publisher, b.thumbnail
 from public.books b join public.users u on u.id = b.user_id
 where (select auth.uid()) is not null
   and exists (select 1 from public.users viewer where viewer.id = (select auth.uid()) and viewer.library_public = true)
   and u.id = owner and u.library_public = true and b.deleted_at is null
 order by b.created_at desc, b.id limit 200;
$$;

create or replace function library_private.list_libraries_v2(filter_city text default null, filter_district text default null)
returns table(owner_id uuid, nickname text, city text, district text, book_count bigint)
language sql stable security definer set search_path = '' as $$
 select u.id, nullif(left(trim(u.public_nickname),20),''), u.city, u.district, count(b.id)
 from public.users u left join public.books b on b.user_id = u.id and b.deleted_at is null
 where (select auth.uid()) is not null
   and exists (select 1 from public.users viewer where viewer.id = (select auth.uid()) and viewer.library_public = true)
   and u.library_public = true
   and (filter_city is null or u.city = filter_city)
   and (filter_district is null or u.district = filter_district)
 group by u.id, u.public_nickname, u.city, u.district order by u.updated_at desc, u.id limit 50;
$$;
