/**
 * Elegant Food Menu — fully editable Smart Template with authored
 * portrait (9:16) and landscape (16:9) layouts that fill the artboard.
 */
import type { DesignElement, DesignElementProps } from "@/lib/design-elements";
import type { DesignData, Orientation } from "@/types/db";

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
  bindings: SmartEditableField["bindings"],
  placeholder?: string,
): SmartEditableField {
  return { id, label, kind, defaultValue, bindings, placeholder };
}

const IMG_APP = "/templates/elegant-appetizer.jpg";
const IMG_MAIN = "/templates/elegant-main.jpg";
const IMG_DRINK = "/templates/elegant-drink.jpg";
const LOGO = "/templates/good-food-logo.svg";

const THEME = {
  bg: "#3A1C1C",
  accent: "#E8D5B5",
  text: "#F5EDE0",
  muted: "#D4C4A8",
  panel: "#2A1414",
  badge: "#E8D5B5",
  badgeText: "#3A1C1C",
};

const SEED = {
  subtitle: "Restaurant",
  title: "FOOD MENU",
  cat1: "Appetizers",
  cat2: "Main Course",
  cat3: "Drinks",
  a1: "Garlic Bread",
  a1p: "$8.00",
  a2: "Chicken Wings",
  a2p: "$12.00",
  a3: "Caesar Salad",
  a3p: "$10.00",
  m1: "Grilled Chicken Pasta",
  m1p: "$18.00",
  m2: "Beef Burger + Fries",
  m2p: "$16.00",
  m3: "Teriyaki Salmon Rice Bowl",
  m3p: "$22.00",
  d1: "Iced Lemon Tea",
  d1p: "$5.00",
  d2: "Hot Cappuccino",
  d2p: "$4.50",
  d3: "Fresh Orange Juice",
  d3p: "$6.00",
  phone: "123-456-7890",
  location: "123 Anywhere St., Any City",
};

