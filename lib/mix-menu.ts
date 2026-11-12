/**
 * Mix Menu — multi-category board (Main, Salads, Burgers, Beverages, Desserts)
 * matching the "Delicious Menu" reference. Fully editable. Portrait + landscape.
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

type MenuItem = { name: string; desc: string; price: string };
type CategorySeed = {
  key: string;
  title: string;
  image: string;
  headerColor: string;
  borderColor: string;
  items: MenuItem[];
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
): SmartEditableField {
  return { id, label, kind, defaultValue, bindings };
}

const OLIVE = "#4B5320";
const OLIVE_DARK = "#3A4218";
const RUST = "#A0522D";
const RUST_DARK = "#7A3B1E";
const CREAM = "#F7F3EA";
const WHITE = "#FFFFFF";
const MUTED = "#6B6B6B";
const TEXT = "#2C2C2C";
const STAR = "✦";

const THEME = {
  bg: CREAM,
  accent: OLIVE,
  text: TEXT,
  muted: MUTED,
  panel: WHITE,
  badge: OLIVE,
  badgeText: WHITE,
};

const LOGO = "/templates/good-food-logo.svg";
const HERO = "/templates/mix-hero-salad.jpg";

const CATEGORIES: CategorySeed[] = [
  {
    key: "main",
    title: "MAIN COURSE",
    image: "/templates/mix-main.jpg",
    headerColor: OLIVE,
    borderColor: OLIVE,
    items: [
      { name: "Grilled Salmon", desc: "Lemon herb glaze", price: "$18" },
      { name: "Chicken Teriyaki", desc: "Steamed rice", price: "$18" },
      { name: "Beef Stroganoff", desc: "Creamy sauce", price: "$18" },
      { name: "Vegetable Stir Fry", desc: "Fresh garden mix", price: "$18" },
      { name: "Fish & Chips", desc: "Tartar sauce", price: "$18" },
    ],
  },
  {
    key: "salads",
    title: "SALADS & SOUP",
    image: "/templates/mix-salad.jpg",
    headerColor: RUST,
    borderColor: RUST,
    items: [
      { name: "Caesar Salad", desc: "Croutons & parmesan", price: "$10" },
      { name: "Greek Salad", desc: "Feta & olives", price: "$10" },
      { name: "Tomato Soup", desc: "Basil garnish", price: "$10" },
      { name: "Mushroom Soup", desc: "Creamy broth", price: "$10" },
      { name: "Garden Salad", desc: "House dressing", price: "$10" },
    ],
  },
  {
    key: "burgers",
    title: "BURGERS & SANDWICHES",
    image: "/templates/mix-burger.jpg",
    headerColor: OLIVE_DARK,
    borderColor: OLIVE_DARK,
    items: [
      { name: "Classic Burger", desc: "With fries", price: "$13" },
      { name: "BBQ Chicken Burger", desc: "Smoky sauce", price: "$13" },
      { name: "Club Sandwich", desc: "Triple layer", price: "$13" },
      { name: "Veggie Sandwich", desc: "Grilled veggies", price: "$13" },
      { name: "Tuna Sandwich", desc: "Fresh mayo", price: "$13" },
    ],
  },
  {
    key: "beverages",
    title: "BEVERAGES",
    image: "/templates/mix-bev.jpg",
    headerColor: OLIVE,
    borderColor: OLIVE,
    items: [
      { name: "Lemonade", desc: "Fresh mint", price: "$3" },
      { name: "Iced Coffee", desc: "House blend", price: "$3" },
      { name: "Fresh Juice", desc: "Seasonal fruit", price: "$3" },
      { name: "Smoothie", desc: "Berry blend", price: "$3" },
      { name: "Bottled Water", desc: "Still or sparkling", price: "$3" },
    ],
  },
  {
    key: "desserts",
    title: "DESSERTS",
    image: "/templates/mix-dessert.jpg",
    headerColor: RUST,
    borderColor: RUST,
    items: [
      { name: "Cheesecake", desc: "Berry topping", price: "$6" },
      { name: "Chocolate Cake", desc: "Rich ganache", price: "$6" },
      { name: "Tiramisu", desc: "Classic Italian", price: "$6" },
      { name: "Ice Cream", desc: "Two scoops", price: "$6" },
      { name: "Fruit Platter", desc: "Seasonal selection", price: "$6" },
    ],
  },
];

const SEED = {
  titleLine1: "DELICIOUS",
  titleLine2: "MENU",
  tagline: "GOOD FOOD, GOOD MOOD",
  badge: "FRESH TASTY MADE WITH LOVE",
  thankYou: "Thank you for dining with us!",
  hours: "OPEN DAILY 10.00 AM - 08.00 PM",
  footerLeft: "Eat well, live well",
  footerRight: "www.reallygreatsite.com",
  heroImage: HERO,
  logo: LOGO,
};

function buildFields(): SmartEditableField[] {
  const fields: SmartEditableField[] = [
    field("title_line1", "Title Line 1", "title", SEED.titleLine1, [
      { elementId: "el_title1", prop: "text" },
    ]),
    field("title_line2", "Title Line 2", "title", SEED.titleLine2, [
      { elementId: "el_title2", prop: "text" },
    ]),
    field("tagline", "Tagline", "text", SEED.tagline, [
      { elementId: "el_tagline", prop: "text" },
    ]),
    field("logo", "Logo", "logo", SEED.logo, [
      { elementId: "el_logo", prop: "imageUrl" },
    ]),
    field("hero_image", "Hero Image", "image", SEED.heroImage, [
      { elementId: "el_hero", prop: "imageUrl" },
    ]),
    field("badge", "Hero Badge", "cta", SEED.badge, [
      { elementId: "el_badge", prop: "text" },
    ]),
    field("thank_you", "Thank You Message", "description", SEED.thankYou, [
      { elementId: "el_thank_you", prop: "text" },
    ]),
    field("hours", "Opening Hours", "text", SEED.hours, [
      { elementId: "el_hours", prop: "text" },
    ]),
    field("footer_left", "Footer Left", "text", SEED.footerLeft, [
      { elementId: "el_footer_left", prop: "text" },
    ]),
    field("footer_right", "Footer Right", "text", SEED.footerRight, [
      { elementId: "el_footer_right", prop: "text" },
    ]),
  ];

  for (const cat of CATEGORIES) {
    fields.push(
      field(`${cat.key}_title`, `${cat.title} Title`, "text", cat.title, [
        { elementId: `el_${cat.key}_title`, prop: "text" },
      ]),
      field(`${cat.key}_image`, `${cat.title} Image`, "image", cat.image, [
        { elementId: `el_${cat.key}_image`, prop: "imageUrl" },
      ]),
    );
    cat.items.forEach((item, i) => {
      const n = i + 1;
      fields.push(
        field(
          `${cat.key}_item${n}`,
          `${cat.title} Item ${n}`,
          "product",
          item.name,
          [{ elementId: `el_${cat.key}_item${n}`, prop: "text" }],
        ),
        field(
          `${cat.key}_desc${n}`,
          `${cat.title} Desc ${n}`,
          "description",
          item.desc,
          [{ elementId: `el_${cat.key}_desc${n}`, prop: "text" }],
        ),
        field(
          `${cat.key}_price${n}`,
          `${cat.title} Price ${n}`,
          "price",
          item.price,
          [{ elementId: `el_${cat.key}_price${n}`, prop: "text" }],
        ),
      );
    });
  }

  return fields;
}

function applyDefaults(
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

function categoryBox(
  cat: CategorySeed,
  box: { x: number; y: number; w: number; h: number },
  opts: {
    imageH: number;
    headerH: number;
    itemStart: number;
    itemGap: number;
    showDesc: boolean;
    fontSize: number;
    priceW: number;
  },
): DesignElement[] {
  const { x, y, w, h } = box;
  const elements: DesignElement[] = [
    el({
      id: `el_${cat.key}_box`,
      type: "shape",
      name: `${cat.title} box`,
      x,
      y,
      width: w,
      height: h,
      zIndex: 2,
      locked: true,
      props: {
        background: WHITE,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: cat.borderColor,
      },
    }),
    el({
      id: `el_${cat.key}_header`,
      type: "shape",
      name: `${cat.title} header`,
      x,
      y,
      width: w,
      height: opts.headerH,
      zIndex: 3,
      locked: true,
      props: { background: cat.headerColor },
    }),
    el({
      id: `el_${cat.key}_title`,
      type: "text",
      name: cat.title,
      x: x + 4,
      y,
      width: w - 8,
      height: opts.headerH,
      zIndex: 5,
      props: {
        text: `${STAR} ${cat.title}`,
        fontSize: Math.min(12, opts.fontSize + 1),
        fontWeight: 800,
        color: WHITE,
        background: "transparent",
        align: "center",
        letterSpacing: 0.5,
      },
    }),
  ];

  if (opts.imageH > 0) {
    elements.push(
      el({
        id: `el_${cat.key}_image`,
        type: "image",
        name: `${cat.title} image`,
        x: x + 8,
        y: y + opts.headerH + 6,
        width: w - 16,
        height: opts.imageH,
        zIndex: 4,
        props: {
          imageUrl: cat.image,
          fit: "cover",
          borderRadius: 4,
          background: "#EEE",
        },
      }),
    );
  }

  cat.items.forEach((item, i) => {
    const n = i + 1;
    const rowY = y + opts.itemStart + i * opts.itemGap;
    const nameW = w - opts.priceW - 20;
    elements.push(
      el({
        id: `el_${cat.key}_item${n}`,
        type: "text",
        name: `${cat.title} item ${n}`,
        x: x + 8,
        y: rowY,
        width: nameW,
        height: opts.showDesc ? 14 : 16,
        zIndex: 5,
        props: {
          text: item.name,
          fontSize: opts.fontSize,
          fontWeight: 700,
          color: RUST_DARK,
          background: "transparent",
        },
      }),
      el({
        id: `el_${cat.key}_price${n}`,
        type: "text",
        name: `${cat.title} price ${n}`,
        x: x + w - opts.priceW - 8,
        y: rowY,
        width: opts.priceW,
        height: 16,
        zIndex: 5,
        props: {
          text: item.price,
          fontSize: opts.fontSize,
          fontWeight: 700,
          color: TEXT,
          background: "transparent",
          align: "right",
        },
      }),
    );
    if (opts.showDesc) {
      elements.push(
        el({
          id: `el_${cat.key}_desc${n}`,
          type: "text",
          name: `${cat.title} desc ${n}`,
          x: x + 8,
          y: rowY + 13,
          width: nameW,
          height: 12,
          zIndex: 5,
          props: {
            text: item.desc,
            fontSize: 9,
            fontWeight: 400,
            color: MUTED,
            background: "transparent",
          },
        }),
      );
    } else {
      // Keep desc element bound but visually compact for portrait
      elements.push(
        el({
          id: `el_${cat.key}_desc${n}`,
          type: "text",
          name: `${cat.title} desc ${n}`,
          x: x + 8,
          y: rowY + 14,
          width: nameW,
          height: 10,
          zIndex: 5,
          props: {
            text: item.desc,
            fontSize: 8,
            fontWeight: 400,
            color: MUTED,
            background: "transparent",
          },
        }),
      );
    }
  });

  return elements;
}

/** Landscape 960×540 — left feature + 3 top / 2 bottom category grid. */
function landscapeElements(): DesignElement[] {
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
      props: { background: CREAM },
    }),
    // Left feature panel
    el({
      id: "el_left_panel",
      type: "shape",
      name: "Left panel",
      x: 0,
      y: 0,
      width: 300,
      height: 540,
      zIndex: 1,
      locked: true,
      props: { background: CREAM },
    }),
    el({
      id: "el_logo",
      type: "logo",
      name: "Logo",
      x: 20,
      y: 14,
      width: 56,
      height: 40,
      zIndex: 4,
      props: { imageUrl: LOGO, fit: "contain", background: "transparent" },
    }),
    el({
      id: "el_tagline",
      type: "text",
      name: "Tagline",
      x: 80,
      y: 22,
      width: 200,
      height: 24,
      zIndex: 4,
      props: {
        text: SEED.tagline,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1,
        color: OLIVE,
        background: "transparent",
      },
    }),
    el({
      id: "el_title1",
      type: "text",
      name: "Title 1",
      x: 20,
      y: 58,
      width: 260,
      height: 36,
      zIndex: 4,
      props: {
        text: SEED.titleLine1,
        fontFamily: "serif",
        fontSize: 32,
        fontWeight: 800,
        color: OLIVE,
        background: "transparent",
      },
    }),
    el({
      id: "el_title2",
      type: "text",
      name: "Title 2",
      x: 20,
      y: 92,
      width: 260,
      height: 40,
      zIndex: 4,
      props: {
        text: SEED.titleLine2,
        fontFamily: "serif",
        fontSize: 36,
        fontWeight: 900,
        color: RUST,
        background: "transparent",
      },
    }),
    el({
      id: "el_hero",
      type: "image",
      name: "Hero",
      x: 40,
      y: 150,
      width: 220,
      height: 220,
      zIndex: 3,
      props: {
        imageUrl: HERO,
        fit: "cover",
        borderRadius: 999,
        borderWidth: 4,
        borderColor: OLIVE,
        background: "#DDD",
      },
    }),
    el({
      id: "el_badge",
      type: "text",
      name: "Badge",
      x: 20,
      y: 340,
      width: 120,
      height: 120,
      zIndex: 5,
      props: {
        text: SEED.badge,
        fontSize: 11,
        fontWeight: 800,
        color: WHITE,
        background: OLIVE,
        borderRadius: 999,
        align: "center",
        padding: 10,
      },
    }),
    el({
      id: "el_left_footer",
      type: "shape",
      name: "Left footer",
      x: 0,
      y: 430,
      width: 300,
      height: 110,
      zIndex: 2,
      locked: true,
      props: { background: OLIVE_DARK },
    }),
    el({
      id: "el_thank_you",
      type: "text",
      name: "Thank you",
      x: 16,
      y: 448,
      width: 268,
      height: 28,
      zIndex: 4,
      props: {
        text: SEED.thankYou,
        fontSize: 13,
        fontWeight: 700,
        color: WHITE,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_hours",
      type: "text",
      name: "Hours",
      x: 16,
      y: 482,
      width: 268,
      height: 24,
      zIndex: 4,
      props: {
        text: SEED.hours,
        fontSize: 11,
        fontWeight: 600,
        color: "#D8E0B8",
        background: "transparent",
        align: "center",
      },
    }),
    // Bottom footer bar
    el({
      id: "el_footer_bar",
      type: "shape",
      name: "Footer bar",
      x: 300,
      y: 508,
      width: 660,
      height: 32,
      zIndex: 3,
      locked: true,
      props: { background: OLIVE_DARK },
    }),
    el({
      id: "el_footer_left",
      type: "text",
      name: "Footer left",
      x: 312,
      y: 512,
      width: 280,
      height: 24,
      zIndex: 5,
      props: {
        text: SEED.footerLeft,
        fontFamily: "serif",
        fontSize: 13,
        fontWeight: 600,
        color: WHITE,
        background: "transparent",
      },
    }),
    el({
      id: "el_footer_right",
      type: "text",
      name: "Footer right",
      x: 620,
      y: 512,
      width: 320,
      height: 24,
      zIndex: 5,
      props: {
        text: SEED.footerRight,
        fontSize: 11,
        fontWeight: 600,
        color: "#D8E0B8",
        background: "transparent",
        align: "right",
      },
    }),
  ];

  // Top row: 3 equal boxes
  const topY = 16;
  const topH = 300;
  const topW = 208;
  const topGap = 10;
  const topStartX = 312;
  CATEGORIES.slice(0, 3).forEach((cat, i) => {
    elements.push(
      ...categoryBox(
        cat,
        {
          x: topStartX + i * (topW + topGap),
          y: topY,
          w: topW,
          h: topH,
        },
        {
          imageH: 70,
          headerH: 28,
          itemStart: 112,
          itemGap: 36,
          showDesc: true,
          fontSize: 11,
          priceW: 36,
        },
      ),
    );
  });

  // Bottom row: 2 wider boxes
  const botY = 326;
  const botH = 172;
  const botW = 318;
  const botGap = 12;
  CATEGORIES.slice(3, 5).forEach((cat, i) => {
    elements.push(
      ...categoryBox(
        cat,
        {
          x: topStartX + i * (botW + botGap),
          y: botY,
          w: botW,
          h: botH,
        },
        {
          imageH: 0,
          headerH: 26,
          itemStart: 36,
          itemGap: 26,
          showDesc: false,
          fontSize: 11,
          priceW: 36,
        },
      ),
    );
    // Smaller side image for bottom categories
    const bx = topStartX + i * (botW + botGap);
    // Replace tall image with compact thumb by updating last image — already created with imageH 0
    // Add a thumb on the right of bottom boxes
    elements.push(
      el({
        id: `el_${cat.key}_image`,
        type: "image",
        name: `${cat.title} image`,
        x: bx + botW - 78,
        y: botY + 36,
        width: 68,
        height: 120,
        zIndex: 4,
        props: {
          imageUrl: cat.image,
          fit: "cover",
          borderRadius: 4,
          background: "#EEE",
        },
      }),
    );
  });

  return elements;
}

