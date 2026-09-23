import {
  getArtboardSize,
  getElements,
  MIN_ELEMENT_SIZE,
  type DesignElement,
} from "@/lib/design-elements";
import {
  applyContentValues,
  getContentValues,
  getEditableFields,
  isSmartTemplate,
} from "@/lib/smart-templates";
import type { DesignData, Orientation } from "@/types/db";

export type PublishValidationIssue = {
  code:
    | "missing_design"
    | "empty_canvas"
    | "missing_slide_name"
    | "invalid_dimensions"
    | "missing_required_content"
    | "broken_image"
    | "invalid_dynamic_data"
    | "missing_template_data";
  message: string;
  elementId?: string;
  fieldId?: string;
};

export type PublishValidationResult = {
  ok: boolean;
  issues: PublishValidationIssue[];
};

function isBlank(value: unknown): boolean {
  return value == null || String(value).trim() === "";
}

function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:image/")) return true;
  if (trimmed.startsWith("/") || trimmed.startsWith("./")) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateElementDimensions(
  el: DesignElement,
  artboard: { width: number; height: number },
  issues: PublishValidationIssue[],
) {
  if (
    !Number.isFinite(el.width) ||
    !Number.isFinite(el.height) ||
    el.width < MIN_ELEMENT_SIZE ||
    el.height < MIN_ELEMENT_SIZE
  ) {
    issues.push({
      code: "invalid_dimensions",
      message: `“${el.name}” has invalid size (min ${MIN_ELEMENT_SIZE}px).`,
      elementId: el.id,
    });
  }

  if (
    !Number.isFinite(el.x) ||
    !Number.isFinite(el.y) ||
    el.x + el.width < 0 ||
    el.y + el.height < 0 ||
    el.x > artboard.width ||
    el.y > artboard.height
  ) {
    issues.push({
      code: "invalid_dimensions",
      message: `“${el.name}” is outside the artboard.`,
      elementId: el.id,
    });
  }
}

function validateElementContent(
  el: DesignElement,
  issues: PublishValidationIssue[],
) {
  if (el.hidden) return;

  switch (el.type) {
    case "text":
      if (isBlank(el.props.text)) {
        issues.push({
          code: "missing_required_content",
          message: `Text layer “${el.name}” is empty.`,
          elementId: el.id,
        });
      }
      break;
    case "image":
    case "logo":
    case "video": {
      const url = el.props.imageUrl ?? el.props.url ?? "";
      if (!isBlank(url) && !looksLikeUrl(String(url))) {
        issues.push({
          code: "broken_image",
          message: `“${el.name}” has an invalid media URL.`,
          elementId: el.id,
        });
      } else if (el.type === "logo" && isBlank(url)) {
        issues.push({
          code: "broken_image",
          message: `Logo “${el.name}” needs an image URL.`,
          elementId: el.id,
        });
      } else if (
        el.type === "video" &&
        isBlank(url) &&
        isBlank(el.props.background)
      ) {
        issues.push({
          code: "missing_required_content",
          message: `Video “${el.name}” needs a media URL.`,
          elementId: el.id,
        });
      }
      // Image blocks may be color/panel placeholders in Smart Templates (no URL yet).
      break;
    }
    case "menu-card":
    case "promotion-card":
      if (isBlank(el.props.name) && isBlank(el.props.text)) {
        issues.push({
          code: "missing_required_content",
          message: `“${el.name}” needs a name.`,
          elementId: el.id,
        });
      }
      if (el.type === "menu-card" && isBlank(el.props.price)) {
        issues.push({
          code: "missing_required_content",
          message: `“${el.name}” needs a price.`,
          elementId: el.id,
        });
      }
      if (
        !isBlank(el.props.imageUrl) &&
        !looksLikeUrl(String(el.props.imageUrl))
      ) {
        issues.push({
          code: "broken_image",
          message: `“${el.name}” has an invalid image URL.`,
          elementId: el.id,
        });
      }
      break;
    case "price-badge":
      if (isBlank(el.props.price) && isBlank(el.props.text)) {
        issues.push({
          code: "missing_required_content",
          message: `“${el.name}” needs a price.`,
          elementId: el.id,
        });
      }
      break;
    case "button":
      if (isBlank(el.props.label) && isBlank(el.props.cta) && isBlank(el.props.text)) {
        issues.push({
          code: "missing_required_content",
          message: `Button “${el.name}” needs a label.`,
          elementId: el.id,
        });
      }
      if (el.props.action === "link" || el.props.action === "deep-link") {
        if (isBlank(el.props.url)) {
          issues.push({
            code: "missing_required_content",
            message: `Button “${el.name}” needs a URL for its action.`,
            elementId: el.id,
          });
        }
      }
      break;
    case "dynamic-data":
      if (isBlank(el.props.dataSource) || isBlank(el.props.field)) {
        issues.push({
          code: "invalid_dynamic_data",
          message: `Dynamic layer “${el.name}” needs a data source and field.`,
          elementId: el.id,
        });
      }
      break;
    default:
      break;
  }
}

