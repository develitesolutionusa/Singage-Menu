/**
 * Complete premium 16:9 menu-board Smart Templates — one per restaurant category.
 * Visual system matches Premium Food Special (charcoal + gold/orange, layout locked).
 */
import type { DesignElement, DesignElementProps } from "@/lib/design-elements";
import type { DesignData } from "@/types/db";

type SmartFieldKind =
  | "title"
  | "product"
  | "description"
  | "price"
  | "image"
  | "logo"
  | "cta"
  | "text"
  | "dynamic";

type SmartEditableField = {
  id: string;
  label: string;
  kind: SmartFieldKind;
  bindings: Array<{ elementId: string; prop: keyof DesignElementProps }>;
  defaultValue: string;
  placeholder?: string;
};

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
  bindings: Array<{ elementId: string; prop: keyof DesignElementProps }>,
  placeholder?: string,
): SmartEditableField {
  return { id, label, kind, defaultValue, bindings, placeholder };
}

function buildSmartDesign(input: {
  layout: string;
  theme: NonNullable<DesignData["theme"]>;
  elements: DesignElement[];
  editableFields: SmartEditableField[];
  legacy?: Partial<DesignData>;
}): DesignData {
  const contentValues: Record<string, string> = {};
  for (const f of input.editableFields) contentValues[f.id] = f.defaultValue;

  const byId = new Map(
    input.elements.map((e) => [e.id, { ...e, props: { ...e.props } }]),
  );
  for (const f of input.editableFields) {
    const value = contentValues[f.id] ?? f.defaultValue;
    for (const b of f.bindings) {
      const target = byId.get(b.elementId);
      if (!target) continue;
      target.props = { ...target.props, [b.prop]: value };
      byId.set(b.elementId, target);
    }
  }

  return {
    smart: true,
    layoutLocked: true,
    layout: input.layout,
    theme: input.theme,
    elements: input.elements.map((e) => byId.get(e.id) ?? e),
    editableFields: input.editableFields,
    contentValues,
    ...input.legacy,
  };
}

const LOGO = "/templates/good-food-logo.svg";
const GOLD = "#D4AF37";
const ORANGE = "#FF9900";
const BG = "#141414";
const PANEL = "#1c1c1c";
const TEXT = "#FFFFFF";
const MUTED = "#D4D4D4";

const SHARED_THEME = {
  bg: BG,
  accent: ORANGE,
  text: TEXT,
  muted: MUTED,
  panel: PANEL,
};

