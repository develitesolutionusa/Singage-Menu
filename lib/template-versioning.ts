import { getElements } from "@/lib/design-elements";
import {
  applyContentValues,
  ensureSmartDesign,
  getContentValues,
  getEditableFields,
  isSmartTemplate,
} from "@/lib/smart-templates";
import type { DesignData, LoopItem, Template } from "@/types/db";

export type TemplateVersionChange = {
  kind: "field" | "element" | "layout" | "theme" | "meta";
  action: "added" | "removed" | "changed";
  label: string;
  detail?: string;
};

export type TemplateVersionStatus = {
  linked: boolean;
  detached: boolean;
  sourceTemplateId: string | null;
  templateName: string | null;
  instanceVersion: number | null;
  masterVersion: number | null;
  outdated: boolean;
  acknowledged: boolean;
  needsAttention: boolean;
};

export type TemplateVersionPreview = TemplateVersionStatus & {
  changes: TemplateVersionChange[];
  preservedOverrides: Array<{ id: string; label: string; value: string }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function getAcknowledgedMasterVersion(
  overrides: Record<string, unknown> | null | undefined,
): number | null {
  const raw = overrides?.acknowledged_master_version;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function withAcknowledgedMasterVersion(
  overrides: Record<string, unknown> | null | undefined,
  masterVersion: number,
): Record<string, unknown> {
  return {
    ...asRecord(overrides),
    acknowledged_master_version: masterVersion,
  };
}

export function clearAcknowledgedMasterVersion(
  overrides: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const next = { ...asRecord(overrides) };
  delete next.acknowledged_master_version;
  return next;
}

export function buildTemplateVersionStatus(input: {
  item: Pick<
    LoopItem,
    "item_type" | "source_template_id" | "template_version" | "overrides"
  >;
  master?: Pick<Template, "id" | "name" | "version"> | null;
}): TemplateVersionStatus {
  const { item, master } = input;
  const linked =
    item.item_type === "design" && Boolean(item.source_template_id);
  const instanceVersion =
    item.template_version != null ? Number(item.template_version) : null;
  const masterVersion = master ? Number(master.version) || 1 : null;
  const outdated =
    linked &&
    masterVersion != null &&
    (instanceVersion == null || masterVersion > instanceVersion);
  const acknowledged =
    outdated &&
    getAcknowledgedMasterVersion(item.overrides) === masterVersion;

  return {
    linked,
    detached: item.item_type === "design" && !item.source_template_id,
    sourceTemplateId: item.source_template_id,
    templateName: master?.name ?? null,
    instanceVersion,
    masterVersion,
    outdated: Boolean(outdated),
    acknowledged: Boolean(acknowledged),
    needsAttention: Boolean(outdated && !acknowledged),
  };
}

function fieldLabelMap(data: DesignData | null | undefined) {
  const map = new Map<string, string>();
  for (const field of getEditableFields(data)) {
    map.set(field.id, field.label);
  }
  return map;
}

/** Diff instance vs latest master template for the confirmation dialog. */
export function buildTemplateVersionPreview(input: {
  item: Pick<
    LoopItem,
    | "item_type"
    | "source_template_id"
    | "template_version"
    | "overrides"
    | "content_data"
    | "design_data"
    | "slide_name"
  >;
  master: Pick<Template, "id" | "name" | "version" | "design_data">;
}): TemplateVersionPreview {
  const status = buildTemplateVersionStatus({
    item: input.item,
    master: input.master,
  });

  const current = ensureSmartDesign(
    input.item.content_data ?? input.item.design_data,
    input.item.slide_name,
  );
  const latest = ensureSmartDesign(
    input.master.design_data,
    input.master.name,
  );

  const changes: TemplateVersionChange[] = [];
  const currentFields = getEditableFields(current);
  const latestFields = getEditableFields(latest);
  const currentFieldIds = new Set(currentFields.map((f) => f.id));
  const latestFieldIds = new Set(latestFields.map((f) => f.id));
  const currentById = new Map(currentFields.map((f) => [f.id, f]));
  const latestById = new Map(latestFields.map((f) => [f.id, f]));

  for (const field of latestFields) {
    if (!currentFieldIds.has(field.id)) {
      changes.push({
        kind: "field",
        action: "added",
        label: field.label,
        detail: `New content field (${field.kind})`,
      });
    } else {
      const prev = currentById.get(field.id)!;
      if (prev.defaultValue !== field.defaultValue) {
        changes.push({
          kind: "field",
          action: "changed",
          label: field.label,
          detail: `Default “${prev.defaultValue}” → “${field.defaultValue}”`,
        });
      }
    }
  }
  for (const field of currentFields) {
    if (!latestFieldIds.has(field.id)) {
      changes.push({
        kind: "field",
        action: "removed",
        label: field.label,
        detail: "Will no longer exist on the latest template",
      });
    }
  }

  const currentElements = getElements(current);
  const latestElements = getElements(latest);
  const currentElIds = new Set(currentElements.map((e) => e.id));
  const latestElIds = new Set(latestElements.map((e) => e.id));
  const currentElById = new Map(currentElements.map((e) => [e.id, e]));

  for (const el of latestElements) {
    if (!currentElIds.has(el.id)) {
      changes.push({
        kind: "element",
        action: "added",
        label: el.name || el.type,
        detail: `New ${el.type} layer`,
      });
    } else {
      const prev = currentElById.get(el.id)!;
      if (
        prev.x !== el.x ||
        prev.y !== el.y ||
        prev.width !== el.width ||
        prev.height !== el.height
      ) {
        changes.push({
          kind: "element",
          action: "changed",
          label: el.name || el.type,
          detail: "Position or size updated in master layout",
        });
      }
    }
  }
  for (const el of currentElements) {
    if (!latestElIds.has(el.id)) {
      changes.push({
        kind: "element",
        action: "removed",
        label: el.name || el.type,
        detail: "Removed from latest master layout",
      });
    }
  }

  if ((current.layout ?? "") !== (latest.layout ?? "")) {
    changes.push({
      kind: "layout",
      action: "changed",
      label: "Layout",
      detail: `${String(current.layout ?? "—")} → ${String(latest.layout ?? "—")}`,
    });
  }

  const themeKeys = ["bg", "accent", "text", "muted", "panel"] as const;
  const themeChanged = themeKeys.some(
    (key) => (current.theme?.[key] ?? "") !== (latest.theme?.[key] ?? ""),
  );
  if (themeChanged) {
    changes.push({
      kind: "theme",
      action: "changed",
      label: "Theme colors",
      detail: "Master template palette changed",
    });
  }

  if (
    status.instanceVersion != null &&
    status.masterVersion != null &&
    status.instanceVersion !== status.masterVersion
  ) {
    changes.unshift({
      kind: "meta",
      action: "changed",
      label: "Template version",
      detail: `v${status.instanceVersion} → v${status.masterVersion}`,
    });
  }

  const preservedOverrides = buildPreservedOverrides(current, latest).map(
    (row) => ({
      id: row.id,
      label: latestById.get(row.id)?.label ?? fieldLabelMap(current).get(row.id) ?? row.id,
      value: row.value,
    }),
  );

  return {
    ...status,
    changes,
    preservedOverrides,
  };
}

function buildPreservedOverrides(
  current: DesignData,
  latest: DesignData,
): Array<{ id: string; value: string }> {
  const currentValues = getContentValues(current);
  const latestFields = getEditableFields(latest);
  const latestDefaults = new Map(
    latestFields.map((f) => [f.id, f.defaultValue]),
  );
  const preserved: Array<{ id: string; value: string }> = [];

  for (const field of latestFields) {
    const value = currentValues[field.id];
    if (value == null || value === "") continue;
    // Keep any instance value that still maps to a field on the new template
    // (including values that match old defaults — safer for user content).
    if (latestDefaults.has(field.id)) {
      preserved.push({ id: field.id, value });
    }
  }

  return preserved;
}

/**
 * Merge latest master template with instance content overrides.
 * Never silently drops user field values that still exist on the new schema.
 */
export function mergeTemplateUpdate(input: {
  item: Pick<LoopItem, "content_data" | "design_data" | "slide_name" | "overrides">;
  master: Pick<Template, "name" | "version" | "design_data">;
}): {
  contentData: DesignData;
  designData: DesignData;
  templateVersion: number;
  overrides: Record<string, unknown>;
  preservedCount: number;
} {
  const current = ensureSmartDesign(
    input.item.content_data ?? input.item.design_data,
    input.item.slide_name,
  );
  const latest = ensureSmartDesign(input.master.design_data, input.master.name);
  const preserved = buildPreservedOverrides(current, latest);
  const mergedValues: Record<string, string> = {
    ...getContentValues(latest),
  };
  for (const row of preserved) {
    mergedValues[row.id] = row.value;
  }

  // Keep the instance layout-lock preference when present
  const withLock: DesignData = {
    ...latest,
    layoutLocked:
      typeof current.layoutLocked === "boolean"
        ? current.layoutLocked
        : latest.layoutLocked === true,
  };

  const merged = isSmartTemplate(withLock)
    ? applyContentValues(withLock, mergedValues)
    : { ...withLock, contentValues: mergedValues };

  const overrides = clearAcknowledgedMasterVersion(input.item.overrides);
  overrides.last_updated_from_version = Number(input.master.version) || 1;
  overrides.preserved_override_count = preserved.length;

  return {
    contentData: merged,
    designData: merged,
    templateVersion: Number(input.master.version) || 1,
    overrides,
    preservedCount: preserved.length,
  };
}

/** Detach slide from master template — keep current design content. */
export function buildDetachUpdate(input: {
  item: Pick<LoopItem, "content_data" | "design_data" | "overrides" | "slide_name">;
}): {
  contentData: DesignData;
  designData: DesignData;
  overrides: Record<string, unknown>;
} {
  const content = ensureSmartDesign(
    input.item.content_data ?? input.item.design_data,
    input.item.slide_name,
  );
  const overrides: Record<string, unknown> = {
    ...clearAcknowledgedMasterVersion(input.item.overrides),
    detached_at: new Date().toISOString(),
  };
  delete overrides.last_updated_from_version;

  return {
    contentData: content,
    designData: content,
    overrides,
  };
}
