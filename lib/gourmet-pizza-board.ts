/**
 * Gourmet Pizza Board — 3-column Smart Template (Happy Hour | Menu grid | Lunch Combo).
 * Every photo is its own editable Image field so managers swap pics without moving layout.
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
  bindings: SmartEditableField["bindings"],
  placeholder?: string,
): SmartEditableField {
  return { id, label, kind, defaultValue, bindings, placeholder };
}

const THEME = {
  bg: "#0A0A0A",
  accent: "#F97316",
  text: "#FFFFFF",
  muted: "#D4D4D4",
  panel: "#111111",
};

const ORANGE = "#F97316";
const RED = "#DC2626";

/** Default stock images — replace per slot in Manager content / Properties. */
const IMG = {
  leftPizza1: "/templates/premium-promo-hero.jpg",
  leftPizza2: "/templates/mix-burger.jpg",
  thumb1: "/templates/mix-main.jpg",
  thumb2: "/templates/premium-food-special.jpg",
  thumb3: "/templates/elegant-main.jpg",
  thumb4: "/templates/mix-salad.jpg",
  thumb5: "/templates/elegant-appetizer.jpg",
  thumb6: "/templates/mix-dessert.jpg",
  combo: "/templates/premium-deal-hero.jpg",
  rightBg: "/templates/premium-menu-hero.jpg",
};

const PIZZAS: Array<{ id: string; name: string; img: string }> = [
  { id: "p1", name: "SMOKED SAUSAGE", img: IMG.thumb1 },
  { id: "p2", name: "PEPPERONI", img: IMG.thumb2 },
  { id: "p3", name: "MARGHERITA", img: IMG.thumb3 },
  { id: "p4", name: "PROSCIUTTO", img: IMG.thumb4 },
  { id: "p5", name: "VEGGIE SUPREME", img: IMG.thumb5 },
  { id: "p6", name: "SPICY CHICKEN", img: IMG.thumb6 },
];

