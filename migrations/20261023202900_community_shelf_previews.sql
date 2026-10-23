-- Feed previews reuse the current visibility contract, exposing only book bibliography.
create or replace function library_private.library_feed(filter_city text default null, filter_district text default null)
returns table(owner_id uuid, nickname text, city text, district text, book_count bigint, books jsonb)
language sql stable security definer set search_path = '' as $$
 select l.owner_id,l.nickname,l.city,l.district,l.book_count,
   coalesce((select jsonb_agg(jsonb_build_object('isbn',p.isbn,'title',p.title,'authors',p.authors,'publisher',p.publisher,'thumbnail',p.thumbnail) order by p.created_at desc,p.id)
     from (select b.id,b.isbn,b.title,b.authors,b.publisher,b.thumbnail,b.created_at
       from public.books b where b.user_id=l.owner_id and b.deleted_at is null
       order by b.created_at desc,b.id limit 3) p),'[]'::jsonb)
 from library_private.list_libraries_v2(filter_city,filter_district) l
 where (select auth.uid()) is not null;
$$;
revoke all on function library_private.library_feed(text,text) from public,anon;
grant execute on function library_private.library_feed(text,text) to authenticated;
create or replace function public.list_public_library_feed(filter_city text default null,filter_district text default null)
returns table(owner_id uuid,nickname text,city text,district text,book_count bigint,books jsonb)
language sql stable security invoker set search_path = '' as $$
 select * from library_private.library_feed(filter_city,filter_district);
$$;
revoke all on function public.list_public_library_feed(text,text) from public,anon;
grant execute on function public.list_public_library_feed(text,text) to authenticated;