function validateSmartTemplate(
  data: DesignData,
  issues: PublishValidationIssue[],
) {
  if (!isSmartTemplate(data)) return;

  const fields = getEditableFields(data);
  if (fields.length === 0) {
    issues.push({
      code: "missing_template_data",
      message: "Smart template is missing editable field definitions.",
    });
    return;
  }

  const elements = getElements(data);
  const elementIds = new Set(elements.map((el) => el.id));
  const values = getContentValues(data);

  for (const field of fields) {
    if (!field.bindings.length) {
      issues.push({
        code: "missing_template_data",
        message: `Template field “${field.label}” has no element bindings.`,
        fieldId: field.id,
      });
      continue;
    }

    for (const binding of field.bindings) {
      if (!elementIds.has(binding.elementId)) {
        issues.push({
          code: "missing_template_data",
          message: `Template field “${field.label}” points to a missing element.`,
          fieldId: field.id,
          elementId: binding.elementId,
        });
      }
    }

    const value = values[field.id] ?? field.defaultValue ?? "";
    const requiredKinds = new Set([
      "title",
      "product",
      "price",
      "image",
      "logo",
      "cta",
    ]);
    if (!requiredKinds.has(field.kind)) continue;

    if (isBlank(value)) {
      issues.push({
        code: "missing_required_content",
        message: `Required field “${field.label}” is empty.`,
        fieldId: field.id,
      });
      continue;
    }

    if (
      (field.kind === "image" || field.kind === "logo") &&
      field.bindings.some(
        (b) => b.prop === "imageUrl" || b.prop === "url",
      ) &&
      !looksLikeUrl(String(value))
    ) {
      issues.push({
        code: "broken_image",
        message: `Field “${field.label}” has an invalid image URL.`,
        fieldId: field.id,
      });
    }
  }
}

/**
 * Synchronous publish validation for a design slide.
 * Call before persisting publish_status = "published".
 */
export function validateDesignForPublish(
  design: DesignData | null | undefined,
  options?: {
    orientation?: Orientation;
    slideName?: string | null;
  },
): PublishValidationResult {
  const issues: PublishValidationIssue[] = [];

  if (!design) {
    return {
      ok: false,
      issues: [
        {
          code: "missing_design",
          message: "Slide has no design data to publish.",
        },
      ],
    };
  }

  // Apply smart content values onto elements so bound images/text validate correctly.
  const normalized: DesignData = isSmartTemplate(design)
    ? applyContentValues(design, getContentValues(design))
    : design;

  if (options?.slideName != null && isBlank(options.slideName)) {
    issues.push({
      code: "missing_slide_name",
      message: "Slide name is required before publishing.",
    });
  }

  const elements = getElements(normalized);
  if (elements.length === 0) {
    issues.push({
      code: "empty_canvas",
      message: "Add at least one element before publishing.",
    });
  }

  const artboard = getArtboardSize(options?.orientation ?? "landscape");
  for (const el of elements) {
    validateElementDimensions(el, artboard, issues);
    validateElementContent(el, issues);
  }

  validateSmartTemplate(normalized, issues);

  return { ok: issues.length === 0, issues };
}

export function formatPublishValidationError(
  result: PublishValidationResult,
): string {
  if (result.ok) return "";
  const first = result.issues[0]?.message ?? "Validation failed";
  if (result.issues.length === 1) return first;
  return `${first} (+${result.issues.length - 1} more)`;
}
