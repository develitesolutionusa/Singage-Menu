import type { DesignBlockType } from "@/components/design-editor/blocks";
import {
  type DesignElement,
  type DesignElementProps,
  getElements,
  withElements,
} from "@/lib/design-elements";
import { buildDistinctRestaurantTemplates } from "@/lib/restaurant-pro-templates";
import type { DesignData } from "@/types/db";

/** Manager-editable field kinds for Smart Templates. */
export type SmartFieldKind =
  | "title"
  | "product"
  | "description"
  | "price"
  | "image"
  | "logo"
  | "cta"
  | "text"
  | "dynamic";

export type SmartFieldBinding = {
  elementId: string;
  prop: keyof DesignElementProps;
};

export type SmartEditableField = {
  id: string;
  label: string;
  kind: SmartFieldKind;
  bindings: SmartFieldBinding[];
  defaultValue: string;
  placeholder?: string;
};

export type SmartTemplateMeta = {
  /** Marks design as a professionally authored Smart Template. */
  smart: true;
  /** Layout is protected; managers edit content fields only. */
  layoutLocked: boolean;
  editableFields: SmartEditableField[];
  /** Instance content values keyed by field id. */
  contentValues: Record<string, string>;
};

export function isSmartTemplate(
  data: DesignData | null | undefined,
): data is DesignData & SmartTemplateMeta {
  return Boolean(data && data.smart === true && Array.isArray(data.editableFields));
}

export function getEditableFields(
  data: DesignData | null | undefined,
): SmartEditableField[] {
  if (!isSmartTemplate(data)) return [];
  return data.editableFields as SmartEditableField[];
}

export function getContentValues(
  data: DesignData | null | undefined,
): Record<string, string> {
  if (!data) return {};
  const stored =
    data.contentValues && typeof data.contentValues === "object"
      ? (data.contentValues as Record<string, string>)
      : {};
  const values: Record<string, string> = { ...stored };
  for (const field of getEditableFields(data)) {
    if (values[field.id] == null) values[field.id] = field.defaultValue;
  }
  return values;
}

function applyBindingValue(
  props: DesignElementProps,
  prop: keyof DesignElementProps,
  value: string,
): DesignElementProps {
  return { ...props, [prop]: value };
}

/**
 * Apply manager content values onto bound elements.
 * Layout (positions/sizes/types) is preserved - only content props change.
 */
export function applyContentValues(
  data: DesignData,
  values: Record<string, string>,
): DesignData {
  const fields = getEditableFields(data);
  const elements = getElements(data);
  if (!fields.length || !elements.length) {
    return {
      ...data,
      contentValues: values,
    };
  }

  const byId = new Map(elements.map((el) => [el.id, { ...el, props: { ...el.props } }]));

  for (const field of fields) {
    const value = values[field.id] ?? field.defaultValue;
    for (const binding of field.bindings) {
      const el = byId.get(binding.elementId);
      if (!el) continue;
      el.props = applyBindingValue(el.props, binding.prop, value);
      byId.set(binding.elementId, el);
    }
  }

  const nextElements = elements.map((el) => byId.get(el.id) ?? el);
  return {
    ...withElements(data, nextElements),
    smart: true,
    layoutLocked: data.layoutLocked === true,
    editableFields: fields,
    contentValues: values,
  };
}

/** Update a single content field and sync canvas elements immediately. */
export function setContentField(
  data: DesignData,
  fieldId: string,
  value: string,
): DesignData {
  const current = getContentValues(data);
  return applyContentValues(data, { ...current, [fieldId]: value });
}

function el(
  partial: Omit<DesignElement, "rotation" | "locked" | "hidden"> &
    Partial<Pick<DesignElement, "rotation" | "locked" | "hidden">>,
): DesignElement {
  return {
    rotation: 0,
    locked: false,
    hidden: false,
    ...partial,
  };
}

function field(
  id: string,
  label: string,
  kind: SmartFieldKind,
  defaultValue: string,
  bindings: SmartFieldBinding[],
  placeholder?: string,
): SmartEditableField {
  return { id, label, kind, defaultValue, bindings, placeholder };
}

type BuildInput = {
  layout: string;
  theme: NonNullable<DesignData["theme"]>;
  elements: DesignElement[];
  editableFields: SmartEditableField[];
  /** When true, managers edit content only until an admin unlocks layout. */
  layoutLocked?: boolean;
  /** Legacy preview fields kept for Template Library cards before elements hydrate. */
  legacy?: Partial<DesignData>;
};

function buildSmartDesign(input: BuildInput): DesignData {
  const contentValues: Record<string, string> = {};
  for (const f of input.editableFields) {
    contentValues[f.id] = f.defaultValue;
  }

  const base: DesignData = {
    smart: true,
    layoutLocked: input.layoutLocked === true,
    layout: input.layout,
    theme: input.theme,
    elements: input.elements,
    editableFields: input.editableFields,
    contentValues,
    ...input.legacy,
  };

  return applyContentValues(base, contentValues);
}