function headerElements(prefix: string): DesignElement[] {
  return [
    el({
      id: `${prefix}_bg`,
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
    el({
      id: "el_logo",
      type: "logo",
      name: "Logo",
      x: 36,
      y: 22,
      width: 44,
      height: 44,
      zIndex: 6,
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
      x: 90,
      y: 22,
      width: 320,
      height: 28,
      zIndex: 6,
      props: {
        text: "THE GOOD FOOD",
        fontFamily: "sans",
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: 1.4,
        color: TEXT,
        background: "transparent",
        align: "left",
        dataSource: "restaurant",
        field: "name",
        fallback: "THE GOOD FOOD",
      },
    }),
    el({
      id: `${prefix}_tag`,
      type: "text",
      name: "Restaurant Tag",
      x: 90,
      y: 48,
      width: 200,
      height: 18,
      zIndex: 6,
      locked: true,
      props: {
        text: "-  RESTAURANT  -",
        fontFamily: "sans",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 2,
        color: GOLD,
        background: "transparent",
        align: "left",
      },
    }),
  ];
}

function footerElements(): DesignElement[] {
  return [
    el({
      id: "el_footer_line",
      type: "divider",
      name: "Footer line",
      x: 36,
      y: 492,
      width: 888,
      height: 6,
      zIndex: 5,
      locked: true,
      props: { background: GOLD, opacity: 80 },
    }),
    el({
      id: "el_phone",
      type: "contact",
      name: "Phone",
      x: 36,
      y: 506,
      width: 260,
      height: 26,
      zIndex: 6,
      props: {
        text: "Phone  +1 234 567 8900",
        fontFamily: "sans",
        fontSize: 11,
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
      y: 506,
      width: 280,
      height: 26,
      zIndex: 6,
      props: {
        text: "123 Food Street, NY",
        fontFamily: "sans",
        fontSize: 11,
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
      y: 506,
      width: 300,
      height: 26,
      zIndex: 6,
      props: {
        text: "Open Daily | 11AM - 11PM",
        fontFamily: "sans",
        fontSize: 11,
        fontWeight: 500,
        color: TEXT,
        background: "transparent",
      },
    }),
  ];
}

function sharedContactFields(): SmartEditableField[] {
  return [
    field("restaurant_name", "Restaurant Name", "title", "THE GOOD FOOD", [
      { elementId: "el_restaurant_name", prop: "text" },
    ]),
    field("logo", "Logo", "logo", LOGO, [
      { elementId: "el_logo", prop: "imageUrl" },
    ]),
    field(
      "phone",
      "Phone",
      "text",
      "Phone  +1 234 567 8900",
      [{ elementId: "el_phone", prop: "text" }],
      "+1 234 567 8900",
    ),
    field(
      "location",
      "Location",
      "text",
      "123 Food Street, NY",
      [{ elementId: "el_location", prop: "text" }],
      "123 Food Street, NY",
    ),
    field(
      "hours",
      "Business Hours",
      "text",
      "Open Daily | 11AM - 11PM",
      [{ elementId: "el_hours", prop: "text" }],
      "Open Daily | 11AM - 11PM",
    ),
  ];
}

/**
 * Premium Menu Board — full three-column digital menu with hero photo.
 * Category: Menu
 */
export function buildPremiumMenuBoard(): DesignData {
  const HERO = "/templates/premium-menu-hero.jpg";
  const headline = "Tonight's Menu";
  const subheadline = "Kitchen open · Fresh daily";
  const starters =
    "STARTERS\n\nSoup of the Day .............. $8\nHouse Salad ................. $10\nCalamari .................... $14\nBruschetta .................. $11";
  const mains =
    "MAINS\n\nGrilled Salmon .............. $28\nRibeye Steak ................ $36\nPasta Primavera ............. $22\nHerb Chicken ................ $24";
  const desserts =
    "DESSERTS\n\nTiramisu .................... $9\nChocolate Lava .............. $10\nCheesecake .................. $8\nGelato Duo .................. $7";

  const elements: DesignElement[] = [
    ...headerElements("pmb"),
    el({
      id: "el_headline",
      type: "text",
      name: "Headline",
      x: 36,
      y: 78,
      width: 420,
      height: 36,
      zIndex: 6,
      props: {
        text: headline,
        fontFamily: "serif",
        fontSize: 28,
        fontWeight: 700,
        color: TEXT,
        background: "transparent",
        align: "left",
      },
    }),
    el({
      id: "el_subheadline",
      type: "text",
      name: "Subheadline",
      x: 36,
      y: 114,
      width: 360,
      height: 22,
      zIndex: 6,
      props: {
        text: subheadline,
        fontFamily: "script",
        fontSize: 16,
        fontWeight: 600,
        color: ORANGE,
        background: "transparent",
        align: "left",
      },
    }),
    el({
      id: "el_badge_bg",
      type: "shape",
      name: "Menu badge",
      x: 820,
      y: 26,
      width: 104,
      height: 32,
      zIndex: 6,
      locked: true,
      props: { background: GOLD, borderRadius: 6 },
    }),
    el({
      id: "el_badge",
      type: "text",
      name: "Badge",
      x: 820,
      y: 26,
      width: 104,
      height: 32,
      zIndex: 7,
      props: {
        text: "FULL MENU",
        fontFamily: "sans",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1,
        color: "#111111",
        background: "transparent",
        align: "center",
      },
    }),
    // Three column panels
    el({
      id: "el_panel_a",
      type: "shape",
      name: "Starters panel",
      x: 36,
      y: 148,
      width: 288,
      height: 250,
      zIndex: 2,
      locked: true,
      props: {
        background: PANEL,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#2a2a2a",
      },
    }),
    el({
      id: "el_panel_b",
      type: "shape",
      name: "Mains panel",
      x: 336,
      y: 148,
      width: 288,
      height: 250,
      zIndex: 2,
      locked: true,
      props: {
        background: PANEL,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#2a2a2a",
      },
    }),
    el({
      id: "el_panel_c",
      type: "shape",
      name: "Desserts panel",
      x: 636,
      y: 148,
      width: 288,
      height: 250,
      zIndex: 2,
      locked: true,
      props: {
        background: PANEL,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#2a2a2a",
      },
    }),
    el({
      id: "el_starters",
      type: "text",
      name: "Starters",
      x: 52,
      y: 162,
      width: 256,
      height: 220,
      zIndex: 5,
      props: {
        text: starters,
        fontFamily: "sans",
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.55,
        color: TEXT,
        background: "transparent",
        align: "left",
      },
    }),
    el({
      id: "el_mains",
      type: "text",
      name: "Mains",
      x: 352,
      y: 162,
      width: 256,
      height: 220,
      zIndex: 5,
      props: {
        text: mains,
        fontFamily: "sans",
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.55,
        color: TEXT,
        background: "transparent",
        align: "left",
      },
    }),
    el({
      id: "el_desserts",
      type: "text",
      name: "Desserts",
      x: 652,
      y: 162,
      width: 256,
      height: 220,
      zIndex: 5,
      props: {
        text: desserts,
        fontFamily: "sans",
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.55,
        color: TEXT,
        background: "transparent",
        align: "left",
      },
    }),
    // Accent gold tops on panels
    el({
      id: "el_accent_a",
      type: "shape",
      name: "Accent A",
      x: 36,
      y: 148,
      width: 288,
      height: 4,
      zIndex: 3,
      locked: true,
      props: { background: GOLD, borderRadius: 2 },
    }),
    el({
      id: "el_accent_b",
      type: "shape",
      name: "Accent B",
      x: 336,
      y: 148,
      width: 288,
      height: 4,
      zIndex: 3,
      locked: true,
      props: { background: ORANGE, borderRadius: 2 },
    }),
    el({
      id: "el_accent_c",
      type: "shape",
      name: "Accent C",
      x: 636,
      y: 148,
      width: 288,
      height: 4,
      zIndex: 3,
      locked: true,
      props: { background: GOLD, borderRadius: 2 },
    }),
    // Hero strip under columns
    el({
      id: "el_image",
      type: "image",
      name: "Hero Image",
      x: 36,
      y: 410,
      width: 200,
      height: 72,
      zIndex: 4,
      props: {
        imageUrl: HERO,
        alt: "Featured steak",
        fit: "cover",
        background: PANEL,
        borderRadius: 10,
        shadow: "md",
        dataSource: "product",
        field: "image",
        fallback: HERO,
      },
    }),
    el({
      id: "el_product",
      type: "text",
      name: "Featured Dish",
      x: 252,
      y: 418,
      width: 280,
      height: 28,
      zIndex: 5,
      props: {
        text: "Chef's Ribeye",
        fontFamily: "serif",
        fontSize: 20,
        fontWeight: 700,
        color: TEXT,
        background: "transparent",
        dataSource: "product",
        field: "name",
        fallback: "Chef's Ribeye",
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Featured Description",
      x: 252,
      y: 446,
      width: 360,
      height: 28,
      zIndex: 5,
      props: {
        text: "Char-seared · Red wine reduction · Roasted roots",
        fontFamily: "sans",
        fontSize: 12,
        fontWeight: 400,
        color: MUTED,
        background: "transparent",
        dataSource: "product",
        field: "description",
        fallback: "Char-seared · Red wine reduction · Roasted roots",
      },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Featured Price",
      x: 780,
      y: 424,
      width: 144,
      height: 44,
      zIndex: 6,
      props: {
        price: "$36",
        fontFamily: "sans",
        fontSize: 24,
        fontWeight: 800,
        color: "#111111",
        background: ORANGE,
        borderRadius: 10,
        shadow: "md",
        dataSource: "product",
        field: "price",
        fallback: "$36",
      },
    }),
    ...footerElements(),
  ];

  const editableFields: SmartEditableField[] = [
    ...sharedContactFields(),
    field("headline", "Headline", "title", headline, [
      { elementId: "el_headline", prop: "text" },
    ]),
    field("subheadline", "Subheadline", "text", subheadline, [
      { elementId: "el_subheadline", prop: "text" },
    ]),
    field("badge", "Badge", "text", "FULL MENU", [
      { elementId: "el_badge", prop: "text" },
    ]),
    field("starters", "Starters Column", "text", starters, [
      { elementId: "el_starters", prop: "text" },
    ]),
    field("mains", "Mains Column", "text", mains, [
      { elementId: "el_mains", prop: "text" },
    ]),
    field("desserts", "Desserts Column", "text", desserts, [
      { elementId: "el_desserts", prop: "text" },
    ]),
    field("product", "Featured Dish", "product", "Chef's Ribeye", [
      { elementId: "el_product", prop: "text" },
    ]),
    field(
      "description",
      "Featured Description",
      "description",
      "Char-seared · Red wine reduction · Roasted roots",
      [{ elementId: "el_description", prop: "text" }],
    ),
    field("price", "Featured Price", "price", "$36", [
      { elementId: "el_price", prop: "price" },
      { elementId: "el_price", prop: "text" },
    ]),
    field("image", "Hero Image", "image", HERO, [
      { elementId: "el_image", prop: "imageUrl" },
    ]),
  ];

  return buildSmartDesign({
    layout: "premium-menu-board",
    theme: SHARED_THEME,
    elements,
    editableFields,
    legacy: {
      badge: "FULL MENU",
      headline,
      subheadline,
      price: "$36",
      imageUrl: HERO,
      sections: [
        {
          title: "Starters",
          items: [
            { name: "Soup of the Day", price: "$8" },
            { name: "House Salad", price: "$10" },
            { name: "Calamari", price: "$14" },
          ],
        },
        {
          title: "Mains",
          items: [
            { name: "Grilled Salmon", price: "$28" },
            { name: "Ribeye Steak", price: "$36" },
            { name: "Pasta Primavera", price: "$22" },
          ],
        },
      ],
    },
  });
}

/**
 * Premium Promotion Board — bold limited-time offer with hero photo.
 * Category: Promotion
 */
export function buildPremiumPromotionBoard(): DesignData {
  const HERO = "/templates/premium-promo-hero.jpg";
  const badge = "LIMITED TIME";
  const promo = "Weekend Promo";
  const product = "Gourmet Burger Feast";
  const description =
    "Juicy brioche burger with aged cheddar, crispy fries and house sauce. Available Fri–Sun only.";
  const price = "From $12";
  const cta = "ORDER NOW →";
  const feature1 = "50% Off";
  const feature2 = "Free Fries";
  const feature3 = "Dine-In";

  const elements: DesignElement[] = [
    ...headerElements("ppb"),
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
          "linear-gradient(90deg, #0f0f0f 0%, #141414 65%, transparent 100%)",
        borderRadius: 0,
      },
    }),
    el({
      id: "el_badge_bg",
      type: "shape",
      name: "Badge bg",
      x: 36,
      y: 96,
      width: 130,
      height: 28,
      zIndex: 5,
      locked: true,
      props: { background: "#ef4444", borderRadius: 6 },
    }),
    el({
      id: "el_badge",
      type: "text",
      name: "Badge",
      x: 36,
      y: 96,
      width: 130,
      height: 28,
      zIndex: 6,
      props: {
        text: badge,
        fontFamily: "sans",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1,
        color: "#ffffff",
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_promo",
      type: "text",
      name: "Promotion Label",
      x: 36,
      y: 136,
      width: 400,
      height: 34,
      zIndex: 6,
      props: {
        text: promo,
        fontFamily: "script",
        fontSize: 26,
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
      x: 36,
      y: 172,
      width: 440,
      height: 56,
      zIndex: 6,
      props: {
        text: product,
        fontFamily: "serif",
        fontSize: 36,
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
      x: 36,
      y: 236,
      width: 420,
      height: 64,
      zIndex: 6,
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
    el({
      id: "el_feature_1",
      type: "text",
      name: "Feature 1",
      x: 36,
      y: 312,
      width: 120,
      height: 36,
      zIndex: 6,
      props: {
        text: feature1,
        fontFamily: "sans",
        fontSize: 13,
        fontWeight: 700,
        color: GOLD,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_feature_div_1",
      type: "shape",
      name: "Feature divider 1",
      x: 164,
      y: 318,
      width: 2,
      height: 24,
      zIndex: 5,
      locked: true,
      props: { background: GOLD, borderRadius: 1, opacity: 70 },
    }),
    el({
      id: "el_feature_2",
      type: "text",
      name: "Feature 2",
      x: 176,
      y: 312,
      width: 120,
      height: 36,
      zIndex: 6,
      props: {
        text: feature2,
        fontFamily: "sans",
        fontSize: 13,
        fontWeight: 700,
        color: GOLD,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_feature_div_2",
      type: "shape",
      name: "Feature divider 2",
      x: 304,
      y: 318,
      width: 2,
      height: 24,
      zIndex: 5,
      locked: true,
      props: { background: GOLD, borderRadius: 1, opacity: 70 },
    }),
    el({
      id: "el_feature_3",
      type: "text",
      name: "Feature 3",
      x: 316,
      y: 312,
      width: 120,
      height: 36,
      zIndex: 6,
      props: {
        text: feature3,
        fontFamily: "sans",
        fontSize: 13,
        fontWeight: 700,
        color: GOLD,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_price_bg",
      type: "shape",
      name: "Price brush",
      x: 36,
      y: 368,
      width: 148,
      height: 48,
      zIndex: 5,
      locked: true,
      props: { background: ORANGE, borderRadius: 8, shadow: "md" },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 36,
      y: 368,
      width: 148,
      height: 48,
      zIndex: 7,
      props: {
        price,
        fontFamily: "sans",
        fontSize: 22,
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
      y: 372,
      width: 180,
      height: 44,
      zIndex: 7,
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
    el({
      id: "el_image",
      type: "image",
      name: "Product Image",
      x: 500,
      y: 80,
      width: 424,
      height: 380,
      zIndex: 3,
      props: {
        imageUrl: HERO,
        alt: "Gourmet burger",
        fit: "cover",
        background: PANEL,
        borderRadius: 18,
        shadow: "lg",
        dataSource: "product",
        field: "image",
        fallback: HERO,
      },
    }),
    ...footerElements(),
  ];

  const editableFields: SmartEditableField[] = [
    ...sharedContactFields(),
    field("badge", "Badge", "text", badge, [
      { elementId: "el_badge", prop: "text" },
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
    field("feature_1", "Feature 1", "text", feature1, [
      { elementId: "el_feature_1", prop: "text" },
    ]),
    field("feature_2", "Feature 2", "text", feature2, [
      { elementId: "el_feature_2", prop: "text" },
    ]),
    field("feature_3", "Feature 3", "text", feature3, [
      { elementId: "el_feature_3", prop: "text" },
    ]),
    field("price", "Price", "price", price, [
      { elementId: "el_price", prop: "price" },
      { elementId: "el_price", prop: "text" },
    ]),
    field("cta", "CTA", "cta", cta, [
      { elementId: "el_cta", prop: "label" },
    ]),
    field("image", "Product Image", "image", HERO, [
      { elementId: "el_image", prop: "imageUrl" },
    ]),
  ];

  return buildSmartDesign({
    layout: "premium-promotion-board",
    theme: { ...SHARED_THEME, accent: "#ef4444" },
    elements,
    editableFields,
    legacy: {
      badge,
      headline: product,
      subheadline: description,
      price,
      cta,
      imageUrl: HERO,
    },
  });
}

/**
 * Premium Deal Board — family/combo deal with included items + hero.
 * Category: Deal
 */
export function buildPremiumDealBoard(): DesignData {
  const HERO = "/templates/premium-deal-hero.jpg";
  const badge = "FAMILY DEAL";
  const promo = "Feed the Table";
  const product = "Pizza Night Combo";
  const description =
    "2 supreme pizzas · Large garden salad · Soft drinks. Perfect for 3–4 guests.";
  const price = "$39.99";
  const cta = "GET THE DEAL →";
  const item1Name = "2 Supreme Pizzas";
  const item1Price = "Included";
  const item2Name = "Garden Salad";
  const item2Price = "Included";
  const item3Name = "Soft Drinks";
  const item3Price = "Included";

  const elements: DesignElement[] = [
    ...headerElements("pdb"),
    el({
      id: "el_image",
      type: "image",
      name: "Hero Image",
      x: 36,
      y: 88,
      width: 420,
      height: 300,
      zIndex: 3,
      props: {
        imageUrl: HERO,
        alt: "Family pizza combo",
        fit: "cover",
        background: PANEL,
        borderRadius: 16,
        shadow: "lg",
        dataSource: "product",
        field: "image",
        fallback: HERO,
      },
    }),
    el({
      id: "el_badge_bg",
      type: "shape",
      name: "Badge bg",
      x: 52,
      y: 104,
      width: 128,
      height: 28,
      zIndex: 6,
      locked: true,
      props: { background: GOLD, borderRadius: 6 },
    }),
    el({
      id: "el_badge",
      type: "text",
      name: "Badge",
      x: 52,
      y: 104,
      width: 128,
      height: 28,
      zIndex: 7,
      props: {
        text: badge,
        fontFamily: "sans",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1,
        color: "#111111",
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_promo",
      type: "text",
      name: "Deal Label",
      x: 490,
      y: 88,
      width: 430,
      height: 32,
      zIndex: 6,
      props: {
        text: promo,
        fontFamily: "script",
        fontSize: 24,
        fontWeight: 600,
        color: ORANGE,
        background: "transparent",
        align: "left",
      },
    }),
    el({
      id: "el_product",
      type: "text",
      name: "Deal Name",
      x: 490,
      y: 122,
      width: 430,
      height: 48,
      zIndex: 6,
      props: {
        text: product,
        fontFamily: "serif",
        fontSize: 32,
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
      x: 490,
      y: 176,
      width: 430,
      height: 52,
      zIndex: 6,
      props: {
        text: description,
        fontFamily: "sans",
        fontSize: 13,
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
    // Included items as menu-cards
    el({
      id: "el_item_1",
      type: "menu-card",
      name: "Included 1",
      x: 490,
      y: 240,
      width: 138,
      height: 88,
      zIndex: 5,
      props: {
        name: item1Name,
        price: item1Price,
        category: "INCLUDED",
        background: PANEL,
        color: TEXT,
        borderRadius: 12,
        shadow: "sm",
        padding: 10,
        borderWidth: 1,
        borderColor: "#2a2a2a",
      },
    }),
    el({
      id: "el_item_2",
      type: "menu-card",
      name: "Included 2",
      x: 636,
      y: 240,
      width: 138,
      height: 88,
      zIndex: 5,
      props: {
        name: item2Name,
        price: item2Price,
        category: "INCLUDED",
        background: PANEL,
        color: TEXT,
        borderRadius: 12,
        shadow: "sm",
        padding: 10,
        borderWidth: 1,
        borderColor: "#2a2a2a",
      },
    }),
    el({
      id: "el_item_3",
      type: "menu-card",
      name: "Included 3",
      x: 782,
      y: 240,
      width: 138,
      height: 88,
      zIndex: 5,
      props: {
        name: item3Name,
        price: item3Price,
        category: "INCLUDED",
        background: PANEL,
        color: TEXT,
        borderRadius: 12,
        shadow: "sm",
        padding: 10,
        borderWidth: 1,
        borderColor: "#2a2a2a",
      },
    }),
    el({
      id: "el_price_bg",
      type: "shape",
      name: "Price brush",
      x: 490,
      y: 348,
      width: 160,
      height: 48,
      zIndex: 5,
      locked: true,
      props: { background: ORANGE, borderRadius: 8, shadow: "md" },
    }),
    el({
      id: "el_price",
      type: "price-badge",
      name: "Price",
      x: 490,
      y: 348,
      width: 160,
      height: 48,
      zIndex: 7,
      props: {
        price,
        fontFamily: "sans",
        fontSize: 24,
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
      x: 668,
      y: 352,
      width: 200,
      height: 44,
      zIndex: 7,
      props: {
        label: cta,
        fontFamily: "sans",
        fontSize: 14,
        fontWeight: 800,
        background: GOLD,
        color: "#111111",
        borderRadius: 999,
        shadow: "md",
        align: "center",
      },
    }),
    el({
      id: "el_save_note",
      type: "text",
      name: "Savings note",
      x: 36,
      y: 400,
      width: 420,
      height: 24,
      zIndex: 5,
      props: {
        text: "Save $18 vs ordering separately · Dine-in or takeout",
        fontFamily: "sans",
        fontSize: 12,
        fontWeight: 500,
        color: GOLD,
        background: "transparent",
        align: "left",
      },
    }),
    ...footerElements(),
  ];

  const editableFields: SmartEditableField[] = [
    ...sharedContactFields(),
    field("badge", "Badge", "text", badge, [
      { elementId: "el_badge", prop: "text" },
    ]),
    field("promo", "Deal Label", "title", promo, [
      { elementId: "el_promo", prop: "text" },
    ]),
    field("product", "Deal Name", "product", product, [
      { elementId: "el_product", prop: "text" },
    ]),
    field("description", "Description", "description", description, [
      { elementId: "el_description", prop: "text" },
    ]),
    field("item_1_name", "Item 1 Name", "text", item1Name, [
      { elementId: "el_item_1", prop: "name" },
    ]),
    field("item_1_price", "Item 1 Price", "text", item1Price, [
      { elementId: "el_item_1", prop: "price" },
    ]),
    field("item_2_name", "Item 2 Name", "text", item2Name, [
      { elementId: "el_item_2", prop: "name" },
    ]),
    field("item_2_price", "Item 2 Price", "text", item2Price, [
      { elementId: "el_item_2", prop: "price" },
    ]),
    field("item_3_name", "Item 3 Name", "text", item3Name, [
      { elementId: "el_item_3", prop: "name" },
    ]),
    field("item_3_price", "Item 3 Price", "text", item3Price, [
      { elementId: "el_item_3", prop: "price" },
    ]),
    field("price", "Deal Price", "price", price, [
      { elementId: "el_price", prop: "price" },
      { elementId: "el_price", prop: "text" },
    ]),
    field("cta", "CTA", "cta", cta, [
      { elementId: "el_cta", prop: "label" },
    ]),
    field("image", "Hero Image", "image", HERO, [
      { elementId: "el_image", prop: "imageUrl" },
    ]),
    field(
      "save_note",
      "Savings Note",
      "text",
      "Save $18 vs ordering separately · Dine-in or takeout",
      [{ elementId: "el_save_note", prop: "text" }],
    ),
  ];

  return buildSmartDesign({
    layout: "premium-deal-board",
    theme: SHARED_THEME,
    elements,
    editableFields,
    legacy: {
      badge,
      headline: product,
      subheadline: description,
      price,
      cta,
      imageUrl: HERO,
      body: "Serves 3–4 · Dine-in or takeout",
    },
  });
}

/** Catalog of complete premium boards keyed by template name. */
export function buildPremiumMenuBoards(): Record<string, DesignData> {
  return {
    "Premium Menu Board": buildPremiumMenuBoard(),
    "Premium Promotion Board": buildPremiumPromotionBoard(),
    "Premium Deal Board": buildPremiumDealBoard(),
  };
}
