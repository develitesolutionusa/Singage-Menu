import type { DesignBlockType } from "@/components/design-editor/blocks";
import {
  type DesignElement,
  type DesignElementProps,
  getElements,
  withElements,
} from "@/lib/design-elements";
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
 * Layout (positions/sizes/types) is preserved — only content props change.
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
    layoutLocked: false,
    layout: input.layout,
    theme: input.theme,
    elements: input.elements,
    editableFields: input.editableFields,
    contentValues,
    ...input.legacy,
  };

  return applyContentValues(base, contentValues);
}

/** Restaurant Smart Template builders — schema-driven, shared field model. */
export function buildRestaurantSmartTemplates(): Record<string, DesignData> {
  return {
    "Restaurant Menu": buildMenuBoard({
      layout: "menu-board",
      theme: {
        bg: "#1c1410",
        accent: "#d4a017",
        text: "#f7f1e8",
        muted: "#b8a990",
        panel: "#2a1f18",
      },
      title: "Tonight's Menu",
      product: "Chef Selections",
      description: "Kitchen open · Fresh daily",
      price: "From $8",
      cta: "Ask your server",
      imageAlt: "Menu board",
    }),
    "Food Promotion": buildPromoHero({
      layout: "promo-hero",
      theme: {
        bg: "#0f172a",
        accent: "#ef4444",
        text: "#ffffff",
        muted: "#94a3b8",
        panel: "#1e293b",
      },
      title: "50% Off Appetizers",
      product: "Weekday Happy Start",
      description: "Every weekday before 6 PM",
      price: "From $6",
      cta: "Ask your server",
      imageAlt: "Promo image",
    }),
    "Daily Special": buildFeatureSplit({
      layout: "special-split",
      theme: {
        bg: "#111827",
        accent: "#34d399",
        text: "#f9fafb",
        muted: "#9ca3af",
        panel: "#1f2937",
      },
      title: "Chef's Daily Special",
      product: "Pan-seared duck breast",
      description: "Served with roasted vegetables & potato puree",
      price: "$29",
      cta: "Order tonight",
      imageAlt: "Daily special",
    }),
    "Happy Hour": buildPromoHero({
      layout: "happy-hour",
      theme: {
        bg: "#1a0b2e",
        accent: "#f472b6",
        text: "#fdf4ff",
        muted: "#d8b4fe",
        panel: "#2e1065",
      },
      title: "Half-Price Cocktails",
      product: "Happy Hour",
      description: "Mon–Fri · 4:00–7:00 PM",
      price: "From $4",
      cta: "Visit the bar",
      imageAlt: "Cocktails",
    }),
    "Breakfast Menu": buildMenuBoard({
      layout: "menu-board",
      theme: {
        bg: "#fff7ed",
        accent: "#ea580c",
        text: "#431407",
        muted: "#9a3412",
        panel: "#ffedd5",
      },
      title: "Breakfast All Day",
      product: "Morning Classics",
      description: "Served until 11:30 AM",
      price: "From $11",
      cta: "Order breakfast",
      imageAlt: "Breakfast",
    }),
    "Seasonal Offer": buildPromoHero({
      layout: "promo-hero",
      theme: {
        bg: "#292524",
        accent: "#f97316",
        text: "#fafaf9",
        muted: "#a8a29e",
        panel: "#44403c",
      },
      title: "Autumn Harvest Bowl",
      product: "Seasonal Bowl",
      description: "Roasted squash · Farro · Maple vinaigrette",
      price: "$16",
      cta: "Available through November",
      imageAlt: "Seasonal dish",
    }),
    "Lunch Deal": buildDealCard({
      layout: "deal-card",
      theme: {
        bg: "#ecfdf5",
        accent: "#059669",
        text: "#064e3b",
        muted: "#047857",
        panel: "#d1fae5",
      },
      title: "Soup + Sandwich",
      product: "Lunch Combo",
      description: "Weekdays 11 AM – 3 PM · Includes a soft drink",
      price: "$12.95",
      cta: "Get the deal",
      imageAlt: "Lunch deal",
    }),
    "New Item": buildFeatureSplit({
      layout: "new-item",
      theme: {
        bg: "#0c0a09",
        accent: "#fbbf24",
        text: "#fafaf9",
        muted: "#a8a29e",
        panel: "#1c1917",
      },
      title: "Just Added",
      product: "Truffle Mushroom Flatbread",
      description: "Fontina · Wild mushrooms · Fresh thyme",
      price: "$18",
      cta: "Try it tonight",
      imageAlt: "New item photo",
    }),
    "Combo Promotion": buildDealCard({
      layout: "combo",
      theme: {
        bg: "#1e1b4b",
        accent: "#818cf8",
        text: "#eef2ff",
        muted: "#a5b4fc",
        panel: "#312e81",
      },
      title: "Feed the Table",
      product: "Family Combo",
      description: "2 pizzas · Large salad · Soft drinks · Serves 3–4",
      price: "$39.99",
      cta: "Order combo",
      imageAlt: "Family combo",
    }),
  };
}

