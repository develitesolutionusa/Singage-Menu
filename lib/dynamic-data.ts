import type { DesignElementProps } from "@/lib/design-elements";
import type { DesignData } from "@/types/db";

/** Local contentValues reader — avoids circular import with smart-templates. */
function readContentValues(
  design: DesignData | null | undefined,
): Record<string, string> {
  if (!design) return {};
  const stored =
    design.contentValues && typeof design.contentValues === "object"
      ? (design.contentValues as Record<string, string>)
      : {};
  const values: Record<string, string> = { ...stored };
  const fields = Array.isArray(design.editableFields)
    ? (design.editableFields as Array<{ id: string; defaultValue?: string }>)
    : [];
  for (const field of fields) {
    if (values[field.id] == null && field.defaultValue != null) {
      values[field.id] = field.defaultValue;
    }
  }
  return values;
}

/** Supported binding sources for Smart Template dynamic fields. */
export type DynamicDataSource = "product" | "restaurant";

export type ProductDynamicField =
  | "name"
  | "price"
  | "description"
  | "image";

export type RestaurantDynamicField = "name" | "logo";

export type DynamicField = ProductDynamicField | RestaurantDynamicField;

export type DynamicDataContext = {
  product: {
    name: string;
    price: string;
    description: string;
    image: string;
  };
  restaurant: {
    name: string;
    logo: string;
  };
};

export type OrgProfile = {
  name?: string | null;
  logo?: string | null;
};

export const DYNAMIC_TOKEN_RE =
  /\{\{\s*([a-zA-Z_][\w]*)\s*\.\s*([a-zA-Z_][\w]*)\s*\}\}/g;

export const DYNAMIC_SOURCES: Array<{
  value: DynamicDataSource;
  label: string;
}> = [
  { value: "product", label: "Product" },
  { value: "restaurant", label: "Restaurant" },
];

export const FIELDS_BY_SOURCE: Record<
  DynamicDataSource,
  Array<{ value: DynamicField; label: string }>
> = {
  product: [
    { value: "name", label: "name" },
    { value: "price", label: "price" },
    { value: "description", label: "description" },
    { value: "image", label: "image" },
  ],
  restaurant: [
    { value: "name", label: "name" },
    { value: "logo", label: "logo" },
  ],
};

export function formatDynamicToken(
  source: string,
  field: string,
): string {
  return `{{${source}.${field}}}`;
}

export function isDynamicDataSource(
  value: string | undefined | null,
): value is DynamicDataSource {
  return value === "product" || value === "restaurant";
}

export function fieldsForSource(
  source: string | undefined | null,
): Array<{ value: DynamicField; label: string }> {
  if (isDynamicDataSource(source)) return FIELDS_BY_SOURCE[source];
  return FIELDS_BY_SOURCE.product;
}

function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function readStoredContext(
  design: DesignData | null | undefined,
): Partial<DynamicDataContext> {
  const raw = design?.dynamicContext;
  if (!raw || typeof raw !== "object") return {};
  return raw as Partial<DynamicDataContext>;
}

/**
 * Build the live data context used to resolve {{source.field}} tokens.
 * Priority: explicit dynamicContext → Smart contentValues → legacy design
 * fields → org profile (restaurant).
 */
export function buildDynamicContext(
  design: DesignData | null | undefined,
  orgProfile?: OrgProfile | null,
): DynamicDataContext {
  const values = readContentValues(design);
  const stored = readStoredContext(design);

  return {
    product: {
      name:
        str(stored.product?.name) ||
        str(values.product) ||
        str(values.name) ||
        str(values.title) ||
        str(design?.headline) ||
        "",
      price:
        str(stored.product?.price) ||
        str(values.price) ||
        str(design?.price) ||
        "",
      description:
        str(stored.product?.description) ||
        str(values.description) ||
        str(design?.subheadline) ||
        str(design?.body) ||
        "",
      image:
        str(stored.product?.image) ||
        str(values.image) ||
        "",
    },
    restaurant: {
      name:
        str(stored.restaurant?.name) ||
        str(values.restaurant_name) ||
        str(values.restaurant) ||
        str(orgProfile?.name) ||
        "",
      logo:
        str(stored.restaurant?.logo) ||
        str(values.logo) ||
        str(orgProfile?.logo) ||
        "",
    },
  };
}

/**
 * Keep design.dynamicContext.product in sync with Smart contentValues so
 * every {{product.*}} binding updates when managers edit content fields.
 */