/** Restaurant Smart Templates — each name maps to a unique layout composition. */
export function buildRestaurantSmartTemplates(): Record<string, DesignData> {
  return {
    ...buildDistinctRestaurantTemplates(),
    "Premium Food Special": buildPremiumFoodSpecial(),
  };
}

type ContentSeed = {
  layout: string;
  theme: NonNullable<DesignData["theme"]>;
  restaurantName?: string;
  title: string;
  product: string;
  description: string;
  price: string;
  cta: string;
  imageUrl?: string;
  imageAlt: string;
  badge?: string;
  phone?: string;
  location?: string;
  hours?: string;
};

const LOGO_URL = "/templates/good-food-logo.svg";
const FOOD_HERO = "/templates/premium-food-special.jpg";

const PRO_FIELDS = (seed: ContentSeed): SmartEditableField[] => [
  field(
    "restaurant_name",
    "Restaurant Name",
    "title",
    seed.restaurantName ?? "THE GOOD FOOD",
    [{ elementId: "el_restaurant_name", prop: "text" }],
  ),
  field("logo", "Logo", "logo", LOGO_URL, [
    { elementId: "el_logo", prop: "imageUrl" },
  ]),
  field("title", "Promotion / Title", "title", seed.title, [
    { elementId: "el_title", prop: "text" },
  ]),
  field("product", "Product Name", "product", seed.product, [
    { elementId: "el_product", prop: "text" },
  ]),
  field("description", "Description", "description", seed.description, [
    { elementId: "el_description", prop: "text" },
  ]),
  field("price", "Price", "price", seed.price, [
    { elementId: "el_price", prop: "price" },
    { elementId: "el_price", prop: "text" },
  ]),
  field("image", "Product Image", "image", seed.imageUrl ?? FOOD_HERO, [
    { elementId: "el_image", prop: "imageUrl" },
  ]),
  field("cta", "CTA", "cta", seed.cta, [
    { elementId: "el_cta", prop: "label" },
  ]),
  field("badge", "Badge", "text", seed.badge ?? "FEATURED", [
    { elementId: "el_badge", prop: "text" },
  ]),
  field(
    "phone",
    "Phone",
    "text",
    `ðŸ“ž  ${seed.phone ?? "+1 234 567 8900"}`,
    [{ elementId: "el_phone", prop: "text" }],
  ),
  field(
    "location",
    "Location",
    "text",
    `ðŸ“  ${seed.location ?? "123 Food Street, NY"}`,
    [{ elementId: "el_location", prop: "text" }],
  ),
  field(
    "hours",
    "Business Hours",
    "text",
    `ðŸ•  ${seed.hours ?? "Open Daily | 11AM - 11PM"}`,
    [{ elementId: "el_hours", prop: "text" }],
  ),
];

function proChrome(
  theme: NonNullable<DesignData["theme"]>,
  seed: ContentSeed,
): DesignElement[] {
  const accent = theme.accent ?? "#d4a017";
  const text = theme.text ?? "#ffffff";
  const restaurant = seed.restaurantName ?? "THE GOOD FOOD";
  return [
    el({
      id: "el_logo",
      type: "logo",
      name: "Logo",
      x: 40,
      y: 28,
      width: 48,
      height: 48,
      zIndex: 8,
      props: {
        imageUrl: LOGO_URL,
        alt: "Logo",
        fit: "contain",
        background: "transparent",
        dataSource: "restaurant",
        field: "logo",
        fallback: LOGO_URL,
      },
    }),
    el({
      id: "el_restaurant_name",
      type: "text",
      name: "Restaurant Name",
      x: 100,
      y: 30,
      width: 360,
      height: 28,
      zIndex: 8,
      props: {
        text: restaurant,
        fontFamily: "sans",
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: 1.2,
        color: text,
        background: "transparent",
        dataSource: "restaurant",
        field: "name",
        fallback: restaurant,
      },
    }),
    el({
      id: "el_footer_line",
      type: "divider",
      name: "Footer line",
      x: 40,
      y: 470,
      width: 880,
      height: 6,
      zIndex: 6,
      locked: true,
      props: { background: accent, opacity: 70 },
    }),
    el({
      id: "el_phone",
      type: "contact",
      name: "Phone",
      x: 40,
      y: 488,
      width: 260,
      height: 32,
      zIndex: 7,
      props: {
        text: `ðŸ“ž  ${seed.phone ?? "+1 234 567 8900"}`,
        fontSize: 12,
        fontWeight: 500,
        color: text,
        background: "transparent",
      },
    }),
    el({
      id: "el_location",
      type: "location",
      name: "Location",
      x: 320,
      y: 488,
      width: 280,
      height: 32,
      zIndex: 7,
      props: {
        text: `ðŸ“  ${seed.location ?? "123 Food Street, NY"}`,
        fontSize: 12,
        fontWeight: 500,
        color: text,
        background: "transparent",
      },
    }),
    el({
      id: "el_hours",
      type: "hours",
      name: "Hours",
      x: 620,
      y: 488,
      width: 300,
      height: 32,
      zIndex: 7,
      props: {
        text: `ðŸ•  ${seed.hours ?? "Open Daily | 11AM - 11PM"}`,
        fontSize: 12,
        fontWeight: 500,
        color: text,
        background: "transparent",
      },
    }),
  ];
}

