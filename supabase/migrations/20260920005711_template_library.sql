-- Template Library: system templates, favorites, design slides on loops

-- ---------------------------------------------------------------------------
-- templates (system catalog when clerk_org_id IS NULL)
-- ---------------------------------------------------------------------------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text,
  name text not null,
  industry text not null,
  category text not null,
  tags text[] not null default '{}',
  orientation text not null default 'landscape'
    check (orientation in ('landscape', 'portrait')),
  default_duration_seconds numeric(10, 2) not null default 15,
  design_data jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint templates_industry_check check (
    industry in (
      'Restaurant & Food',
      'Retail',
      'Healthcare',
      'Education',
      'Hospitality',
      'Corporate',
      'Real Estate',
      'Fitness',
      'Automotive',
      'Custom'
    )
  )
);

create index templates_industry_idx on public.templates (industry);
create index templates_category_idx on public.templates (category);
create index templates_org_idx on public.templates (clerk_org_id);
create index templates_published_idx on public.templates (is_published, sort_order);

create trigger templates_updated_at
before update on public.templates
for each row execute function public.set_updated_at();

alter table public.templates enable row level security;

-- System templates visible to everyone; org templates scoped to org
create policy "templates_select"
  on public.templates for select
  using (
    (clerk_org_id is null and is_published = true)
    or clerk_org_id = public.current_clerk_org_id()
  );

create policy "templates_insert_org"
  on public.templates for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "templates_update_org"
  on public.templates for update
  using (clerk_org_id = public.current_clerk_org_id())
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "templates_delete_org"
  on public.templates for delete
  using (clerk_org_id = public.current_clerk_org_id());