export function syncDynamicContextFromContent(
  design: DesignData,
  values: Record<string, string>,
  orgProfile?: OrgProfile | null,
): DesignData {
  const previous = readStoredContext(design);
  const nextContext: DynamicDataContext = {
    product: {
      name:
        str(values.product) ||
        str(values.name) ||
        str(values.title) ||
        str(previous.product?.name) ||
        str(design.headline) ||
        "",
      price:
        str(values.price) ||
        str(previous.product?.price) ||
        str(design.price) ||
        "",
      description:
        str(values.description) ||
        str(previous.product?.description) ||
        str(design.subheadline) ||
        str(design.body) ||
        "",
      image:
        str(values.image) ||
        str(previous.product?.image) ||
        "",
    },
    restaurant: {
      name:
        str(previous.restaurant?.name) ||
        str(values.restaurant_name) ||
        str(values.restaurant) ||
        str(orgProfile?.name) ||
        "",
      logo:
        str(previous.restaurant?.logo) ||
        str(values.logo) ||
        str(orgProfile?.logo) ||
        "",
    },
  };

  return {
    ...design,
    dynamicContext: nextContext,
  };
}

export function mergeOrgProfileIntoDesign(
  design: DesignData,
  orgProfile: OrgProfile | null | undefined,
): DesignData {
  if (!orgProfile) return design;
  const values = readContentValues(design);
  return syncDynamicContextFromContent(design, values, orgProfile);
}

export function lookupDynamicValue(
  context: DynamicDataContext,
  source: string,
  field: string,
): string | undefined {
  if (source === "product") {
    const bag = context.product;
    if (field === "name") return bag.name;
    if (field === "price") return bag.price;
    if (field === "description") return bag.description;
    if (field === "image") return bag.image;
    return undefined;
  }
  if (source === "restaurant") {
    const bag = context.restaurant;
    if (field === "name") return bag.name;
    if (field === "logo") return bag.logo;
    return undefined;
  }
  return undefined;
}

/**
 * Resolve a single binding (dataSource + field) with fallback.
 */
export function resolveBinding(
  context: DynamicDataContext,
  dataSource: string | undefined,
  field: string | undefined,
  fallback?: string,
): string {
  if (!dataSource || !field) return fallback ?? "";
  const value = lookupDynamicValue(context, dataSource, field);
  if (value != null && value !== "") return value;
  return fallback ?? "";
}

/**
 * Replace all {{source.field}} tokens in a string.
 * Unresolved tokens fall back to `fallback` when provided, otherwise "".
 */
export function resolveString(
  input: string | undefined | null,
  context: DynamicDataContext,
  fallback?: string,
): string {
  if (input == null || input === "") return fallback ?? "";
  let hadToken = false;
  let unresolved = false;
  const resolved = input.replace(
    DYNAMIC_TOKEN_RE,
    (_match, source: string, field: string) => {
      hadToken = true;
      const value = lookupDynamicValue(context, source, field);
      if (value != null && value !== "") return value;
      unresolved = true;
      return "";
    },
  );
  if (hadToken && unresolved && resolved.trim() === "" && fallback != null) {
    return fallback;
  }
  return resolved;
}

export function hasDynamicBinding(props: DesignElementProps): boolean {
  if (props.dataSource && props.field) return true;
  const candidates = [
    props.text,
    props.price,
    props.name,
    props.description,
    props.imageUrl,
    props.label,
    props.cta,
  ];
  return candidates.some(
    (value) => typeof value === "string" && /\{\{[^}]+\}\}/.test(value),
  );
}

export function isImageBindingField(field: string | undefined): boolean {
  return field === "image" || field === "logo";
}

/**
 * Resolve all string props that may contain dynamic tokens / bindings.
 * Manual (non-token) values pass through unchanged.
 */
export function resolveElementProps(
  props: DesignElementProps,
  context: DynamicDataContext,
): DesignElementProps {
  const next: DesignElementProps = {
    ...props,
    text: resolveString(props.text, context, props.fallback),
    label: resolveString(props.label, context),
    name: resolveString(props.name, context),
    description: resolveString(props.description, context),
    price: resolveString(props.price, context),
    cta: resolveString(props.cta, context),
    category: resolveString(props.category, context),
    alt: resolveString(props.alt, context),
    url: resolveString(props.url, context),
    imageUrl:
      resolveString(props.imageUrl, context, props.fallback) || props.imageUrl,
  };

  if (!props.dataSource || !props.field) return next;

  const bound = resolveBinding(
    context,
    props.dataSource,
    props.field,
    props.fallback,
  );

  if (isImageBindingField(props.field)) {
    next.imageUrl = bound || next.imageUrl;
    return next;
  }

  // Textual binding: drive text + the matching content prop.
  next.text = bound || next.text;
  if (props.field === "price") next.price = bound || next.price;
  if (props.field === "name") next.name = bound || next.name;
  if (props.field === "description") {
    next.description = bound || next.description;
  }
  if (props.field === "name" && props.label != null) {
    next.label = bound || next.label;
  }

  return next;
}

/** Human-readable preview of what a binding currently resolves to. */
export function previewBinding(
  props: DesignElementProps,
  context: DynamicDataContext,
): string {
  if (props.dataSource && props.field) {
    return (
      resolveBinding(context, props.dataSource, props.field, props.fallback) ||
      props.fallback ||
      "—"
    );
  }
  if (props.text && /\{\{/.test(props.text)) {
    return resolveString(props.text, context, props.fallback) || "—";
  }
  return props.fallback || "—";
}
