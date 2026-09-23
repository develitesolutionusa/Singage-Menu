import {
  getElements,
  type DesignElement,
} from "@/lib/design-elements";
import {
  applyContentValues,
  getContentValues,
} from "@/lib/smart-templates";
import type { TemplatePermissionSet } from "@/lib/template-permissions";
import type { DesignData } from "@/types/db";

export type DesignAuthResult =
  | { ok: true; data: DesignData }
  | { ok: false; error: string; permission: keyof TemplatePermissionSet };

const STRUCTURAL_KEYS = [
  "id",
  "type",
  "name",
  "x",
  "y",
  "width",
  "height",
  "rotation",
  "zIndex",
  "locked",
  "hidden",
] as const;

function structuralFingerprint(el: DesignElement): string {
  return STRUCTURAL_KEYS.map((k) => String(el[k])).join("|");
}

function hasStructuralChange(
  previous: DesignData | null | undefined,
  next: DesignData,
): boolean {
  const prevEls = getElements(previous);
  const nextEls = getElements(next);
  if (prevEls.length !== nextEls.length) return true;

  const prevMap = new Map(prevEls.map((el) => [el.id, el]));
  for (const el of nextEls) {
    const prev = prevMap.get(el.id);
    if (!prev) return true;
    if (structuralFingerprint(prev) !== structuralFingerprint(el)) return true;
  }

  if (previous?.layout !== next.layout) return true;
  if (JSON.stringify(previous?.theme ?? null) !== JSON.stringify(next.theme ?? null)) {
    return true;
  }
  if (
    JSON.stringify(previous?.editableFields ?? null) !==
    JSON.stringify(next.editableFields ?? null)
  ) {
    return true;
  }

  return false;
}

function hasStylePropChange(
  previous: DesignData | null | undefined,
  next: DesignData,
): boolean {
  const STYLE_PROP_KEYS = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "color",
    "background",
    "borderColor",
    "borderWidth",
    "borderRadius",
    "opacity",
    "shadow",
    "padding",
    "margin",
    "lineHeight",
    "letterSpacing",
    "align",
    "fit",
  ] as const;

  const prevMap = new Map(getElements(previous).map((el) => [el.id, el]));
  for (const el of getElements(next)) {
    const prev = prevMap.get(el.id);
    if (!prev) continue;
    for (const key of STYLE_PROP_KEYS) {
      if (prev.props[key] !== el.props[key]) return true;
    }
  }
  return false;
}

/**
 * Content-only merge: keep previous structure/styles, apply incoming contentValues
 * and content props (text, price, imageUrl, etc.) onto matching elements.
 */
function mergeContentOnly(
  previous: DesignData | null | undefined,
  incoming: DesignData,
): DesignData {
  const base: DesignData = {
    ...(previous ?? {}),
    smart: previous?.smart ?? incoming.smart,
    layoutLocked: previous?.layoutLocked ?? incoming.layoutLocked ?? true,
    layout: previous?.layout ?? incoming.layout,
    theme: previous?.theme ?? incoming.theme,
    editableFields: previous?.editableFields ?? incoming.editableFields,
    elements: getElements(previous).map((el) => {
      const nextEl = getElements(incoming).find((n) => n.id === el.id);
      if (!nextEl) return el;
      return {
        ...el,
        props: {
          ...el.props,
          // Content props only
          text: nextEl.props.text ?? el.props.text,
          label: nextEl.props.label ?? el.props.label,
          price: nextEl.props.price ?? el.props.price,
          description: nextEl.props.description ?? el.props.description,
          category: nextEl.props.category ?? el.props.category,
          cta: nextEl.props.cta ?? el.props.cta,
          imageUrl: nextEl.props.imageUrl ?? el.props.imageUrl,
          alt: nextEl.props.alt ?? el.props.alt,
          url: nextEl.props.url ?? el.props.url,
          action: nextEl.props.action ?? el.props.action,
          featured: nextEl.props.featured ?? el.props.featured,
          dataSource: nextEl.props.dataSource ?? el.props.dataSource,
          field: nextEl.props.field ?? el.props.field,
          fallback: nextEl.props.fallback ?? el.props.fallback,
          name: nextEl.props.name ?? el.props.name,
          fit: nextEl.props.fit ?? el.props.fit,
        },
      };
    }),
  };

  const values = {
    ...getContentValues(previous),
    ...getContentValues(incoming),
  };

  return applyContentValues(
    {
      ...base,
      contentValues: values,
    },
    values,
  );
}

/**
 * Authorize a design_data / content_data write against Clerk-mapped template permissions.
 * Members (edit_content) may only change content while layout stays locked.
 * Admins (unlock_layout + edit_design) may unlock and mutate structure.
 */
export function authorizeDesignDataUpdate(
  previous: DesignData | null | undefined,
  incoming: DesignData,
  permissions: TemplatePermissionSet,
): DesignAuthResult {
  const prevLocked = previous?.layoutLocked === true;
  const nextLocked = incoming.layoutLocked === true;

  if (prevLocked && !nextLocked && !permissions.unlock_layout) {
    return {
      ok: false,
      error: "You do not have permission to unlock layout.",
      permission: "unlock_layout",
    };
  }

  const structural = hasStructuralChange(previous, incoming);
  const styleChange = hasStylePropChange(previous, incoming);
  const unlocking = prevLocked && !nextLocked;
  const designMutation = structural || styleChange || unlocking || (!nextLocked && structural);

  if (designMutation && !permissions.edit_design && !permissions.unlock_layout) {
    if (!permissions.edit_content) {
      return {
        ok: false,
        error: "You do not have permission to edit this design.",
        permission: "edit_content",
      };
    }
    // Strip structural / unlock attempts → content-only save
    return { ok: true, data: mergeContentOnly(previous, incoming) };
  }

  if ((structural || styleChange) && nextLocked && !permissions.edit_design) {
    if (!permissions.edit_content) {
      return {
        ok: false,
        error: "You do not have permission to edit content.",
        permission: "edit_content",
      };
    }
    return { ok: true, data: mergeContentOnly(previous, incoming) };
  }

  if (!permissions.edit_content && !permissions.edit_design) {
    return {
      ok: false,
      error: "You do not have permission to edit this slide.",
      permission: "edit_content",
    };
  }

  // Full design editors may write the payload as-is
  if (permissions.edit_design || permissions.unlock_layout) {
    return { ok: true, data: incoming };
  }

  // Content editors: always content-only merge, keep prior lock state
  return { ok: true, data: mergeContentOnly(previous, incoming) };
}
