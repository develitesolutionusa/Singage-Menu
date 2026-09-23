import type { DesignData, Template } from "@/types/db";
import { ensureSmartDesign } from "@/lib/smart-templates";

/**
 * Build a loop slide insert payload from a template.
 * Template → Template Instance (loop_item) without duplicating master schema.
 */
export function buildTemplateSlideInsert(input: {
  orgId: string;
  loopId: string;
  template: Pick<
    Template,
    | "id"
    | "name"
    | "version"
    | "design_data"
    | "default_duration_seconds"
  >;
  position: number;
}) {
  const content = ensureSmartDesign(
    (input.template.design_data ?? {}) as DesignData,
    input.template.name,
  );
  return {
    clerk_org_id: input.orgId,
    loop_id: input.loopId,
    item_type: "design" as const,
    library_item_id: null,
    source_template_id: input.template.id,
    template_version: Number(input.template.version) || 1,
    design_data: content,
    content_data: content,
    overrides: {} as Record<string, unknown>,
    publish_status: "draft" as const,
    slide_name: input.template.name,
    position: input.position,
    duration_seconds: Number(input.template.default_duration_seconds) || 15,
  };
}

/** Prefer content_data, fall back to design_data for render. */
export function resolveSlideDesign(
  item: {
    content_data?: DesignData | null;
    design_data?: DesignData | null;
    slide_name?: string | null;
  },
): DesignData | null {
  const raw = item.content_data ?? item.design_data ?? null;
  if (!raw) return null;
  return ensureSmartDesign(raw, item.slide_name);
}