const EDITABLE_FIELDS: SmartEditableField[] = [
  field("subtitle", "Restaurant Label", "title", SEED.subtitle, [
    { elementId: "el_subtitle", prop: "text" },
  ]),
  field("title", "Menu Title", "title", SEED.title, [
    { elementId: "el_title", prop: "text" },
  ]),
  field("logo", "Logo", "logo", LOGO, [
    { elementId: "el_logo", prop: "imageUrl" },
  ]),
  field("cat1_label", "Category 1 Label", "text", SEED.cat1, [
    { elementId: "el_cat1_label", prop: "text" },
  ]),
  field("cat1_image", "Category 1 Image", "image", IMG_APP, [
    { elementId: "el_cat1_image", prop: "imageUrl" },
  ]),
  field("cat1_item1", "Appetizer 1", "product", SEED.a1, [
    { elementId: "el_cat1_item1", prop: "text" },
  ]),
  field("cat1_price1", "Appetizer 1 Price", "price", SEED.a1p, [
    { elementId: "el_cat1_price1", prop: "text" },
  ]),
  field("cat1_item2", "Appetizer 2", "product", SEED.a2, [
    { elementId: "el_cat1_item2", prop: "text" },
  ]),
  field("cat1_price2", "Appetizer 2 Price", "price", SEED.a2p, [
    { elementId: "el_cat1_price2", prop: "text" },
  ]),
  field("cat1_item3", "Appetizer 3", "product", SEED.a3, [
    { elementId: "el_cat1_item3", prop: "text" },
  ]),
  field("cat1_price3", "Appetizer 3 Price", "price", SEED.a3p, [
    { elementId: "el_cat1_price3", prop: "text" },
  ]),
  field("cat2_label", "Category 2 Label", "text", SEED.cat2, [
    { elementId: "el_cat2_label", prop: "text" },
  ]),
  field("cat2_image", "Category 2 Image", "image", IMG_MAIN, [
    { elementId: "el_cat2_image", prop: "imageUrl" },
  ]),
  field("cat2_item1", "Main 1", "product", SEED.m1, [
    { elementId: "el_cat2_item1", prop: "text" },
  ]),
  field("cat2_price1", "Main 1 Price", "price", SEED.m1p, [
    { elementId: "el_cat2_price1", prop: "text" },
  ]),
  field("cat2_item2", "Main 2", "product", SEED.m2, [
    { elementId: "el_cat2_item2", prop: "text" },
  ]),
  field("cat2_price2", "Main 2 Price", "price", SEED.m2p, [
    { elementId: "el_cat2_price2", prop: "text" },
  ]),
  field("cat2_item3", "Main 3", "product", SEED.m3, [
    { elementId: "el_cat2_item3", prop: "text" },
  ]),
  field("cat2_price3", "Main 3 Price", "price", SEED.m3p, [
    { elementId: "el_cat2_price3", prop: "text" },
  ]),
  field("cat3_label", "Category 3 Label", "text", SEED.cat3, [
    { elementId: "el_cat3_label", prop: "text" },
  ]),
  field("cat3_image", "Category 3 Image", "image", IMG_DRINK, [
    { elementId: "el_cat3_image", prop: "imageUrl" },
  ]),
  field("cat3_item1", "Drink 1", "product", SEED.d1, [
    { elementId: "el_cat3_item1", prop: "text" },
  ]),
  field("cat3_price1", "Drink 1 Price", "price", SEED.d1p, [
    { elementId: "el_cat3_price1", prop: "text" },
  ]),
  field("cat3_item2", "Drink 2", "product", SEED.d2, [
    { elementId: "el_cat3_item2", prop: "text" },
  ]),
  field("cat3_price2", "Drink 2 Price", "price", SEED.d2p, [
    { elementId: "el_cat3_price2", prop: "text" },
  ]),
  field("cat3_item3", "Drink 3", "product", SEED.d3, [
    { elementId: "el_cat3_item3", prop: "text" },
  ]),
  field("cat3_price3", "Drink 3 Price", "price", SEED.d3p, [
    { elementId: "el_cat3_price3", prop: "text" },
  ]),
  field("phone", "Phone", "text", SEED.phone, [
    { elementId: "el_phone", prop: "text" },
  ]),
  field("location", "Location", "text", SEED.location, [
    { elementId: "el_location", prop: "text" },
  ]),
];

function applyFieldDefaults(
  elements: DesignElement[],
  fields: SmartEditableField[],
): DesignElement[] {
  const byId = new Map(
    elements.map((e) => [e.id, { ...e, props: { ...e.props } }]),
  );
  for (const f of fields) {
    for (const b of f.bindings) {
      const target = byId.get(b.elementId);
      if (!target) continue;
      target.props = { ...target.props, [b.prop]: f.defaultValue };
      byId.set(b.elementId, target);
    }
  }
  return elements.map((e) => byId.get(e.id) ?? e);
}

function itemRow(
  prefix: string,
  y: number,
  nameX: number,
  nameW: number,
  priceX: number,
  priceW: number,
  name: string,
  price: string,
  fontSize: number,
): DesignElement[] {
  return [
    el({
      id: `${prefix}`,
      type: "text",
      name: name,
      x: nameX,
      y,
      width: nameW,
      height: Math.max(22, fontSize + 10),
      zIndex: 5,
      props: {
        text: name,
        fontSize,
        fontWeight: 500,
        color: THEME.text,
        background: "transparent",
      },
    }),
    el({
      id: `${prefix.replace("_item", "_price")}`,
      type: "text",
      name: `${name} price`,
      x: priceX,
      y,
      width: priceW,
      height: Math.max(22, fontSize + 10),
      zIndex: 5,
      props: {
        text: price,
        fontSize,
        fontWeight: 700,
        color: THEME.accent,
        background: "transparent",
        align: "right",
      },
    }),
  ];
}

