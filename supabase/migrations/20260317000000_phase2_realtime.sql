-- Phase 2: allow player devices (anon) to read playback data + enable Realtime
-- Player UUID is the device capability for Phase 2 (device tokens can tighten this in Phase 4).

-- Realtime publication
do $$
begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.loops;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.loop_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.library_items;
exception when duplicate_object then null;
end $$;

-- Broaden SELECT so unpaired/paired player browsers can subscribe & refetch via Realtime
create policy "players_select_device"
  on public.players for select
  to anon, authenticated
  using (true);

create policy "loops_select_device"
  on public.loops for select
  to anon, authenticated
  using (true);

create policy "loop_items_select_device"
  on public.loop_items for select
  to anon, authenticated
  using (true);

create policy "library_items_select_device"
  on public.library_items for select
  to anon, authenticated
  using (true);
