-- Layout Loops: templates, zone values, campaign_loops discriminator

-- ---------------------------------------------------------------------------
-- layout_templates (system defaults: clerk_org_id IS NULL)
-- ---------------------------------------------------------------------------
create table public.layout_templates (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text,
  name text not null,
  thumbnail_url text,
  zones_config jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index layout_templates_org_idx on public.layout_templates (clerk_org_id);

create trigger layout_templates_updated_at
before update on public.layout_templates
for each row execute function public.set_updated_at();

alter table public.layout_templates enable row level security;

-- System templates (null org) visible to everyone; org templates scoped
create policy "layout_templates_select"
  on public.layout_templates for select
  using (
    clerk_org_id is null
    or clerk_org_id = public.current_clerk_org_id()
  );

create policy "layout_templates_insert_org"
  on public.layout_templates for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "layout_templates_update_org"
  on public.layout_templates for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "layout_templates_delete_org"
  on public.layout_templates for delete
  using (clerk_org_id = public.current_clerk_org_id());

create policy "layout_templates_select_device"
  on public.layout_templates for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- layout_loops
-- ---------------------------------------------------------------------------
create table public.layout_loops (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  name text not null,
  template_id uuid not null references public.layout_templates (id) on delete restrict,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index layout_loops_org_idx on public.layout_loops (clerk_org_id);
create index layout_loops_template_idx on public.layout_loops (template_id);

create trigger layout_loops_updated_at
before update on public.layout_loops
for each row execute function public.set_updated_at();

alter table public.layout_loops enable row level security;

create policy "layout_loops_select_org"
  on public.layout_loops for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "layout_loops_insert_org"
  on public.layout_loops for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "layout_loops_update_org"
  on public.layout_loops for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "layout_loops_delete_org"
  on public.layout_loops for delete
  using (clerk_org_id = public.current_clerk_org_id());

create policy "layout_loops_select_device"
  on public.layout_loops for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- layout_zone_values
-- ---------------------------------------------------------------------------
create table public.layout_zone_values (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  layout_loop_id uuid not null references public.layout_loops (id) on delete cascade,
  zone_key text not null,
  value_type text not null check (value_type in ('text', 'image', 'video')),
  value text not null default '',
  updated_at timestamptz not null default now(),
  unique (layout_loop_id, zone_key)
);

create index layout_zone_values_loop_idx on public.layout_zone_values (layout_loop_id);
create index layout_zone_values_org_idx on public.layout_zone_values (clerk_org_id);

create trigger layout_zone_values_updated_at
before update on public.layout_zone_values
for each row execute function public.set_updated_at();

alter table public.layout_zone_values enable row level security;

create policy "layout_zone_values_select_org"
  on public.layout_zone_values for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "layout_zone_values_insert_org"
  on public.layout_zone_values for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "layout_zone_values_update_org"
  on public.layout_zone_values for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "layout_zone_values_delete_org"
  on public.layout_zone_values for delete
  using (clerk_org_id = public.current_clerk_org_id());

create policy "layout_zone_values_select_device"
  on public.layout_zone_values for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- campaign_loops: accept media OR layout loop
-- ---------------------------------------------------------------------------
alter table public.campaign_loops
  alter column loop_id drop not null;

alter table public.campaign_loops
  add column if not exists layout_loop_id uuid references public.layout_loops (id) on delete cascade,
  add column if not exists loop_type text not null default 'media';

alter table public.campaign_loops
  drop constraint if exists campaign_loops_campaign_id_loop_id_key;

alter table public.campaign_loops
  drop constraint if exists campaign_loops_loop_type_check;

alter table public.campaign_loops
  add constraint campaign_loops_loop_type_check
  check (loop_type in ('media', 'layout'));

alter table public.campaign_loops
  drop constraint if exists campaign_loops_ref_check;

alter table public.campaign_loops
  add constraint campaign_loops_ref_check
  check (
    (loop_type = 'media' and loop_id is not null and layout_loop_id is null)
    or (loop_type = 'layout' and layout_loop_id is not null and loop_id is null)
  );

create unique index if not exists campaign_loops_campaign_media_uidx
  on public.campaign_loops (campaign_id, loop_id)
  where loop_id is not null;

create unique index if not exists campaign_loops_campaign_layout_uidx
  on public.campaign_loops (campaign_id, layout_loop_id)
  where layout_loop_id is not null;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.layout_templates;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.layout_loops;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.layout_zone_values;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Seed system templates (clerk_org_id null)
-- Position/size are percentages of a 100×100 canvas.
-- ---------------------------------------------------------------------------
insert into public.layout_templates (id, clerk_org_id, name, thumbnail_url, zones_config)
values
(
  'a1000000-0000-4000-8000-000000000001',
  null,
  'Classic menu',
  null,
  '[
    {"zone_key":"header","label":"Header","type":"text","multiline":false,"position":{"x":0,"y":0},"size":{"w":100,"h":12}},
    {"zone_key":"category_1_title","label":"Category 1 title","type":"text","multiline":false,"position":{"x":2,"y":14},"size":{"w":46,"h":8}},
    {"zone_key":"category_1_items","label":"Category 1 items","type":"text","multiline":true,"position":{"x":2,"y":24},"size":{"w":46,"h":48}},
    {"zone_key":"category_2_title","label":"Category 2 title","type":"text","multiline":false,"position":{"x":52,"y":14},"size":{"w":46,"h":8}},
    {"zone_key":"category_2_items","label":"Category 2 items","type":"text","multiline":true,"position":{"x":52,"y":24},"size":{"w":46,"h":48}},
    {"zone_key":"promo_banner","label":"Promo banner","type":"video","multiline":false,"position":{"x":0,"y":76},"size":{"w":100,"h":24}}
  ]'::jsonb
),
(
  'a1000000-0000-4000-8000-000000000002',
  null,
  'Featured dish',
  null,
  '[
    {"zone_key":"header","label":"Header","type":"text","multiline":false,"position":{"x":0,"y":0},"size":{"w":100,"h":12}},
    {"zone_key":"hero_image","label":"Hero image","type":"image","multiline":false,"position":{"x":2,"y":16},"size":{"w":55,"h":70}},
    {"zone_key":"hero_caption","label":"Hero caption","type":"text","multiline":false,"position":{"x":60,"y":16},"size":{"w":38,"h":12}},
    {"zone_key":"price_list","label":"Price list","type":"text","multiline":true,"position":{"x":60,"y":30},"size":{"w":38,"h":56}}
  ]'::jsonb
)
on conflict (id) do nothing;