function landscapeElements(): DesignElement[] {
  const elements: DesignElement[] = [
    // —— Full canvas ——
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
      props: { background: "#000000" },
    }),

    // —— LEFT column (Happy Hour) ——
    el({
      id: "el_left_bg",
      type: "shape",
      name: "Left panel",
      x: 0,
      y: 0,
      width: 320,
      height: 540,
      zIndex: 1,
      locked: true,
      props: {
        background:
          "linear-gradient(180deg, #1a0f0a 0%, #3b1a0a 45%, #7c2d12 78%, #c2410c 100%)",
      },
    }),
    el({
      id: "el_happy_title",
      type: "text",
      name: "Happy Hour title",
      x: 24,
      y: 28,
      width: 272,
      height: 56,
      zIndex: 10,
      props: {
        text: "HAPPY HOUR",
        fontSize: 42,
        fontWeight: 900,
        color: "#FFFFFF",
        align: "center",
        letterSpacing: 1,
      },
    }),
    el({
      id: "el_happy_banner",
      type: "shape",
      name: "Hours banner",
      x: 48,
      y: 92,
      width: 224,
      height: 36,
      zIndex: 9,
      props: { background: RED, borderRadius: 4 },
    }),
    el({
      id: "el_happy_hours",
      type: "text",
      name: "Happy Hour times",
      x: 48,
      y: 94,
      width: 224,
      height: 32,
      zIndex: 10,
      props: {
        text: "4PM TO 7PM",
        fontSize: 18,
        fontWeight: 800,
        color: "#FFFFFF",
        align: "center",
      },
    }),
    el({
      id: "el_happy_offer",
      type: "text",
      name: "Happy Hour offer",
      x: 28,
      y: 140,
      width: 264,
      height: 40,
      zIndex: 10,
      props: {
        text: "ALL LARGE PIZZAS 20% OFF",
        fontSize: 16,
        fontWeight: 700,
        color: "#FFFFFF",
        align: "center",
      },
    }),
    el({
      id: "el_left_pizza_1",
      type: "image",
      name: "Left pizza 1",
      x: 36,
      y: 200,
      width: 200,
      height: 200,
      zIndex: 8,
      props: {
        imageUrl: IMG.leftPizza1,
        fit: "cover",
        borderRadius: 12,
        alt: "Featured pizza",
      },
    }),
    el({
      id: "el_left_pizza_2",
      type: "image",
      name: "Left pizza 2",
      x: 100,
      y: 320,
      width: 190,
      height: 190,
      zIndex: 9,
      props: {
        imageUrl: IMG.leftPizza2,
        fit: "cover",
        borderRadius: 12,
        alt: "Featured pizza 2",
        shadow: "lg",
      },
    }),

    // —— CENTER column (Gourmet grid) ——
    el({
      id: "el_mid_bg",
      type: "shape",
      name: "Center panel",
      x: 320,
      y: 0,
      width: 320,
      height: 540,
      zIndex: 1,
      locked: true,
      props: { background: "#0A0A0A" },
    }),
    el({
      id: "el_mid_title",
      type: "text",
      name: "Menu title",
      x: 340,
      y: 28,
      width: 280,
      height: 36,
      zIndex: 10,
      props: {
        text: "GOURMET PIZZAS",
        fontSize: 26,
        fontWeight: 900,
        color: ORANGE,
        align: "center",
        letterSpacing: 1,
      },
    }),
  ];

  // 2×3 pizza grid with circular thumbs
  const colX = [348, 500];
  const rowY = [90, 240, 390];
  PIZZAS.forEach((pizza, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = colX[col];
    const y = rowY[row];
    elements.push(
      el({
        id: `el_${pizza.id}_img`,
        type: "image",
        name: `${pizza.name} photo`,
        x,
        y,
        width: 88,
        height: 88,
        zIndex: 8,
        props: {
          imageUrl: pizza.img,
          fit: "cover",
          borderRadius: 999,
          alt: pizza.name,
          borderWidth: 2,
          borderColor: ORANGE,
        },
      }),
      el({
        id: `el_${pizza.id}_name`,
        type: "text",
        name: `${pizza.name} label`,
        x: x - 8,
        y: y + 96,
        width: 104,
        height: 36,
        zIndex: 10,
        props: {
          text: pizza.name,
          fontSize: 12,
          fontWeight: 800,
          color: "#FFFFFF",
          align: "center",
        },
      }),
    );
  });

  // —— RIGHT column (Lunch Combo) ——
  elements.push(
    el({
      id: "el_right_bg_img",
      type: "image",
      name: "Right background",
      x: 640,
      y: 0,
      width: 320,
      height: 540,
      zIndex: 1,
      props: {
        imageUrl: IMG.rightBg,
        fit: "cover",
        alt: "Restaurant background",
        opacity: 0.55,
      },
    }),
    el({
      id: "el_right_scrim",
      type: "shape",
      name: "Right scrim",
      x: 640,
      y: 0,
      width: 320,
      height: 540,
      zIndex: 2,
      locked: true,
      props: {
        background:
          "linear-gradient(180deg, rgba(255,248,240,0.92) 0%, rgba(255,248,240,0.55) 42%, rgba(255,248,240,0.2) 100%)",
      },
    }),
    el({
      id: "el_combo_title",
      type: "text",
      name: "Combo title",
      x: 660,
      y: 28,
      width: 280,
      height: 40,
      zIndex: 10,
      props: {
        text: "LUNCH COMBO",
        fontSize: 30,
        fontWeight: 900,
        color: ORANGE,
        align: "center",
      },
    }),
    el({
      id: "el_combo_desc",
      type: "text",
      name: "Combo description",
      x: 660,
      y: 76,
      width: 280,
      height: 48,
      zIndex: 10,
      props: {
        text: "1 MEDIUM PIZZA OF YOUR CHOICE + 1 SALAD + 1 SOFT DRINK",
        fontSize: 12,
        fontWeight: 600,
        color: "#1C1917",
        align: "center",
      },
    }),
    el({
      id: "el_combo_price_badge",
      type: "shape",
      name: "Price badge",
      x: 722,
      y: 136,
      width: 116,
      height: 116,
      zIndex: 11,
      props: { background: ORANGE, borderRadius: 999 },
    }),
    el({
      id: "el_combo_price",
      type: "price-badge",
      name: "Combo price",
      x: 722,
      y: 160,
      width: 116,
      height: 68,
      zIndex: 12,
      props: {
        price: "$11.99",
        text: "$11.99",
        fontSize: 28,
        fontWeight: 900,
        color: "#FFFFFF",
        align: "center",
        background: "transparent",
      },
    }),
    el({
      id: "el_combo_photo",
      type: "image",
      name: "Combo photo",
      x: 660,
      y: 270,
      width: 280,
      height: 240,
      zIndex: 8,
      props: {
        imageUrl: IMG.combo,
        fit: "cover",
        borderRadius: 16,
        alt: "Lunch combo",
        shadow: "md",
      },
    }),
  );

  return elements;
}