/** Portrait 540×960 — stacked header + category cards. */
function portraitElements(): DesignElement[] {
  const elements: DesignElement[] = [
    el({
      id: "el_bg",
      type: "shape",
      name: "Background",
      x: 0,
      y: 0,
      width: 540,
      height: 960,
      zIndex: 0,
      locked: true,
      props: { background: CREAM },
    }),
    el({
      id: "el_header_bg",
      type: "shape",
      name: "Header",
      x: 0,
      y: 0,
      width: 540,
      height: 210,
      zIndex: 1,
      locked: true,
      props: { background: OLIVE_DARK },
    }),
    el({
      id: "el_logo",
      type: "logo",
      name: "Logo",
      x: 20,
      y: 16,
      width: 48,
      height: 36,
      zIndex: 4,
      props: { imageUrl: LOGO, fit: "contain", background: "transparent" },
    }),
    el({
      id: "el_tagline",
      type: "text",
      name: "Tagline",
      x: 80,
      y: 24,
      width: 300,
      height: 22,
      zIndex: 4,
      props: {
        text: SEED.tagline,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1,
        color: "#D8E0B8",
        background: "transparent",
      },
    }),
    el({
      id: "el_title1",
      type: "text",
      name: "Title 1",
      x: 20,
      y: 56,
      width: 280,
      height: 32,
      zIndex: 4,
      props: {
        text: SEED.titleLine1,
        fontFamily: "serif",
        fontSize: 28,
        fontWeight: 800,
        color: WHITE,
        background: "transparent",
      },
    }),
    el({
      id: "el_title2",
      type: "text",
      name: "Title 2",
      x: 20,
      y: 88,
      width: 280,
      height: 36,
      zIndex: 4,
      props: {
        text: SEED.titleLine2,
        fontFamily: "serif",
        fontSize: 32,
        fontWeight: 900,
        color: "#E8B89A",
        background: "transparent",
      },
    }),
    el({
      id: "el_hero",
      type: "image",
      name: "Hero",
      x: 360,
      y: 24,
      width: 150,
      height: 150,
      zIndex: 3,
      props: {
        imageUrl: HERO,
        fit: "cover",
        borderRadius: 999,
        borderWidth: 3,
        borderColor: WHITE,
        background: "#DDD",
      },
    }),
    el({
      id: "el_badge",
      type: "text",
      name: "Badge",
      x: 320,
      y: 150,
      width: 100,
      height: 48,
      zIndex: 5,
      props: {
        text: SEED.badge,
        fontSize: 9,
        fontWeight: 800,
        color: WHITE,
        background: RUST,
        borderRadius: 999,
        align: "center",
        padding: 6,
      },
    }),
    el({
      id: "el_thank_you",
      type: "text",
      name: "Thank you",
      x: 20,
      y: 140,
      width: 280,
      height: 22,
      zIndex: 4,
      props: {
        text: SEED.thankYou,
        fontSize: 12,
        fontWeight: 600,
        color: WHITE,
        background: "transparent",
      },
    }),
    el({
      id: "el_hours",
      type: "text",
      name: "Hours",
      x: 20,
      y: 164,
      width: 280,
      height: 20,
      zIndex: 4,
      props: {
        text: SEED.hours,
        fontSize: 11,
        fontWeight: 600,
        color: "#D8E0B8",
        background: "transparent",
      },
    }),
    el({
      id: "el_footer_bar",
      type: "shape",
      name: "Footer bar",
      x: 0,
      y: 920,
      width: 540,
      height: 40,
      zIndex: 3,
      locked: true,
      props: { background: OLIVE_DARK },
    }),
    el({
      id: "el_footer_left",
      type: "text",
      name: "Footer left",
      x: 16,
      y: 928,
      width: 240,
      height: 24,
      zIndex: 5,
      props: {
        text: SEED.footerLeft,
        fontFamily: "serif",
        fontSize: 13,
        fontWeight: 600,
        color: WHITE,
        background: "transparent",
      },
    }),
    el({
      id: "el_footer_right",
      type: "text",
      name: "Footer right",
      x: 260,
      y: 928,
      width: 260,
      height: 24,
      zIndex: 5,
      props: {
        text: SEED.footerRight,
        fontSize: 11,
        fontWeight: 600,
        color: "#D8E0B8",
        background: "transparent",
        align: "right",
      },
    }),
  ];

  // 5 stacked category cards
  const cardH = 136;
  const startY = 222;
  const gap = 8;
  CATEGORIES.forEach((cat, i) => {
    const y = startY + i * (cardH + gap);
    elements.push(
      ...categoryBox(
        cat,
        { x: 16, y, w: 508, h: cardH },
        {
          imageH: 0,
          headerH: 26,
          itemStart: 34,
          itemGap: 20,
          showDesc: false,
          fontSize: 11,
          priceW: 40,
        },
      ),
    );
    // Side thumb
    elements.push(
      el({
        id: `el_${cat.key}_image`,
        type: "image",
        name: `${cat.title} image`,
        x: 420,
        y: y + 34,
        width: 90,
        height: 92,
        zIndex: 4,
        props: {
          imageUrl: cat.image,
          fit: "cover",
          borderRadius: 4,
          background: "#EEE",
        },
      }),
    );
  });

  return elements;
}

export function buildMixMenu(): DesignData {
  const fields = buildFields();
  const landscape = applyDefaults(landscapeElements(), fields);
  const portrait = applyDefaults(portraitElements(), fields);
  const contentValues: Record<string, string> = {};
  for (const f of fields) contentValues[f.id] = f.defaultValue;

  return {
    smart: true,
    layoutLocked: false,
    layout: "mix-menu",
    theme: THEME,
    orientation: "landscape",
    artboardWidth: 960,
    artboardHeight: 540,
    elements: landscape,
    editableFields: fields,
    contentValues,
    orientationLayouts: {
      landscape: {
        artboardWidth: 960,
        artboardHeight: 540,
        elements: landscape,
      },
      portrait: {
        artboardWidth: 540,
        artboardHeight: 960,
        elements: portrait,
      },
    },
    badge: "MIX MENU",
    headline: `${SEED.titleLine1} ${SEED.titleLine2}`,
    subheadline: SEED.tagline,
    imageUrl: HERO,
  };
}

export function buildMixMenuCatalog(): Record<string, DesignData> {
  return {
    "Mix Menu": buildMixMenu(),
  };
}
