-- Phase 3: Campaigns + exceptions; players.campaign_id replaces loop_id usage

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_org_idx on public.campaigns (clerk_org_id);
create index campaigns_name_idx on public.campaigns (clerk_org_id, name);

create trigger campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;

create policy "campaigns_select_org"
  on public.campaigns for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "campaigns_insert_org"
  on public.campaigns for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "campaigns_update_org"
  on public.campaigns for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "campaigns_delete_org"
  on public.campaigns for delete
  using (clerk_org_id = public.current_clerk_org_id());

-- Device realtime / refetch
create policy "campaigns_select_device"
  on public.campaigns for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- campaign_loops (ordered many-to-many; position 0 = main loop)
-- ---------------------------------------------------------------------------
create table public.campaign_loops (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  loop_id uuid not null references public.loops (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, loop_id)
);

create index campaign_loops_campaign_idx
  on public.campaign_loops (campaign_id, position);
create index campaign_loops_org_idx on public.campaign_loops (clerk_org_id);

alter table public.campaign_loops enable row level security;

create policy "campaign_loops_select_org"
  on public.campaign_loops for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_loops_insert_org"
  on public.campaign_loops for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_loops_update_org"
  on public.campaign_loops for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_loops_delete_org"
  on public.campaign_loops for delete
  using (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_loops_select_device"
  on public.campaign_loops for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- campaign_players
-- ---------------------------------------------------------------------------
create table public.campaign_players (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, player_id)
);

create index campaign_players_campaign_idx on public.campaign_players (campaign_id);
create index campaign_players_player_idx on public.campaign_players (player_id);
create index campaign_players_org_idx on public.campaign_players (clerk_org_id);

alter table public.campaign_players enable row level security;

create policy "campaign_players_select_org"
  on public.campaign_players for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_players_insert_org"
  on public.campaign_players for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_players_update_org"
  on public.campaign_players for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_players_delete_org"
  on public.campaign_players for delete
  using (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_players_select_device"
  on public.campaign_players for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- campaign_exceptions (core — date range and/or day-of-week → override loop)
-- ---------------------------------------------------------------------------
create table public.campaign_exceptions (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null default 'Exception',
  override_loop_id uuid not null references public.loops (id) on delete cascade,
  start_date date,
  end_date date,
  -- 0=Sunday … 6=Saturday (JS getDay). null/empty = every day in date range
  days_of_week integer[] ,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    start_date is null
    or end_date is null
    or start_date <= end_date
  )
);

create index campaign_exceptions_campaign_idx
  on public.campaign_exceptions (campaign_id);
create index campaign_exceptions_org_idx
  on public.campaign_exceptions (clerk_org_id);

create trigger campaign_exceptions_updated_at
before update on public.campaign_exceptions
for each row execute function public.set_updated_at();

alter table public.campaign_exceptions enable row level security;

create policy "campaign_exceptions_select_org"
  on public.campaign_exceptions for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_exceptions_insert_org"
  on public.campaign_exceptions for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_exceptions_update_org"
  on public.campaign_exceptions for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_exceptions_delete_org"
  on public.campaign_exceptions for delete
  using (clerk_org_id = public.current_clerk_org_id());

create policy "campaign_exceptions_select_device"
  on public.campaign_exceptions for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- players.campaign_id (replaces Phase-1 loop_id usage)
-- ---------------------------------------------------------------------------
alter table public.players
  add column if not exists campaign_id uuid references public.campaigns (id)
    on delete set null;

create index if not exists players_campaign_idx on public.players (campaign_id);

-- Keep loop_id column for backwards compatibility but stop using it in app.
-- Optionally clear assignments so orgs re-bind via campaigns:
-- (commented intentionally — do not wipe existing pilot data automatically)
-- update public.players set loop_id = null where campaign_id is null;

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.campaigns;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.campaign_loops;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.campaign_players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.campaign_exceptions;
exception when duplicate_object then null;
end $$;
