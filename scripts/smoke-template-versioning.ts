/**
 * Smoke test for template version merge/preview (Step 13).
 * Run: npx tsx scripts/smoke-template-versioning.ts
 */
import {
  buildTemplateVersionPreview,
  buildTemplateVersionStatus,
  mergeTemplateUpdate,
} from "../lib/template-versioning";
import type { DesignData, LoopItem, Template } from "../types/db";

const masterDesign = {
  smart: true,
  layoutLocked: true,
  layout: "split",
  theme: { bg: "#111", accent: "#0f0", text: "#fff", muted: "#888", panel: "#222" },
  editableFields: [
    {
      id: "title",
      label: "Title",
      kind: "title",
      bindings: [],
      defaultValue: "New Title",
    },
    {
      id: "price",
      label: "Price",
      kind: "price",
      bindings: [],
      defaultValue: "9.99",
    },
    {
      id: "extra",
      label: "Extra",
      kind: "text",
      bindings: [],
      defaultValue: "Extra",
    },
  ],
  contentValues: { title: "New Title", price: "9.99", extra: "Extra" },
  elements: [],
} as unknown as DesignData;

const instanceDesign = {
  smart: true,
  layoutLocked: true,
  layout: "classic",
  theme: { bg: "#000", accent: "#f00", text: "#fff", muted: "#666", panel: "#111" },
  editableFields: [
    {
      id: "title",
      label: "Title",
      kind: "title",
      bindings: [],
      defaultValue: "Old Title",
    },
    {
      id: "price",
      label: "Price",
      kind: "price",
      bindings: [],
      defaultValue: "5.00",
    },
    {
      id: "gone",
      label: "Gone",
      kind: "text",
      bindings: [],
      defaultValue: "x",
    },
  ],
  contentValues: { title: "User Cafe", price: "12.50", gone: "bye" },
  elements: [],
} as unknown as DesignData;

const master = {
  id: "t1",
  name: "Menu",
  version: 2,
  design_data: masterDesign,
} as Pick<Template, "id" | "name" | "version" | "design_data">;

const item = {
  item_type: "design",
  source_template_id: "t1",
  template_version: 1,
  slide_name: "Menu",
  overrides: {},
  content_data: instanceDesign,
  design_data: null,
} as Pick<
  LoopItem,
  | "item_type"
  | "source_template_id"
  | "template_version"
  | "overrides"
  | "content_data"
  | "design_data"
  | "slide_name"
>;

const status = buildTemplateVersionStatus({ item, master });
if (!status.needsAttention) throw new Error("expected needsAttention");

const preview = buildTemplateVersionPreview({ item, master });
const preservedIds = preview.preservedOverrides.map((p) => p.id).sort();
if (preservedIds.join(",") !== "price,title") {
  throw new Error(`unexpected preserved: ${preservedIds.join(",")}`);
}

const merged = mergeTemplateUpdate({ item, master });
if (merged.templateVersion !== 2) throw new Error("version not bumped");
const values = (merged.contentData.contentValues ?? {}) as Record<
  string,
  string | undefined
>;
if (values.title !== "User Cafe" || values.price !== "12.50") {
  throw new Error(`overrides not preserved: ${JSON.stringify(values)}`);
}
if (values.extra !== "Extra") {
  throw new Error("new master default missing");
}
if (values.gone != null) {
  throw new Error("removed field should not remain");
}

console.log("ok", {
  changes: preview.changes.length,
  preserved: merged.preservedCount,
  values,
});