type ContentSeed = {
  layout: string;
  theme: NonNullable<DesignData["theme"]>;
  title: string;
  product: string;
  description: string;
  price: string;
  cta: string;
  imageAlt: string;
};

const COMMON_FIELDS = (seed: ContentSeed): SmartEditableField[] => [
  field("title", "Title", "title", seed.title, [
    { elementId: "el_title", prop: "text" },
  ]),
  field("product", "Product", "product", seed.product, [
    { elementId: "el_product", prop: "name" },
    { elementId: "el_product", prop: "text" },
  ]),
  field(
    "description",
    "Description",
    "description",
    seed.description,
    [
      { elementId: "el_description", prop: "description" },
      { elementId: "el_description", prop: "text" },
    ],
  ),
  field("price", "Price", "price", seed.price, [
    { elementId: "el_price", prop: "price" },
    { elementId: "el_price", prop: "text" },
  ]),
  field("image", "Image", "image", seed.imageAlt, [
    { elementId: "el_image", prop: "alt" },
  ]),
  field("cta", "CTA", "cta", seed.cta, [
    { elementId: "el_cta", prop: "label" },
    { elementId: "el_cta", prop: "cta" },
    { elementId: "el_cta", prop: "text" },
  ]),
];

function buildMenuBoard(seed: ContentSeed): DesignData {
  const theme = seed.theme;
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
      props: { background: theme.bg, borderRadius: 0 },
    }),
    el({
      id: "el_title",
      type: "text",
      name: "Title",
      x: 48,
      y: 36,
      width: 560,
      height: 56,
      zIndex: 2,
      props: {
        text: seed.title,
        fontSize: 36,
        fontWeight: 700,
        color: theme.accent,
        background: "transparent",
        align: "left",
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 48,
      y: 96,
      width: 480,
      height: 40,
      zIndex: 2,
      props: {
        text: seed.description,
        fontSize: 16,
        fontWeight: 500,
        color: theme.muted,
        background: "transparent",
      },
    }),
    el({
      id: "el_product",
      type: "menu-card",
      name: "Product",
      x: 48,
      y: 160,
      width: 420,
      height: 280,
      zIndex: 2,
      props: {
        name: seed.product,
        description: "Featured selections",
        price: seed.price,
        category: "Featured",
        cta: seed.cta,
        background: theme.panel,
        color: theme.text,
        borderRadius: 16,
      },
    }),
    el({
      id: "el_image",
      type: "image",
      name: "Image",
      x: 500,
      y: 160,
      width: 412,
      height: 280,
      zIndex: 2,
      props: {
        alt: seed.imageAlt,
        fit: "cover",
        background: theme.panel,
        borderRadius: 16,
      },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 760,
      y: 48,
      width: 152,
      height: 56,
      zIndex: 3,
      props: {
        price: seed.price,
        background: theme.accent,
        color: "#111827",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 20,
      },
    }),
    el({
      id: "el_cta",
      type: "button",
      name: "CTA",
      x: 500,
      y: 460,
      width: 200,
      height: 48,
      zIndex: 3,
      props: {
        label: seed.cta,
        background: theme.accent,
        color: "#111827",
        borderRadius: 10,
        fontWeight: 700,
      },
    }),
  ];

  return buildSmartDesign({
    layout: seed.layout,
    theme,
    elements,
    editableFields: COMMON_FIELDS(seed),
    legacy: {
      headline: seed.title,
      subheadline: seed.description,
      price: seed.price,
      cta: seed.cta,
    },
  });
}

function buildPromoHero(seed: ContentSeed): DesignData {
  const theme = seed.theme;
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
      props: { background: theme.bg, borderRadius: 0 },
    }),
    el({
      id: "el_image",
      type: "image",
      name: "Image",
      x: 520,
      y: 40,
      width: 400,
      height: 460,
      zIndex: 1,
      props: {
        alt: seed.imageAlt,
        fit: "cover",
        background: theme.panel,
        borderRadius: 20,
      },
    }),
    el({
      id: "el_title",
      type: "text",
      name: "Title",
      x: 48,
      y: 80,
      width: 440,
      height: 96,
      zIndex: 2,
      props: {
        text: seed.title,
        fontSize: 42,
        fontWeight: 800,
        color: theme.text,
        background: "transparent",
      },
    }),
    el({
      id: "el_product",
      type: "text",
      name: "Product",
      x: 48,
      y: 190,
      width: 420,
      height: 40,
      zIndex: 2,
      props: {
        text: seed.product,
        fontSize: 20,
        fontWeight: 600,
        color: theme.accent,
        background: "transparent",
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 48,
      y: 250,
      width: 420,
      height: 72,
      zIndex: 2,
      props: {
        text: seed.description,
        fontSize: 16,
        fontWeight: 500,
        color: theme.muted,
        background: "transparent",
      },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 48,
      y: 360,
      width: 160,
      height: 56,
      zIndex: 3,
      props: {
        price: seed.price,
        background: theme.accent,
        color: "#111827",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 22,
      },
    }),
    el({
      id: "el_cta",
      type: "button",
      name: "CTA",
      x: 48,
      y: 440,
      width: 200,
      height: 48,
      zIndex: 3,
      props: {
        label: seed.cta,
        background: theme.panel,
        color: theme.text,
        borderRadius: 10,
        fontWeight: 700,
      },
    }),
  ];

  return buildSmartDesign({
    layout: seed.layout,
    theme,
    elements,
    editableFields: COMMON_FIELDS(seed),
    legacy: {
      badge: seed.product,
      headline: seed.title,
      subheadline: seed.description,
      price: seed.price,
      cta: seed.cta,
    },
  });
}

