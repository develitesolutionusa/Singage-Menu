-- Phase 1 core schema: library, loops, players, activity, announcements
-- All tenant tables include clerk_org_id + RLS

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_clerk_org_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'org_id', ''),
    nullif(auth.jwt() ->> 'o', '')
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- library_folders
-- ---------------------------------------------------------------------------
create table public.library_folders (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  name text not null,
  parent_id uuid references public.library_folders (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index library_folders_org_idx on public.library_folders (clerk_org_id);
create index library_folders_parent_idx on public.library_folders (parent_id);

create trigger library_folders_updated_at
before update on public.library_folders
for each row execute function public.set_updated_at();

alter table public.library_folders enable row level security;

create policy "library_folders_select_org"
  on public.library_folders for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "library_folders_insert_org"
  on public.library_folders for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "library_folders_update_org"
  on public.library_folders for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "library_folders_delete_org"
  on public.library_folders for delete
  using (clerk_org_id = public.current_clerk_org_id());

-- ---------------------------------------------------------------------------
-- library_items
-- ---------------------------------------------------------------------------
create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  folder_id uuid references public.library_folders (id) on delete set null,
  name text not null,
  mime_type text not null,
  file_type text not null check (file_type in ('image', 'video')),
  storage_path text not null,
  public_url text,
  size_bytes bigint not null default 0,
  duration_seconds numeric(10, 2),
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index library_items_org_idx on public.library_items (clerk_org_id);
create index library_items_folder_idx on public.library_items (folder_id);
create index library_items_name_idx on public.library_items (clerk_org_id, name);

create trigger library_items_updated_at
before update on public.library_items
for each row execute function public.set_updated_at();

alter table public.library_items enable row level security;

create policy "library_items_select_org"
  on public.library_items for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "library_items_insert_org"
  on public.library_items for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "library_items_update_org"
  on public.library_items for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "library_items_delete_org"
  on public.library_items for delete
  using (clerk_org_id = public.current_clerk_org_id());

-- ---------------------------------------------------------------------------
-- loops
-- ---------------------------------------------------------------------------
create table public.loops (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  name text not null,
  orientation text not null default 'landscape'
    check (orientation in ('landscape', 'portrait')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index loops_org_idx on public.loops (clerk_org_id);
create index loops_name_idx on public.loops (clerk_org_id, name);

create trigger loops_updated_at
before update on public.loops
for each row execute function public.set_updated_at();

alter table public.loops enable row level security;

create policy "loops_select_org"
  on public.loops for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "loops_insert_org"
  on public.loops for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "loops_update_org"
  on public.loops for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "loops_delete_org"
  on public.loops for delete
  using (clerk_org_id = public.current_clerk_org_id());

-- ---------------------------------------------------------------------------
-- loop_items
-- ---------------------------------------------------------------------------
create table public.loop_items (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  loop_id uuid not null references public.loops (id) on delete cascade,
  library_item_id uuid not null references public.library_items (id) on delete cascade,
  position integer not null default 0,
  duration_seconds numeric(10, 2) not null default 10,
  created_at timestamptz not null default now()
);

create index loop_items_loop_idx on public.loop_items (loop_id, position);
create index loop_items_org_idx on public.loop_items (clerk_org_id);

alter table public.loop_items enable row level security;

create policy "loop_items_select_org"
  on public.loop_items for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "loop_items_insert_org"
  on public.loop_items for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "loop_items_update_org"
  on public.loop_items for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "loop_items_delete_org"
  on public.loop_items for delete
  using (clerk_org_id = public.current_clerk_org_id());

-- ---------------------------------------------------------------------------
-- players (loop_id is Phase 1 shortcut; replaced by campaign_id in Phase 3)
-- ---------------------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text,
  name text not null default 'New Player',
  description text,
  location text,
  timezone text not null default 'UTC',
  rotation integer not null default 0 check (rotation in (0, 90, 180, 270)),
  loop_id uuid references public.loops (id) on delete set null,
  pairing_code text unique,
  status text not null default 'unpaired'
    check (status in ('unpaired', 'online', 'offline')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index players_org_idx on public.players (clerk_org_id);
create index players_pairing_code_idx on public.players (pairing_code)
  where pairing_code is not null;

create trigger players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

alter table public.players enable row level security;

-- Dashboard org members can manage their paired players
create policy "players_select_org"
  on public.players for select
  using (
    clerk_org_id = public.current_clerk_org_id()
    or clerk_org_id is null
  );

create policy "players_insert_org"
  on public.players for insert
  with check (
    clerk_org_id = public.current_clerk_org_id()
    or clerk_org_id is null
  );

create policy "players_update_org"
  on public.players for update
  using (
    clerk_org_id = public.current_clerk_org_id()
    or clerk_org_id is null
  )
  with check (
    clerk_org_id = public.current_clerk_org_id()
    or clerk_org_id is null
  );

create policy "players_delete_org"
  on public.players for delete
  using (clerk_org_id = public.current_clerk_org_id());

-- ---------------------------------------------------------------------------
-- activity_logs
-- ---------------------------------------------------------------------------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  actor_id text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_org_created_idx
  on public.activity_logs (clerk_org_id, created_at desc);

alter table public.activity_logs enable row level security;

create policy "activity_logs_select_org"
  on public.activity_logs for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "activity_logs_insert_org"
  on public.activity_logs for insert
  with check (clerk_org_id = public.current_clerk_org_id());

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text,
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index announcements_org_idx on public.announcements (clerk_org_id);
create index announcements_published_idx on public.announcements (published_at desc);

alter table public.announcements enable row level security;

create policy "announcements_select"
  on public.announcements for select
  using (
    clerk_org_id is null
    or clerk_org_id = public.current_clerk_org_id()
  );

create policy "announcements_insert_org"
  on public.announcements for insert
  with check (
    clerk_org_id is null
    or clerk_org_id = public.current_clerk_org_id()
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for media library
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media_select_public"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "media_insert_authenticated"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = public.current_clerk_org_id()
  );

create policy "media_update_own_org"
  on storage.objects for update
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = public.current_clerk_org_id()
  );

create policy "media_delete_own_org"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = public.current_clerk_org_id()
  );