const EDITABLE_FIELDS: SmartEditableField[] = [
  field("happy_title", "Happy Hour title", "title", "HAPPY HOUR", [
    { elementId: "el_happy_title", prop: "text" },
  ]),
  field("happy_hours", "Happy Hour times", "text", "4PM TO 7PM", [
    { elementId: "el_happy_hours", prop: "text" },
  ]),
  field(
    "happy_offer",
    "Happy Hour offer",
    "description",
    "ALL LARGE PIZZAS 20% OFF",
    [{ elementId: "el_happy_offer", prop: "text" }],
  ),
  field("left_pizza_1", "Left pizza photo 1", "image", IMG.leftPizza1, [
    { elementId: "el_left_pizza_1", prop: "imageUrl" },
  ]),
  field("left_pizza_2", "Left pizza photo 2", "image", IMG.leftPizza2, [
    { elementId: "el_left_pizza_2", prop: "imageUrl" },
  ]),
  field("mid_title", "Center menu title", "title", "GOURMET PIZZAS", [
    { elementId: "el_mid_title", prop: "text" },
  ]),
  ...PIZZAS.flatMap((p, i) => [
    field(
      `${p.id}_name`,
      `Pizza ${i + 1} name`,
      "product",
      p.name,
      [{ elementId: `el_${p.id}_name`, prop: "text" }],
    ),
    field(
      `${p.id}_img`,
      `Pizza ${i + 1} photo`,
      "image",
      p.img,
      [{ elementId: `el_${p.id}_img`, prop: "imageUrl" }],
    ),
  ]),
  field("combo_title", "Combo title", "title", "LUNCH COMBO", [
    { elementId: "el_combo_title", prop: "text" },
  ]),
  field(
    "combo_desc",
    "Combo description",
    "description",
    "1 MEDIUM PIZZA OF YOUR CHOICE + 1 SALAD + 1 SOFT DRINK",
    [{ elementId: "el_combo_desc", prop: "text" }],
  ),
  field("combo_price", "Combo price", "price", "$11.99", [
    { elementId: "el_combo_price", prop: "price" },
    { elementId: "el_combo_price", prop: "text" },
  ]),
  field("combo_photo", "Combo photo", "image", IMG.combo, [
    { elementId: "el_combo_photo", prop: "imageUrl" },
  ]),
  field("right_bg", "Right background photo", "image", IMG.rightBg, [
    { elementId: "el_right_bg_img", prop: "imageUrl" },
  ]),
];

export function buildGourmetPizzaBoard(): DesignData {
  const elements = landscapeElements();
  const contentValues: Record<string, string> = {};
  for (const f of EDITABLE_FIELDS) contentValues[f.id] = f.defaultValue;

  const byId = new Map(
    elements.map((e) => [e.id, { ...e, props: { ...e.props } }]),
  );
  for (const f of EDITABLE_FIELDS) {
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
    layout: "gourmet-pizza-board",
    theme: THEME,
    orientation: "landscape",
    artboardWidth: 960,
    artboardHeight: 540,
    elements: elements.map((e) => byId.get(e.id) ?? e),
    editableFields: EDITABLE_FIELDS,
    contentValues,
    badge: "HAPPY HOUR",
    headline: "GOURMET PIZZAS",
    subheadline: "LUNCH COMBO",
    price: "$11.99",
    imageUrl: IMG.combo,
  };
}

export function buildGourmetPizzaBoardCatalog(): Record<string, DesignData> {
  return {
    "Gourmet Pizza Board": buildGourmetPizzaBoard(),
  };
}
