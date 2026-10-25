-- Run in the Supabase SQL editor for project "redgate-tools-dashboard"
-- (zezigpysakremuredzwj), the project the site's visitor counter uses today.
-- Fixes: anyone with the public anon key could read every comment's owner
-- token and then edit/delete any comment, and could spam inserts.
--
-- IMPORTANT for the app that uses the `comments` table:
--   * Read comments with explicit columns, e.g. select=id,name,body,created_at
--     (select=* will now fail for anon).
--   * Generate the owner token client-side (crypto.randomUUID()), send it in the
--     insert body, and keep it locally; don't read it back from the insert response.
-- Rollback for section 1: grant select on public.comments to anon, authenticated;

begin;

-- 1) Stop exposing comment owner tokens through the public API.
revoke select, truncate, references, trigger on public.comments from anon, authenticated;
grant select (id, name, body, created_at) on public.comments to anon, authenticated;

-- 2) Basic abuse limits on public inserts.
alter table public.comments
  add constraint comments_name_len check (char_length(name) between 1 and 80),
  add constraint comments_body_len check (char_length(body) between 1 and 2000);

create or replace function public.comments_throttle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.comments
      where created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Too many comments, try again shortly' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.comments_throttle() from public, anon, authenticated;

drop trigger if exists comments_throttle on public.comments;
create trigger comments_throttle before insert on public.comments
  for each row execute function public.comments_throttle();

-- 3) Pin search_path on the counter functions (Supabase lint 0011).
--    They stay callable by anon on purpose: they back public view counters.
create or replace function public.increment_page_views()
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_count bigint;
begin
  update public.page_views set count = count + 1 where id = 'dashboard'
  returning count into new_count;
  return new_count;
end; $$;

create or replace function public.increment_page_views_for(page_id text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_count bigint;
begin
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

commit;
