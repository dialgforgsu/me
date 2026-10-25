-- Run in the Supabase SQL editor of the project that should own the site's
-- visitor counter (a site-only project, or "gsu-personal-dashboard"), so the
-- site's public key no longer sits in the redgate-tools-dashboard project.
-- Then follow supabase/README.md to point utils.js at it.

begin;

create table if not exists public.page_views (
  id    text primary key,
  count bigint not null default 0
);
-- RLS on with no policies: the table is reachable only through the functions below.
alter table public.page_views enable row level security;
revoke all on public.page_views from anon, authenticated;

-- Carry the existing count over. Update the number to the live value
-- (select count from page_views where id = 'me-site' in the old project).
insert into public.page_views (id, count) values ('me-site', 510)
on conflict (id) do nothing;

create or replace function public.increment_page_views_for(page_id text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_count bigint;
begin
  -- Only updates existing rows, so callers can't create arbitrary counters.
  update public.page_views set count = count + 1 where id = page_id
  returning count into new_count;
  return new_count;
end; $$;

create or replace function public.get_page_views(page_id text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare current_count bigint;
begin
  select count into current_count from public.page_views where id = page_id;
  return current_count;
end; $$;

revoke execute on function public.increment_page_views_for(text) from public;
revoke execute on function public.get_page_views(text) from public;
grant execute on function public.increment_page_views_for(text) to anon;
grant execute on function public.get_page_views(text) to anon;

commit;
