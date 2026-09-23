-- Step 2: Connect Templates → Loop Slides (instance fields + template version)

-- ---------------------------------------------------------------------------
-- templates.version
-- ---------------------------------------------------------------------------
alter table public.templates
  add column if not exists version integer not null default 1;

update public.templates
set version = 1
where version is null;

-- ---------------------------------------------------------------------------
-- loop_items: template instance fields
-- ---------------------------------------------------------------------------
alter table public.loop_items
  add column if not exists template_version integer,
  add column if not exists content_data jsonb,
  add column if not exists overrides jsonb not null default '{}'::jsonb,
  add column if not exists publish_status text not null default 'draft';

-- Backfill content_data from design_data for existing design slides
update public.loop_items
set content_data = design_data
where item_type = 'design'
  and content_data is null
  and design_data is not null;

update public.loop_items li
set template_version = coalesce(t.version, 1)
from public.templates t
where li.source_template_id = t.id
  and li.item_type = 'design'
  and li.template_version is null;

alter table public.loop_items
  drop constraint if exists loop_items_publish_status_check;

alter table public.loop_items
  add constraint loop_items_publish_status_check
  check (publish_status in ('draft', 'saved', 'published'));

-- Design slides require instance content (content_data preferred; design_data kept for render compat)
alter table public.loop_items
  drop constraint if exists loop_items_ref_check;

alter table public.loop_items
  add constraint loop_items_ref_check
  check (
    (item_type = 'media' and library_item_id is not null)
    or (
      item_type = 'design'
      and slide_name is not null
      and (content_data is not null or design_data is not null)
    )
  );

create index if not exists loop_items_publish_status_idx
  on public.loop_items (clerk_org_id, publish_status);

create index if not exists loop_items_template_version_idx
  on public.loop_items (source_template_id, template_version)
  where source_template_id is not null;