-- ---------------------------------------------------------------------------
-- template_favorites (per user within an org)
-- ---------------------------------------------------------------------------
create table public.template_favorites (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  clerk_user_id text not null,
  template_id uuid not null references public.templates (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (clerk_org_id, clerk_user_id, template_id)
);

create index template_favorites_user_idx
  on public.template_favorites (clerk_org_id, clerk_user_id);
create index template_favorites_template_idx
  on public.template_favorites (template_id);

alter table public.template_favorites enable row level security;

create policy "template_favorites_select_org"
  on public.template_favorites for select
  using (clerk_org_id = public.current_clerk_org_id());

create policy "template_favorites_insert_org"
  on public.template_favorites for insert
  with check (clerk_org_id = public.current_clerk_org_id());

create policy "template_favorites_delete_org"
  on public.template_favorites for delete
  using (clerk_org_id = public.current_clerk_org_id());

-- ---------------------------------------------------------------------------
-- loop_items: support design slides from templates
-- ---------------------------------------------------------------------------
alter table public.loop_items
  alter column library_item_id drop not null;

alter table public.loop_items
  add column if not exists item_type text not null default 'media',
  add column if not exists source_template_id uuid references public.templates (id) on delete set null,
  add column if not exists design_data jsonb,
  add column if not exists slide_name text;

alter table public.loop_items
  drop constraint if exists loop_items_item_type_check;

alter table public.loop_items
  add constraint loop_items_item_type_check
  check (item_type in ('media', 'design'));

alter table public.loop_items
  drop constraint if exists loop_items_ref_check;

alter table public.loop_items
  add constraint loop_items_ref_check
  check (
    (item_type = 'media' and library_item_id is not null)
    or (item_type = 'design' and design_data is not null and slide_name is not null)
  );

create index loop_items_template_idx on public.loop_items (source_template_id)
  where source_template_id is not null;

-- ---------------------------------------------------------------------------
-- Seed Restaurant & Food starter templates
-- ---------------------------------------------------------------------------
insert into public.templates (
  id, clerk_org_id, name, industry, category, tags, orientation,
  default_duration_seconds, design_data, sort_order
) values
(
  'b1000000-0000-4000-8000-000000000001',
  null,
  'Restaurant Menu',
  'Restaurant & Food',
  'Menu',
  array['menu', 'board', 'dining'],
  'landscape',
  20,
  '{
    "layout": "menu-board",
    "theme": {"bg":"#1c1410","accent":"#d4a017","text":"#f7f1e8","muted":"#b8a990","panel":"#2a1f18"},
    "headline":"Tonight''s Menu",
    "subheadline":"Kitchen open · Fresh daily",
    "sections":[
      {"title":"Starters","items":[{"name":"Soup of the Day","price":"$8"},{"name":"House Salad","price":"$10"},{"name":"Calamari","price":"$14"}]},
      {"title":"Mains","items":[{"name":"Grilled Salmon","price":"$28"},{"name":"Ribeye Steak","price":"$36"},{"name":"Pasta Primavera","price":"$22"}]}
    ]
  }'::jsonb,
  1
),
(
  'b1000000-0000-4000-8000-000000000002',
  null,
  'Food Promotion',
  'Restaurant & Food',
  'Promotion',
  array['promo', 'sale', 'marketing'],
  'landscape',
  12,
  '{
    "layout": "promo-hero",
    "theme": {"bg":"#0f172a","accent":"#ef4444","text":"#ffffff","muted":"#94a3b8","panel":"#1e293b"},
    "badge":"LIMITED TIME",
    "headline":"50% Off Appetizers",
    "subheadline":"Every weekday before 6 PM",
    "cta":"Ask your server",
    "price":"From $6"
  }'::jsonb,
  2
),
(
  'b1000000-0000-4000-8000-000000000003',
  null,
  'Daily Special',
  'Restaurant & Food',
  'Special',
  array['daily', 'chef', 'special'],
  'landscape',
  15,
  '{
    "layout": "special-split",
    "theme": {"bg":"#111827","accent":"#34d399","text":"#f9fafb","muted":"#9ca3af","panel":"#1f2937"},
    "badge":"TODAY ONLY",
    "headline":"Chef''s Daily Special",
    "subheadline":"Pan-seared duck breast with cherry reduction",
    "price":"$29",
    "body":"Served with roasted vegetables & potato puree"
  }'::jsonb,
  3
),
(
  'b1000000-0000-4000-8000-000000000004',
  null,
  'Happy Hour',
  'Restaurant & Food',
  'Promotion',
  array['drinks', 'bar', 'happy-hour'],
  'landscape',
  12,
  '{
    "layout": "happy-hour",
    "theme": {"bg":"#1a0b2e","accent":"#f472b6","text":"#fdf4ff","muted":"#d8b4fe","panel":"#2e1065"},
    "badge":"HAPPY HOUR",
    "headline":"Half-Price Cocktails",
    "subheadline":"Mon–Fri · 4:00–7:00 PM",
    "items":[
      {"name":"House Margarita","price":"$6"},
      {"name":"Old Fashioned","price":"$7"},
      {"name":"Draft Beer","price":"$4"}
    ]
  }'::jsonb,
  4
),
(
  'b1000000-0000-4000-8000-000000000005',
  null,
  'Breakfast Menu',
  'Restaurant & Food',
  'Menu',
  array['breakfast', 'morning', 'brunch'],
  'landscape',
  18,
  '{
    "layout": "menu-board",
    "theme": {"bg":"#fff7ed","accent":"#ea580c","text":"#431407","muted":"#9a3412","panel":"#ffedd5"},
    "headline":"Breakfast All Day",
    "subheadline":"Served until 11:30 AM",
    "sections":[
      {"title":"Classics","items":[{"name":"Eggs Benedict","price":"$14"},{"name":"Avocado Toast","price":"$12"},{"name":"Buttermilk Pancakes","price":"$11"}]},
      {"title":"Sides","items":[{"name":"Bacon","price":"$4"},{"name":"Fruit Bowl","price":"$5"},{"name":"Hash Browns","price":"$3"}]}
    ]
  }'::jsonb,
  5
),
(
  'b1000000-0000-4000-8000-000000000006',
  null,
  'Seasonal Offer',
  'Restaurant & Food',
  'Offer',
  array['seasonal', 'limited', 'autumn'],
  'landscape',
  14,
  '{
    "layout": "promo-hero",
    "theme": {"bg":"#292524","accent":"#f97316","text":"#fafaf9","muted":"#a8a29e","panel":"#44403c"},
    "badge":"SEASONAL",
    "headline":"Autumn Harvest Bowl",
    "subheadline":"Roasted squash · Farro · Maple vinaigrette",
    "cta":"Available through November",
    "price":"$16"
  }'::jsonb,
  6
),
(
  'b1000000-0000-4000-8000-000000000007',
  null,
  'Lunch Deal',
  'Restaurant & Food',
  'Deal',
  array['lunch', 'value', 'combo'],
  'landscape',
  12,
  '{
    "layout": "deal-card",
    "theme": {"bg":"#ecfdf5","accent":"#059669","text":"#064e3b","muted":"#047857","panel":"#d1fae5"},
    "badge":"LUNCH DEAL",
    "headline":"Soup + Sandwich",
    "subheadline":"Weekdays 11 AM – 3 PM",
    "price":"$12.95",
    "body":"Includes a soft drink or iced tea"
  }'::jsonb,
  7
),
(
  'b1000000-0000-4000-8000-000000000008',
  null,
  'New Item',
  'Restaurant & Food',
  'Feature',
  array['new', 'launch', 'feature'],
  'landscape',
  10,
  '{
    "layout": "new-item",
    "theme": {"bg":"#0c0a09","accent":"#fbbf24","text":"#fafaf9","muted":"#a8a29e","panel":"#1c1917"},
    "badge":"JUST ADDED",
    "headline":"Truffle Mushroom Flatbread",
    "subheadline":"Fontina · Wild mushrooms · Fresh thyme",
    "price":"$18",
    "cta":"Try it tonight"
  }'::jsonb,
  8
),
(
  'b1000000-0000-4000-8000-000000000009',
  null,
  'Combo Promotion',
  'Restaurant & Food',
  'Combo',
  array['combo', 'family', 'value'],
  'landscape',
  12,
  '{
    "layout": "combo",
    "theme": {"bg":"#1e1b4b","accent":"#818cf8","text":"#eef2ff","muted":"#a5b4fc","panel":"#312e81"},
    "badge":"FAMILY COMBO",
    "headline":"Feed the Table",
    "subheadline":"2 pizzas · Large salad · Soft drinks",
    "price":"$39.99",
    "body":"Serves 3–4 · Dine-in or takeout"
  }'::jsonb,
  9
)
on conflict (id) do nothing;