/** Portrait 540×960 — stacked sections fill the full board. */
function portraitElements(): DesignElement[] {
  const W = 540;
  const H = 960;
  const elements: DesignElement[] = [
    el({
      id: "el_bg",
      type: "shape",
      name: "Background",
      x: 0,
      y: 0,
      width: W,
      height: H,
      zIndex: 0,
      locked: true,
      props: { background: THEME.bg },
    }),
    el({
      id: "el_logo_ring",
      type: "shape",
      name: "Logo ring",
      x: 220,
      y: 36,
      width: 100,
      height: 100,
      zIndex: 2,
      locked: true,
      props: {
        background: THEME.accent,
        borderRadius: 999,
      },
    }),
    el({
      id: "el_logo",
      type: "logo",
      name: "Logo",
      x: 235,
      y: 51,
      width: 70,
      height: 70,
      zIndex: 3,
      props: {
        imageUrl: LOGO,
        fit: "contain",
        background: "transparent",
        borderRadius: 999,
      },
    }),
    el({
      id: "el_subtitle",
      type: "text",
      name: "Restaurant Label",
      x: 70,
      y: 148,
      width: 400,
      height: 40,
      zIndex: 4,
      props: {
        text: SEED.subtitle,
        fontFamily: "serif",
        fontSize: 30,
        fontWeight: 500,
        color: THEME.accent,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_title",
      type: "text",
      name: "Menu Title",
      x: 40,
      y: 188,
      width: 460,
      height: 52,
      zIndex: 4,
      props: {
        text: SEED.title,
        fontFamily: "serif",
        fontSize: 42,
        fontWeight: 800,
        letterSpacing: 2,
        color: THEME.text,
        background: "transparent",
        align: "center",
      },
    }),
  ];

  const sections: Array<{
    key: string;
    label: string;
    image: string;
    y: number;
    items: Array<[string, string, string]>;
  }> = [
    {
      key: "cat1",
      label: SEED.cat1,
      image: IMG_APP,
      y: 260,
      items: [
        ["el_cat1_item1", SEED.a1, SEED.a1p],
        ["el_cat1_item2", SEED.a2, SEED.a2p],
        ["el_cat1_item3", SEED.a3, SEED.a3p],
      ],
    },
    {
      key: "cat2",
      label: SEED.cat2,
      image: IMG_MAIN,
      y: 480,
      items: [
        ["el_cat2_item1", SEED.m1, SEED.m1p],
        ["el_cat2_item2", SEED.m2, SEED.m2p],
        ["el_cat2_item3", SEED.m3, SEED.m3p],
      ],
    },
    {
      key: "cat3",
      label: SEED.cat3,
      image: IMG_DRINK,
      y: 700,
      items: [
        ["el_cat3_item1", SEED.d1, SEED.d1p],
        ["el_cat3_item2", SEED.d2, SEED.d2p],
        ["el_cat3_item3", SEED.d3, SEED.d3p],
      ],
    },
  ];

  for (const section of sections) {
    const { key, label, image, y, items } = section;
    elements.push(
      el({
        id: `el_${key}_image`,
        type: "image",
        name: `${label} image`,
        x: 28,
        y: y + 28,
        width: 120,
        height: 120,
        zIndex: 4,
        props: {
          imageUrl: image,
          fit: "cover",
          borderRadius: 999,
          borderWidth: 3,
          borderColor: THEME.accent,
          background: THEME.panel,
        },
      }),
      el({
        id: `el_${key}_panel`,
        type: "shape",
        name: `${label} panel`,
        x: 168,
        y: y + 18,
        width: 344,
        height: 168,
        zIndex: 3,
        locked: true,
        props: {
          background: THEME.panel,
          borderRadius: 18,
        },
      }),
      el({
        id: `el_${key}_label`,
        type: "text",
        name: label,
        x: 188,
        y: y,
        width: 160,
        height: 30,
        zIndex: 6,
        props: {
          text: label,
          fontSize: 13,
          fontWeight: 800,
          color: THEME.badgeText,
          background: THEME.badge,
          borderRadius: 999,
          align: "center",
          padding: 4,
        },
      }),
    );

    items.forEach(([id, name, price], i) => {
      const rowY = y + 44 + i * 40;
      elements.push(
        ...itemRow(
          id,
          rowY,
          188,
          220,
          410,
          84,
          name,
          price,
          15,
        ),
      );
    });
  }

  elements.push(
    el({
      id: "el_footer",
      type: "shape",
      name: "Footer bar",
      x: 0,
      y: 900,
      width: W,
      height: 60,
      zIndex: 2,
      locked: true,
      props: { background: "rgba(0,0,0,0.28)" },
    }),
    el({
      id: "el_phone",
      type: "text",
      name: "Phone",
      x: 28,
      y: 916,
      width: 200,
      height: 28,
      zIndex: 5,
      props: {
        text: SEED.phone,
        fontSize: 13,
        fontWeight: 600,
        color: THEME.accent,
        background: "transparent",
      },
    }),
    el({
      id: "el_location",
      type: "text",
      name: "Location",
      x: 240,
      y: 916,
      width: 272,
      height: 28,
      zIndex: 5,
      props: {
        text: SEED.location,
        fontSize: 12,
        fontWeight: 500,
        color: THEME.accent,
        background: "transparent",
        align: "right",
      },
    }),
  );

  return elements;
}

/** Landscape 960×540 — three columns fill the board. */
function landscapeElements(): DesignElement[] {
  const W = 960;
  const H = 540;
  const elements: DesignElement[] = [
    el({
      id: "el_bg",
      type: "shape",
      name: "Background",
      x: 0,
      y: 0,
      width: W,
      height: H,
      zIndex: 0,
      locked: true,
      props: { background: THEME.bg },
    }),
    el({
      id: "el_logo_ring",
      type: "shape",
      name: "Logo ring",
      x: 36,
      y: 24,
      width: 64,
      height: 64,
      zIndex: 2,
      locked: true,
      props: { background: THEME.accent, borderRadius: 999 },
    }),
    el({
      id: "el_logo",
      type: "logo",
      name: "Logo",
      x: 46,
      y: 34,
      width: 44,
      height: 44,
      zIndex: 3,
      props: {
        imageUrl: LOGO,
        fit: "contain",
        background: "transparent",
        borderRadius: 999,
      },
    }),
    el({
      id: "el_subtitle",
      type: "text",
      name: "Restaurant Label",
      x: 116,
      y: 28,
      width: 280,
      height: 28,
      zIndex: 4,
      props: {
        text: SEED.subtitle,
        fontFamily: "serif",
        fontSize: 22,
        fontWeight: 500,
        color: THEME.accent,
        background: "transparent",
      },
    }),
    el({
      id: "el_title",
      type: "text",
      name: "Menu Title",
      x: 116,
      y: 56,
      width: 420,
      height: 40,
      zIndex: 4,
      props: {
        text: SEED.title,
        fontFamily: "serif",
        fontSize: 32,
        fontWeight: 800,
        letterSpacing: 2,
        color: THEME.text,
        background: "transparent",
      },
    }),
    el({
      id: "el_phone",
      type: "text",
      name: "Phone",
      x: 560,
      y: 36,
      width: 180,
      height: 28,
      zIndex: 4,
      props: {
        text: SEED.phone,
        fontSize: 13,
        fontWeight: 600,
        color: THEME.accent,
        background: "transparent",
        align: "right",
      },
    }),
    el({
      id: "el_location",
      type: "text",
      name: "Location",
      x: 750,
      y: 36,
      width: 186,
      height: 40,
      zIndex: 4,
      props: {
        text: SEED.location,
        fontSize: 12,
        fontWeight: 500,
        color: THEME.muted,
        background: "transparent",
        align: "right",
      },
    }),
  ];

  const cols: Array<{
    key: string;
    label: string;
    image: string;
    x: number;
    items: Array<[string, string, string]>;
  }> = [
    {
      key: "cat1",
      label: SEED.cat1,
      image: IMG_APP,
      x: 28,
      items: [
        ["el_cat1_item1", SEED.a1, SEED.a1p],
        ["el_cat1_item2", SEED.a2, SEED.a2p],
        ["el_cat1_item3", SEED.a3, SEED.a3p],
      ],
    },
    {
      key: "cat2",
      label: SEED.cat2,
      image: IMG_MAIN,
      x: 336,
      items: [
        ["el_cat2_item1", SEED.m1, SEED.m1p],
        ["el_cat2_item2", SEED.m2, SEED.m2p],
        ["el_cat2_item3", SEED.m3, SEED.m3p],
      ],
    },
    {
      key: "cat3",
      label: SEED.cat3,
      image: IMG_DRINK,
      x: 644,
      items: [
        ["el_cat3_item1", SEED.d1, SEED.d1p],
        ["el_cat3_item2", SEED.d2, SEED.d2p],
        ["el_cat3_item3", SEED.d3, SEED.d3p],
      ],
    },
  ];

  for (const col of cols) {
    const { key, label, image, x, items } = col;
    elements.push(
      el({
        id: `el_${key}_panel`,
        type: "shape",
        name: `${label} panel`,
        x,
        y: 110,
        width: 288,
        height: 400,
        zIndex: 2,
        locked: true,
        props: { background: THEME.panel, borderRadius: 20 },
      }),
      el({
        id: `el_${key}_image`,
        type: "image",
        name: `${label} image`,
        x: x + 84,
        y: 128,
        width: 120,
        height: 120,
        zIndex: 4,
        props: {
          imageUrl: image,
          fit: "cover",
          borderRadius: 999,
          borderWidth: 3,
          borderColor: THEME.accent,
          background: THEME.bg,
        },
      }),
      el({
        id: `el_${key}_label`,
        type: "text",
        name: label,
        x: x + 54,
        y: 262,
        width: 180,
        height: 30,
        zIndex: 5,
        props: {
          text: label,
          fontSize: 14,
          fontWeight: 800,
          color: THEME.badgeText,
          background: THEME.badge,
          borderRadius: 999,
          align: "center",
          padding: 4,
        },
      }),
    );

    items.forEach(([id, name, price], i) => {
      const rowY = 310 + i * 52;
      elements.push(
        ...itemRow(id, rowY, x + 20, 170, x + 190, 78, name, price, 14),
      );
    });
  }

  return elements;
}

export function buildElegantFoodMenu(): DesignData {
  const portrait = applyFieldDefaults(portraitElements(), EDITABLE_FIELDS);
  const landscape = applyFieldDefaults(landscapeElements(), EDITABLE_FIELDS);
  const contentValues: Record<string, string> = {};
  for (const f of EDITABLE_FIELDS) contentValues[f.id] = f.defaultValue;

  return {
    smart: true,
    layoutLocked: false,
    layout: "elegant-food-menu",
    theme: THEME,
    orientation: "portrait",
    artboardWidth: 540,
    artboardHeight: 960,
    elements: portrait,
    editableFields: EDITABLE_FIELDS,
    contentValues,
    orientationLayouts: {
      portrait: {
        artboardWidth: 540,
        artboardHeight: 960,
        elements: portrait,
      },
      landscape: {
        artboardWidth: 960,
        artboardHeight: 540,
        elements: landscape,
      },
    },
    badge: "MENU",
    headline: SEED.title,
    subheadline: SEED.subtitle,
    imageUrl: IMG_APP,
  };
}

export function buildElegantFoodMenuCatalog(): Record<string, DesignData> {
  return {
    "Elegant Food Menu": buildElegantFoodMenu(),
  };
}

export type OrientationLayoutPack = {
  artboardWidth: number;
  artboardHeight: number;
  elements: DesignElement[];
};

export function getOrientationLayouts(
  data: DesignData | null | undefined,
): Partial<Record<Orientation, OrientationLayoutPack>> | null {
  const raw = data?.orientationLayouts;
  if (!raw || typeof raw !== "object") return null;
  return raw as Partial<Record<Orientation, OrientationLayoutPack>>;
}
