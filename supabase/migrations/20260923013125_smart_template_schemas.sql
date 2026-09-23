-- Step 5: Smart Template schemas
-- Restaurant templates are upgraded to schema-driven Smart Templates
-- (elements + editableFields + contentValues + layoutLocked) via the app
-- helpers in lib/smart-templates.ts and persist scripts.
--
-- Runtime always hydrates via ensureSmartDesign(name) so existing rows
-- remain compatible until content is saved back from Use Template / editor.

-- Bump version so loop instances can detect template upgrades later (Step 13).
update public.templates
set version = greatest(coalesce(version, 1), 2),
    updated_at = now()
where clerk_org_id is null
  and industry = 'Restaurant & Food'
  and is_published = true;