/** Dual-column menu board - elegant dark dining look. */
function buildMenuBoard(seed: ContentSeed): DesignData {
  const theme = seed.theme;
  const accent = theme.accent ?? "#d4a017";
  const text = theme.text ?? "#f7f1e8";
  const muted = theme.muted ?? "#b8a990";
  const panel = theme.panel ?? "#2a1f18";
  const hero = seed.imageUrl ?? FOOD_HERO;

  const elements: DesignElement[] = [
    el({
      id: "el_bg",
      type: "shape",
      name: "Background",
      x: 0,
      y: 0,
      width: 960,
      height: 540,
      zIndex: 0,
      locked: true,
      props: { background: theme.bg, borderRadius: 0 },
    }),
    el({
      id: "el_accent_bar",
      type: "shape",
      name: "Accent bar",
      x: 0,
      y: 0,
      width: 8,
      height: 540,
      zIndex: 1,
      locked: true,
      props: { background: accent, borderRadius: 0 },
    }),
    ...proChrome(theme, seed),
    el({
      id: "el_badge",
      type: "text",
      name: "Badge",
      x: 40,
      y: 96,
      width: 200,
      height: 28,
      zIndex: 5,
      props: {
        text: seed.badge ?? "TONIGHT'S MENU",
        fontFamily: "sans",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 2,
        color: accent,
        background: "transparent",
      },
    }),
    el({
      id: "el_title",
      type: "text",
      name: "Title",
      x: 40,
      y: 128,
      width: 440,
      height: 48,
      zIndex: 5,
      props: {
        text: seed.title,
        fontFamily: "serif",
        fontSize: 36,
        fontWeight: 700,
        color: text,
        background: "transparent",
      },
    }),
    el({
      id: "el_product",
      type: "text",
      name: "Product",
      x: 40,
      y: 186,
      width: 440,
      height: 36,
      zIndex: 5,
      props: {
        text: seed.product,
        fontFamily: "sans",
        fontSize: 22,
        fontWeight: 700,
        color: accent,
        background: "transparent",
        dataSource: "product",
        field: "name",
        fallback: seed.product,
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 40,
      y: 232,
      width: 420,
      height: 72,
      zIndex: 5,
      props: {
        text: seed.description,
        fontFamily: "sans",
        fontSize: 15,
        fontWeight: 400,
        lineHeight: 1.45,
        color: muted,
        background: "transparent",
        dataSource: "product",
        field: "description",
        fallback: seed.description,
      },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 40,
      y: 330,
      width: 150,
      height: 52,
      zIndex: 6,
      props: {
        price: seed.price,
        fontSize: 24,
        fontWeight: 800,
        color: "#111111",
        background: accent,
        borderRadius: 10,
        dataSource: "product",
        field: "price",
        fallback: seed.price,
      },
    }),
    el({
      id: "el_cta",
      type: "button",
      name: "CTA",
      x: 210,
      y: 336,
      width: 180,
      height: 44,
      zIndex: 6,
      props: {
        label: seed.cta,
        fontSize: 14,
        fontWeight: 800,
        background: panel,
        color: text,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: accent,
      },
    }),
    el({
      id: "el_image",
      type: "image",
      name: "Product Image",
      x: 520,
      y: 96,
      width: 400,
      height: 340,
      zIndex: 4,
      props: {
        imageUrl: hero,
        alt: seed.imageAlt,
        fit: "cover",
        background: panel,
        borderRadius: 18,
        shadow: "lg",
        dataSource: "product",
        field: "image",
        fallback: hero,
      },
    }),
  ];

  return buildSmartDesign({
    layout: seed.layout,
    theme,
    elements,
    editableFields: PRO_FIELDS(seed),
    layoutLocked: true,
    legacy: {
      badge: seed.badge,
      headline: seed.title,
      subheadline: seed.description,
      price: seed.price,
      cta: seed.cta,
      imageUrl: hero,
    },
  });
}

/** Bold promo hero - left copy, right image, strong price + CTA. */
function buildPromoHero(seed: ContentSeed): DesignData {
  const theme = seed.theme;
  const accent = theme.accent ?? "#ef4444";
  const text = theme.text ?? "#ffffff";
  const muted = theme.muted ?? "#94a3b8";
  const panel = theme.panel ?? "#1e293b";
  const hero = seed.imageUrl ?? FOOD_HERO;

  const elements: DesignElement[] = [
    el({
      id: "el_bg",
      type: "shape",
      name: "Background",
      x: 0,
      y: 0,
      width: 960,
      height: 540,
      zIndex: 0,
      locked: true,
      props: { background: theme.bg, borderRadius: 0 },
    }),
    el({
      id: "el_image",
      type: "image",
      name: "Product Image",
      x: 480,
      y: 0,
      width: 480,
      height: 540,
      zIndex: 1,
      props: {
        imageUrl: hero,
        alt: seed.imageAlt,
        fit: "cover",
        background: panel,
        borderRadius: 0,
        dataSource: "product",
        field: "image",
        fallback: hero,
      },
    }),
    el({
      id: "el_scrim",
      type: "shape",
      name: "Left scrim",
      x: 0,
      y: 0,
      width: 560,
      height: 540,
      zIndex: 2,
      locked: true,
      props: {
        background: theme.bg,
        borderRadius: 0,
        opacity: 92,
      },
    }),
    ...proChrome(theme, seed),
    el({
      id: "el_badge",
      type: "text",
      name: "Badge",
      x: 40,
      y: 100,
      width: 220,
      height: 32,
      zIndex: 5,
      props: {
        text: seed.badge ?? "LIMITED TIME",
        fontFamily: "sans",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 2,
        color: "#111111",
        background: accent,
        borderRadius: 6,
        padding: 8,
        align: "center",
      },
    }),
    el({
      id: "el_title",
      type: "text",
      name: "Title",
      x: 40,
      y: 150,
      width: 420,
      height: 56,
      zIndex: 5,
      props: {
        text: seed.title,
        fontFamily: "sans",
        fontSize: 40,
        fontWeight: 800,
        color: text,
        background: "transparent",
      },
    }),
    el({
      id: "el_product",
      type: "text",
      name: "Product",
      x: 40,
      y: 216,
      width: 400,
      height: 32,
      zIndex: 5,
      props: {
        text: seed.product,
        fontFamily: "serif",
        fontSize: 22,
        fontWeight: 600,
        color: accent,
        background: "transparent",
        dataSource: "product",
        field: "name",
        fallback: seed.product,
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 40,
      y: 260,
      width: 400,
      height: 64,
      zIndex: 5,
      props: {
        text: seed.description,
        fontSize: 15,
        fontWeight: 400,
        lineHeight: 1.4,
        color: muted,
        background: "transparent",
        dataSource: "product",
        field: "description",
        fallback: seed.description,
      },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 40,
      y: 350,
      width: 160,
      height: 56,
      zIndex: 6,
      props: {
        price: seed.price,
        fontSize: 26,
        fontWeight: 800,
        color: "#111111",
        background: accent,
        borderRadius: 12,
        dataSource: "product",
        field: "price",
        fallback: seed.price,
      },
    }),
    el({
      id: "el_cta",
      type: "button",
      name: "CTA",
      x: 220,
      y: 356,
      width: 190,
      height: 48,
      zIndex: 6,
      props: {
        label: seed.cta,
        fontSize: 14,
        fontWeight: 800,
        background: text,
        color: theme.bg ?? "#0f172a",
        borderRadius: 999,
      },
    }),
  ];

  return buildSmartDesign({
    layout: seed.layout,
    theme,
    elements,
    editableFields: PRO_FIELDS(seed),
    layoutLocked: true,
    legacy: {
      badge: seed.badge,
      headline: seed.title,
      subheadline: seed.description,
      price: seed.price,
      cta: seed.cta,
      imageUrl: hero,
    },
  });
}

/** Split feature - image left, story + price right. */
function buildFeatureSplit(seed: ContentSeed): DesignData {
  const theme = seed.theme;
  const accent = theme.accent ?? "#34d399";
  const text = theme.text ?? "#f9fafb";
  const muted = theme.muted ?? "#9ca3af";
  const panel = theme.panel ?? "#1f2937";
  const hero = seed.imageUrl ?? FOOD_HERO;

  const elements: DesignElement[] = [
    el({
      id: "el_bg",
      type: "shape",
      name: "Background",
      x: 0,
      y: 0,
      width: 960,
      height: 540,
      zIndex: 0,
      locked: true,
      props: { background: theme.bg, borderRadius: 0 },
    }),
    el({
      id: "el_image",
      type: "image",
      name: "Product Image",
      x: 32,
      y: 96,
      width: 420,
      height: 340,
      zIndex: 3,
      props: {
        imageUrl: hero,
        alt: seed.imageAlt,
        fit: "cover",
        background: panel,
        borderRadius: 20,
        shadow: "lg",
        dataSource: "product",
        field: "image",
        fallback: hero,
      },
    }),
    ...proChrome(theme, seed),
    el({
      id: "el_badge",
      type: "text",
      name: "Badge",
      x: 500,
      y: 110,
      width: 200,
      height: 30,
      zIndex: 5,
      props: {
        text: seed.badge ?? "CHEF'S PICK",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 2,
        color: accent,
        background: "transparent",
      },
    }),
    el({
      id: "el_title",
      type: "text",
      name: "Title",
      x: 500,
      y: 148,
      width: 420,
      height: 36,
      zIndex: 5,
      props: {
        text: seed.title,
        fontFamily: "sans",
        fontSize: 18,
        fontWeight: 700,
        color: muted,
        background: "transparent",
      },
    }),
    el({
      id: "el_product",
      type: "text",
      name: "Product",
      x: 500,
      y: 190,
      width: 420,
      height: 56,
      zIndex: 5,
      props: {
        text: seed.product,
        fontFamily: "serif",
        fontSize: 34,
        fontWeight: 700,
        color: text,
        background: "transparent",
        dataSource: "product",
        field: "name",
        fallback: seed.product,
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 500,
      y: 260,
      width: 400,
      height: 72,
      zIndex: 5,
      props: {
        text: seed.description,
        fontSize: 15,
        lineHeight: 1.45,
        color: muted,
        background: "transparent",
        dataSource: "product",
        field: "description",
        fallback: seed.description,
      },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 500,
      y: 360,
      width: 140,
      height: 52,
      zIndex: 6,
      props: {
        price: seed.price,
        fontSize: 24,
        fontWeight: 800,
        color: "#111111",
        background: accent,
        borderRadius: 12,
        dataSource: "product",
        field: "price",
        fallback: seed.price,
      },
    }),
    el({
      id: "el_cta",
      type: "button",
      name: "CTA",
      x: 660,
      y: 364,
      width: 200,
      height: 48,
      zIndex: 6,
      props: {
        label: seed.cta,
        fontSize: 14,
        fontWeight: 800,
        background: panel,
        color: text,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: accent,
      },
    }),
  ];

  return buildSmartDesign({
    layout: seed.layout,
    theme,
    elements,
    editableFields: PRO_FIELDS(seed),
    layoutLocked: true,
    legacy: {
      badge: seed.badge ?? seed.title,
      headline: seed.product,
      subheadline: seed.description,
      price: seed.price,
      cta: seed.cta,
      imageUrl: hero,
    },
  });
}

/** Centered deal / combo card - high-impact offer layout. */
function buildDealCard(seed: ContentSeed): DesignData {
  const theme = seed.theme;
  const accent = theme.accent ?? "#059669";
  const text = theme.text ?? "#064e3b";
  const muted = theme.muted ?? "#047857";
  const panel = theme.panel ?? "#d1fae5";
  const hero = seed.imageUrl ?? FOOD_HERO;

  const elements: DesignElement[] = [
    el({
      id: "el_bg",
      type: "shape",
      name: "Background",
      x: 0,
      y: 0,
      width: 960,
      height: 540,
      zIndex: 0,
      locked: true,
      props: { background: theme.bg, borderRadius: 0 },
    }),
    el({
      id: "el_card",
      type: "shape",
      name: "Offer card",
      x: 80,
      y: 88,
      width: 800,
      height: 350,
      zIndex: 2,
      locked: true,
      props: {
        background: panel,
        borderRadius: 28,
        shadow: "lg",
      },
    }),
    el({
      id: "el_image",
      type: "image",
      name: "Product Image",
      x: 110,
      y: 118,
      width: 280,
      height: 290,
      zIndex: 3,
      props: {
        imageUrl: hero,
        alt: seed.imageAlt,
        fit: "cover",
        background: theme.bg,
        borderRadius: 20,
        dataSource: "product",
        field: "image",
        fallback: hero,
      },
    }),
    ...proChrome(theme, {
      ...seed,
      // Footer chrome sits on outer bg - keep readable colors
    }),
    el({
      id: "el_badge",
      type: "text",
      name: "Badge",
      x: 430,
      y: 130,
      width: 200,
      height: 28,
      zIndex: 5,
      props: {
        text: seed.badge ?? "BEST VALUE",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 2,
        color: accent,
        background: "transparent",
      },
    }),
    el({
      id: "el_title",
      type: "text",
      name: "Title",
      x: 430,
      y: 168,
      width: 400,
      height: 32,
      zIndex: 5,
      props: {
        text: seed.title,
        fontSize: 18,
        fontWeight: 700,
        color: muted,
        background: "transparent",
      },
    }),
    el({
      id: "el_product",
      type: "text",
      name: "Product",
      x: 430,
      y: 206,
      width: 400,
      height: 48,
      zIndex: 5,
      props: {
        text: seed.product,
        fontFamily: "serif",
        fontSize: 32,
        fontWeight: 700,
        color: text,
        background: "transparent",
        dataSource: "product",
        field: "name",
        fallback: seed.product,
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 430,
      y: 264,
      width: 400,
      height: 56,
      zIndex: 5,
      props: {
        text: seed.description,
        fontSize: 14,
        lineHeight: 1.4,
        color: muted,
        background: "transparent",
        dataSource: "product",
        field: "description",
        fallback: seed.description,
      },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 430,
      y: 340,
      width: 160,
      height: 56,
      zIndex: 6,
      props: {
        price: seed.price,
        fontSize: 28,
        fontWeight: 800,
        color: "#ffffff",
        background: accent,
        borderRadius: 14,
        dataSource: "product",
        field: "price",
        fallback: seed.price,
      },
    }),
    el({
      id: "el_cta",
      type: "button",
      name: "CTA",
      x: 610,
      y: 346,
      width: 200,
      height: 48,
      zIndex: 6,
      props: {
        label: seed.cta,
        fontSize: 14,
        fontWeight: 800,
        background: text,
        color: "#ffffff",
        borderRadius: 999,
      },
    }),
  ];

  return buildSmartDesign({
    layout: seed.layout,
    theme,
    elements,
    editableFields: PRO_FIELDS(seed),
    layoutLocked: true,
    legacy: {
      badge: seed.badge ?? seed.product,
      headline: seed.title,
      subheadline: seed.description,
      price: seed.price,
      cta: seed.cta,
      imageUrl: hero,
    },
  });
}

/**
 * Premium 16:9 Restaurant & Food special - dark charcoal + gold/orange,
 * hero food photo, smart editable content, layout locked by default.
 */
function buildPremiumFoodSpecial(): DesignData {
  const GOLD = "#D4AF37";
  const ORANGE = "#FF9900";
  const BG = "#141414";
  const PANEL = "#1c1c1c";
  const TEXT = "#FFFFFF";
  const MUTED = "#D4D4D4";
  const HERO = "/templates/premium-food-special.jpg";
  const LOGO = "/templates/good-food-logo.svg";

  const theme = {
    bg: BG,
    accent: ORANGE,
    text: TEXT,
    muted: MUTED,
    panel: PANEL,
  };

  const restaurantName = "THE GOOD FOOD";
  const promo = "Today's Special";
  const product = "Chicken Biryani";
  const description =
    "Fragrant basmati rice cooked with tender chicken, aromatic spices and herbs. A royal taste in every bite!";
  const price = "$14.99";
  const cta = "ORDER NOW â†’";
  const phone = "+1 234 567 8900";
  const location = "123 Food Street, NY";
  const hours = "Open Daily | 11AM - 11PM";
  const badge = "Freshly Made";
  const feature1 = "Fresh Ingredients";
  const feature2 = "Authentic Spices";
  const feature3 = "Premium Quality";

  const elements: DesignElement[] = [
    el({
      id: "el_bg",
      type: "shape",
      name: "Background",
      x: 0,
      y: 0,
      width: 960,
      height: 540,
      zIndex: 0,
      locked: true,
      props: { background: BG, borderRadius: 0 },
    }),
    // Subtle left vignette panel behind copy
    el({
      id: "el_left_wash",
      type: "shape",
      name: "Left wash",
      x: 0,
      y: 0,
      width: 520,
      height: 540,
      zIndex: 1,
      locked: true,
      props: {
        background:
          "linear-gradient(90deg, #0f0f0f 0%, #141414 70%, transparent 100%)",
        borderRadius: 0,
        opacity: 100,
      },
    }),
    el({
      id: "el_logo",
      type: "logo",
      name: "Logo",
      x: 40,
      y: 28,
      width: 52,
      height: 52,
      zIndex: 5,
      props: {
        imageUrl: LOGO,
        alt: "Restaurant logo",
        fit: "contain",
        background: "transparent",
        dataSource: "restaurant",
        field: "logo",
        fallback: LOGO,
      },
    }),
    el({
      id: "el_restaurant_name",
      type: "text",
      name: "Restaurant Name",
      x: 104,
      y: 28,
      width: 340,
      height: 32,
      zIndex: 5,
      props: {
        text: restaurantName,
        fontFamily: "sans",
        fontSize: 20,
        fontWeight: 800,
        letterSpacing: 1.5,
        color: TEXT,
        background: "transparent",
        align: "left",
        dataSource: "restaurant",
        field: "name",
        fallback: restaurantName,
      },
    }),
    el({
      id: "el_restaurant_tag",
      type: "text",
      name: "Restaurant Tag",
      x: 104,
      y: 58,
      width: 200,
      height: 20,
      zIndex: 5,
      locked: true,
      props: {
        text: "-  RESTAURANT  -",
        fontFamily: "sans",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 2,
        color: GOLD,
        background: "transparent",
        align: "left",
      },
    }),
    el({
      id: "el_promo",
      type: "text",
      name: "Promotion Label",
      x: 40,
      y: 108,
      width: 400,
      height: 40,
      zIndex: 5,
      props: {
        text: promo,
        fontFamily: "script",
        fontSize: 30,
        fontWeight: 600,
        color: ORANGE,
        background: "transparent",
        align: "left",
      },
    }),
    el({
      id: "el_product",
      type: "text",
      name: "Product Name",
      x: 40,
      y: 150,
      width: 450,
      height: 58,
      zIndex: 5,
      props: {
        text: product,
        fontFamily: "serif",
        fontSize: 44,
        fontWeight: 700,
        color: TEXT,
        background: "transparent",
        align: "left",
        dataSource: "product",
        field: "name",
        fallback: product,
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 40,
      y: 218,
      width: 430,
      height: 70,
      zIndex: 5,
      props: {
        text: description,
        fontFamily: "sans",
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.45,
        color: MUTED,
        background: "transparent",
        align: "left",
        dataSource: "product",
        field: "description",
        fallback: description,
      },
    }),
    // Feature row
    el({
      id: "el_feature_1",
      type: "text",
      name: "Feature 1",
      x: 40,
      y: 300,
      width: 130,
      height: 40,
      zIndex: 5,
      props: {
        text: `ðŸŒ¿\n${feature1}`,
        fontFamily: "sans",
        fontSize: 11,
        fontWeight: 600,
        color: TEXT,
        background: "transparent",
        align: "center",
        lineHeight: 1.3,
      },
    }),
    el({
      id: "el_feature_div_1",
      type: "shape",
      name: "Feature divider 1",
      x: 176,
      y: 308,
      width: 2,
      height: 28,
      zIndex: 4,
      locked: true,
      props: { background: GOLD, borderRadius: 1, opacity: 70 },
    }),
    el({
      id: "el_feature_2",
      type: "text",
      name: "Feature 2",
      x: 186,
      y: 300,
      width: 130,
      height: 40,
      zIndex: 5,
      props: {
        text: `ðŸ²\n${feature2}`,
        fontFamily: "sans",
        fontSize: 11,
        fontWeight: 600,
        color: TEXT,
        background: "transparent",
        align: "center",
        lineHeight: 1.3,
      },
    }),
    el({
      id: "el_feature_div_2",
      type: "shape",
      name: "Feature divider 2",
      x: 322,
      y: 308,
      width: 2,
      height: 28,
      zIndex: 4,
      locked: true,
      props: { background: GOLD, borderRadius: 1, opacity: 70 },
    }),
    el({
      id: "el_feature_3",
      type: "text",
      name: "Feature 3",
      x: 332,
      y: 300,
      width: 130,
      height: 40,
      zIndex: 5,
      props: {
        text: `ðŸ‘‘\n${feature3}`,
        fontFamily: "sans",
        fontSize: 11,
        fontWeight: 600,
        color: TEXT,
        background: "transparent",
        align: "center",
        lineHeight: 1.3,
      },
    }),
    // Price brush stroke + amount
    el({
      id: "el_price_bg",
      type: "shape",
      name: "Price brush",
      x: 36,
      y: 362,
      width: 148,
      height: 48,
      zIndex: 4,
      locked: true,
      props: {
        background: ORANGE,
        borderRadius: 8,
        opacity: 100,
        shadow: "md",
      },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 36,
      y: 362,
      width: 148,
      height: 48,
      zIndex: 6,
      props: {
        price,
        fontFamily: "sans",
        fontSize: 26,
        fontWeight: 800,
        color: "#111111",
        background: "transparent",
        borderRadius: 8,
        dataSource: "product",
        field: "price",
        fallback: price,
      },
    }),
    el({
      id: "el_cta",
      type: "button",
      name: "CTA",
      x: 200,
      y: 366,
      width: 180,
      height: 44,
      zIndex: 6,
      props: {
        label: cta,
        fontFamily: "sans",
        fontSize: 14,
        fontWeight: 800,
        background: ORANGE,
        color: "#111111",
        borderRadius: 999,
        shadow: "md",
        align: "center",
      },
    }),
    // Hero food image
    el({
      id: "el_image",
      type: "image",
      name: "Product Image",
      x: 500,
      y: 24,
      width: 430,
      height: 430,
      zIndex: 3,
      props: {
        imageUrl: HERO,
        alt: "Featured dish",
        fit: "cover",
        background: PANEL,
        borderRadius: 20,
        shadow: "lg",
        dataSource: "product",
        field: "image",
        fallback: HERO,
      },
    }),
    // Freshly Made badge
    el({
      id: "el_badge_ring",
      type: "shape",
      name: "Badge ring",
      x: 820,
      y: 36,
      width: 96,
      height: 96,
      zIndex: 7,
      locked: true,
      props: {
        background: GOLD,
        borderRadius: 999,
        opacity: 100,
        shadow: "md",
      },
    }),
    el({
      id: "el_badge_inner",
      type: "shape",
      name: "Badge inner",
      x: 828,
      y: 44,
      width: 80,
      height: 80,
      zIndex: 8,
      locked: true,
      props: {
        background: "#1a1408",
        borderRadius: 999,
        borderWidth: 2,
        borderColor: GOLD,
      },
    }),
    el({
      id: "el_badge",
      type: "text",
      name: "Special Badge",
      x: 828,
      y: 58,
      width: 80,
      height: 52,
      zIndex: 9,
      props: {
        text: badge,
        fontFamily: "script",
        fontSize: 13,
        fontWeight: 700,
        color: GOLD,
        background: "transparent",
        align: "center",
        lineHeight: 1.15,
      },
    }),
    // Footer
    el({
      id: "el_footer_line",
      type: "divider",
      name: "Footer line",
      x: 40,
      y: 468,
      width: 880,
      height: 8,
      zIndex: 4,
      locked: true,
      props: { background: GOLD, opacity: 80 },
    }),
    el({
      id: "el_phone",
      type: "contact",
      name: "Phone",
      x: 40,
      y: 488,
      width: 260,
      height: 32,
      zIndex: 5,
      props: {
        text: `ðŸ“ž  ${phone}`,
        fontFamily: "sans",
        fontSize: 12,
        fontWeight: 500,
        color: TEXT,
        background: "transparent",
      },
    }),
    el({
      id: "el_location",
      type: "location",
      name: "Location",
      x: 320,
      y: 488,
      width: 280,
      height: 32,
      zIndex: 5,
      props: {
        text: `ðŸ“  ${location}`,
        fontFamily: "sans",
        fontSize: 12,
        fontWeight: 500,
        color: TEXT,
        background: "transparent",
      },
    }),
    el({
      id: "el_hours",
      type: "hours",
      name: "Hours",
      x: 620,
      y: 488,
      width: 300,
      height: 32,
      zIndex: 5,
      props: {
        text: `ðŸ•  ${hours}`,
        fontFamily: "sans",
        fontSize: 12,
        fontWeight: 500,
        color: TEXT,
        background: "transparent",
      },
    }),
  ];

  const editableFields: SmartEditableField[] = [
    field("restaurant_name", "Restaurant Name", "title", restaurantName, [
      { elementId: "el_restaurant_name", prop: "text" },
    ]),
    field("logo", "Logo", "logo", LOGO, [
      { elementId: "el_logo", prop: "imageUrl" },
    ]),
    field("promo", "Promotion Text", "title", promo, [
      { elementId: "el_promo", prop: "text" },
    ]),
    field("product", "Product Name", "product", product, [
      { elementId: "el_product", prop: "text" },
    ]),
    field("description", "Description", "description", description, [
      { elementId: "el_description", prop: "text" },
    ]),
    field("price", "Price", "price", price, [
      { elementId: "el_price", prop: "price" },
      { elementId: "el_price", prop: "text" },
    ]),
    field("image", "Product Image", "image", HERO, [
      { elementId: "el_image", prop: "imageUrl" },
    ]),
    field("cta", "CTA", "cta", cta, [
      { elementId: "el_cta", prop: "label" },
    ]),
    field("badge", "Special Badge", "text", badge, [
      { elementId: "el_badge", prop: "text" },
    ]),
    field(
      "feature_1",
      "Feature 1",
      "text",
      `ðŸŒ¿\n${feature1}`,
      [{ elementId: "el_feature_1", prop: "text" }],
      feature1,
    ),
    field(
      "feature_2",
      "Feature 2",
      "text",
      `ðŸ²\n${feature2}`,
      [{ elementId: "el_feature_2", prop: "text" }],
      feature2,
    ),
    field(
      "feature_3",
      "Feature 3",
      "text",
      `ðŸ‘‘\n${feature3}`,
      [{ elementId: "el_feature_3", prop: "text" }],
      feature3,
    ),
    field(
      "phone",
      "Phone",
      "text",
      `ðŸ“ž  ${phone}`,
      [{ elementId: "el_phone", prop: "text" }],
      phone,
    ),
    field(
      "location",
      "Location",
      "text",
      `ðŸ“  ${location}`,
      [{ elementId: "el_location", prop: "text" }],
      location,
    ),
    field(
      "hours",
      "Business Hours",
      "text",
      `ðŸ•  ${hours}`,
      [{ elementId: "el_hours", prop: "text" }],
      hours,
    ),
  ];

  return buildSmartDesign({
    layout: "premium-food-special",
    theme,
    elements,
    editableFields,
    layoutLocked: true,
    legacy: {
      badge,
      headline: product,
      subheadline: description,
      body: description,
      price,
      cta,
      imageUrl: HERO,
    },
  });
}

/**
 * Ensure design data is Smart-capable for the editor.
 * Upgrades known restaurant templates; leaves freeform designs alone.
 */
export function ensureSmartDesign(
  data: DesignData | null | undefined,
  templateName?: string | null,
): DesignData {
  if (!data) {
    return {
      smart: true,
      layoutLocked: false,
      elements: [],
      editableFields: [],
      contentValues: {},
      theme: { bg: "#0f172a", accent: "#38bdf8", text: "#f8fafc" },
    };
  }

  if (isSmartTemplate(data) && getElements(data).length > 0) {
    return applyContentValues(data, getContentValues(data));
  }

  const catalog = buildRestaurantSmartTemplates();
  const fromName = templateName ? catalog[templateName] : undefined;
  if (fromName) {
    // Preserve any existing content overrides if present as legacy fields
    const values = {
      ...getContentValues(fromName),
      ...(typeof data.headline === "string" ? { title: data.headline } : {}),
      ...(typeof data.subheadline === "string"
        ? { description: data.subheadline }
        : {}),
      ...(typeof data.price === "string" ? { price: data.price } : {}),
      ...(typeof data.cta === "string" ? { cta: data.cta } : {}),
    };
    return applyContentValues(fromName, values);
  }

  // Freeform design with elements but no smart meta â†’ mark as unlocked freeform
  if (getElements(data).length > 0) {
    return {
      ...data,
      smart: false,
      layoutLocked: false,
      editableFields: data.editableFields ?? [],
      contentValues: data.contentValues ?? {},
    };
  }

  return data;
}

export function smartFieldInputType(kind: SmartFieldKind): "text" | "textarea" {
  return kind === "description" ? "textarea" : "text";
}

/** Used by TypeScript to keep element types aligned with blocks. */
export type SmartElementType = DesignBlockType;
