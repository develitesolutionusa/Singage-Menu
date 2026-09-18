-- Rollback Layout Loops feature

-- Drop realtime publication entries (ignore if missing)
do $$
begin
  alter publication supabase_realtime drop table public.layout_zone_values;
exception when undefined_object then null;
when undefined_table then null;
end $$;

do $$
begin
  alter publication supabase_realtime drop table public.layout_loops;
exception when undefined_object then null;
when undefined_table then null;
end $$;

do $$
begin
  alter publication supabase_realtime drop table public.layout_templates;
exception when undefined_object then null;
when undefined_table then null;
end $$;

-- Restore campaign_loops to media-only
delete from public.campaign_loops where loop_type = 'layout' or layout_loop_id is not null;

drop index if exists public.campaign_loops_campaign_layout_uidx;
drop index if exists public.campaign_loops_campaign_media_uidx;

alter table public.campaign_loops
  drop constraint if exists campaign_loops_ref_check;

alter table public.campaign_loops
  drop constraint if exists campaign_loops_loop_type_check;

alter table public.campaign_loops
  drop column if exists layout_loop_id;

alter table public.campaign_loops
  drop column if exists loop_type;

-- Ensure loop_id is required again
delete from public.campaign_loops where loop_id is null;

alter table public.campaign_loops
  alter column loop_id set not null;

alter table public.campaign_loops
  drop constraint if exists campaign_loops_campaign_id_loop_id_key;

alter table public.campaign_loops
  add constraint campaign_loops_campaign_id_loop_id_key unique (campaign_id, loop_id);

-- Drop layout tables
drop table if exists public.layout_zone_values cascade;
drop table if exists public.layout_loops cascade;
drop table if exists public.layout_templates cascade;