function buildFeatureSplit(seed: ContentSeed): DesignData {
  const theme = seed.theme;
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
      props: { background: theme.bg, borderRadius: 0 },
    }),
    el({
      id: "el_image",
      type: "image",
      name: "Image",
      x: 40,
      y: 40,
      width: 420,
      height: 460,
      zIndex: 1,
      props: {
        alt: seed.imageAlt,
        fit: "cover",
        background: theme.panel,
        borderRadius: 20,
      },
    }),
    el({
      id: "el_title",
      type: "text",
      name: "Title",
      x: 500,
      y: 64,
      width: 420,
      height: 48,
      zIndex: 2,
      props: {
        text: seed.title,
        fontSize: 18,
        fontWeight: 700,
        color: theme.accent,
        background: "transparent",
      },
    }),
    el({
      id: "el_product",
      type: "text",
      name: "Product",
      x: 500,
      y: 120,
      width: 420,
      height: 80,
      zIndex: 2,
      props: {
        text: seed.product,
        fontSize: 34,
        fontWeight: 800,
        color: theme.text,
        background: "transparent",
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 500,
      y: 220,
      width: 400,
      height: 96,
      zIndex: 2,
      props: {
        text: seed.description,
        fontSize: 16,
        fontWeight: 500,
        color: theme.muted,
        background: "transparent",
      },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 500,
      y: 360,
      width: 140,
      height: 56,
      zIndex: 3,
      props: {
        price: seed.price,
        background: theme.accent,
        color: "#111827",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 22,
      },
    }),
    el({
      id: "el_cta",
      type: "button",
      name: "CTA",
      x: 660,
      y: 364,
      width: 180,
      height: 48,
      zIndex: 3,
      props: {
        label: seed.cta,
        background: theme.panel,
        color: theme.text,
        borderRadius: 10,
        fontWeight: 700,
      },
    }),
  ];

  return buildSmartDesign({
    layout: seed.layout,
    theme,
    elements,
    editableFields: COMMON_FIELDS(seed),
    legacy: {
      badge: seed.title,
      headline: seed.product,
      subheadline: seed.description,
      body: seed.description,
      price: seed.price,
      cta: seed.cta,
    },
  });
}

function buildDealCard(seed: ContentSeed): DesignData {
  const theme = seed.theme;
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
      props: { background: theme.bg, borderRadius: 0 },
    }),
    el({
      id: "el_image",
      type: "image",
      name: "Image",
      x: 80,
      y: 80,
      width: 320,
      height: 380,
      zIndex: 1,
      props: {
        alt: seed.imageAlt,
        fit: "cover",
        background: theme.panel,
        borderRadius: 24,
      },
    }),
    el({
      id: "el_title",
      type: "text",
      name: "Title",
      x: 460,
      y: 100,
      width: 420,
      height: 48,
      zIndex: 2,
      props: {
        text: seed.title,
        fontSize: 18,
        fontWeight: 700,
        color: theme.accent,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_product",
      type: "text",
      name: "Product",
      x: 460,
      y: 160,
      width: 420,
      height: 64,
      zIndex: 2,
      props: {
        text: seed.product,
        fontSize: 32,
        fontWeight: 800,
        color: theme.text,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 480,
      y: 240,
      width: 380,
      height: 80,
      zIndex: 2,
      props: {
        text: seed.description,
        fontSize: 15,
        fontWeight: 500,
        color: theme.muted,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 560,
      y: 340,
      width: 200,
      height: 64,
      zIndex: 3,
      props: {
        price: seed.price,
        background: theme.accent,
        color: "#ffffff",
        borderRadius: 16,
        fontWeight: 800,
        fontSize: 28,
      },
    }),
    el({
      id: "el_cta",
      type: "button",
      name: "CTA",
      x: 560,
      y: 430,
      width: 200,
      height: 48,
      zIndex: 3,
      props: {
        label: seed.cta,
        background: theme.panel,
        color: theme.text,
        borderRadius: 10,
        fontWeight: 700,
      },
    }),
  ];

  return buildSmartDesign({
    layout: seed.layout,
    theme,
    elements,
    editableFields: COMMON_FIELDS(seed),
    legacy: {
      badge: seed.product,
      headline: seed.title,
      subheadline: seed.description,
      body: seed.description,
      price: seed.price,
      cta: seed.cta,
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

  // Freeform design with elements but no smart meta → mark as unlocked freeform
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
