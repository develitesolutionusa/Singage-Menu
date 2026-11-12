/**
 * Dish category boards — same layout as the Beverages menu reference:
 * green sidebar + item grid. Fully editable. Portrait + landscape packs.
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

type SizeSeed = { label: string; price: string };
type ItemSeed = {
  name: string;
  image: string;
  sizes: [SizeSeed, SizeSeed, SizeSeed, SizeSeed];
};

type BoardColors = {
  primary: string;
  primaryDark: string;
  muted: string;
  panel: string;
};

type CategorySeed = {
  templateName: string;
  categoryTitle: string;
  description: string;
  heroImage: string;
  restaurantName: string;
  items: ItemSeed[];
  colors: BoardColors;
  sortOrder: number;
  tags: string[];
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

const TEXT_DARK = "#1F1F1F";
const WHITE = "#FFFFFF";
const LOGO = "/templates/good-food-logo.svg";

function boardTheme(colors: BoardColors) {
  return {
    bg: colors.primary,
    accent: colors.primary,
    text: WHITE,
    muted: colors.muted,
    panel: colors.panel,
  };
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

function buildFields(seed: CategorySeed): SmartEditableField[] {
  const fields: SmartEditableField[] = [
    field("restaurant_name", "Restaurant Name", "title", seed.restaurantName, [
      { elementId: "el_restaurant_name", prop: "text" },
    ]),
    field("logo", "Logo", "logo", LOGO, [
      { elementId: "el_logo", prop: "imageUrl" },
    ]),
    field("category_title", "Category Title", "title", seed.categoryTitle, [
      { elementId: "el_category_title", prop: "text" },
    ]),
    field("menu_label", "Menu Label", "text", "MENU", [
      { elementId: "el_menu_label", prop: "text" },
    ]),
    field("description", "Sidebar Description", "description", seed.description, [
      { elementId: "el_description", prop: "text" },
    ]),
    field("hero_image", "Hero Image", "image", seed.heroImage, [
      { elementId: "el_hero", prop: "imageUrl" },
    ]),
  ];

  seed.items.forEach((item, i) => {
    const n = i + 1;
    fields.push(
      field(`item${n}_name`, `Item ${n} Name`, "product", item.name, [
        { elementId: `el_item${n}_name`, prop: "text" },
      ]),
      field(`item${n}_image`, `Item ${n} Image`, "image", item.image, [
        { elementId: `el_item${n}_image`, prop: "imageUrl" },
      ]),
    );
    item.sizes.forEach((size, si) => {
      const s = si + 1;
      fields.push(
        field(
          `item${n}_size${s}`,
          `Item ${n} Size ${s}`,
          "text",
          size.label,
          [{ elementId: `el_item${n}_size${s}`, prop: "text" }],
        ),
        field(
          `item${n}_price${s}`,
          `Item ${n} Price ${s}`,
          "price",
          size.price,
          [{ elementId: `el_item${n}_price${s}`, prop: "text" }],
        ),
      );
    });
  });

  return fields;
}

function sizePrices(base: number): [SizeSeed, SizeSeed, SizeSeed, SizeSeed] {
  return [
    { label: "Extra Small", price: `${(base).toFixed(2)}$` },
    { label: "Small", price: `${(base + 0.8).toFixed(2)}$` },
    { label: "Medium", price: `${(base + 1.7).toFixed(2)}$` },
    { label: "Large", price: `${(base + 2.8).toFixed(2)}$` },
  ];
}

function portionPrices(base: number): [SizeSeed, SizeSeed, SizeSeed, SizeSeed] {
  return [
    { label: "Half Order", price: `${base.toFixed(2)}$` },
    { label: "Full Order", price: `${(base + 4).toFixed(2)}$` },
    { label: "Share Plate", price: `${(base + 7).toFixed(2)}$` },
    { label: "Family", price: `${(base + 12).toFixed(2)}$` },
  ];
}

function dessertPrices(base: number): [SizeSeed, SizeSeed, SizeSeed, SizeSeed] {
  return [
    { label: "Single", price: `${base.toFixed(2)}$` },
    { label: "Double", price: `${(base + 2).toFixed(2)}$` },
    { label: "With Ice Cream", price: `${(base + 3.5).toFixed(2)}$` },
    { label: "Share", price: `${(base + 5).toFixed(2)}$` },
  ];
}

/** Landscape 960×540 — sidebar + 2×4 item grid. */
function landscapeElements(seed: CategorySeed): DesignElement[] {
  const { primary, primaryDark, panel } = seed.colors;
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
      props: { background: "#2a2a2a" },
    }),
    el({
      id: "el_sidebar",
      type: "shape",
      name: "Sidebar",
      x: 0,
      y: 0,
      width: 280,
      height: 540,
      zIndex: 1,
      locked: true,
      props: { background: primary },
    }),
    el({
      id: "el_content_bg",
      type: "shape",
      name: "Content panel",
      x: 280,
      y: 0,
      width: 680,
      height: 540,
      zIndex: 1,
      locked: true,
      props: { background: panel },
    }),
    el({
      id: "el_logo",
      type: "logo",
      name: "Logo",
      x: 98,
      y: 18,
      width: 84,
      height: 56,
      zIndex: 4,
      props: { imageUrl: LOGO, fit: "contain", background: "transparent" },
    }),
    el({
      id: "el_restaurant_name",
      type: "text",
      name: "Restaurant",
      x: 20,
      y: 76,
      width: 240,
      height: 28,
      zIndex: 4,
      props: {
        text: seed.restaurantName,
        fontSize: 13,
        fontWeight: 700,
        color: WHITE,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_category_ribbon",
      type: "shape",
      name: "Title ribbon",
      x: 30,
      y: 118,
      width: 220,
      height: 36,
      zIndex: 3,
      locked: true,
      props: { background: WHITE, borderRadius: 6 },
    }),
    el({
      id: "el_category_title",
      type: "text",
      name: "Category",
      x: 30,
      y: 118,
      width: 220,
      height: 36,
      zIndex: 5,
      props: {
        text: seed.categoryTitle,
        fontFamily: "serif",
        fontSize: 22,
        fontWeight: 700,
        color: primaryDark,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_menu_label",
      type: "text",
      name: "MENU",
      x: 30,
      y: 158,
      width: 220,
      height: 40,
      zIndex: 4,
      props: {
        text: "MENU",
        fontSize: 34,
        fontWeight: 900,
        letterSpacing: 3,
        color: WHITE,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_hero",
      type: "image",
      name: "Hero",
      x: 40,
      y: 210,
      width: 200,
      height: 200,
      zIndex: 4,
      props: {
        imageUrl: seed.heroImage,
        fit: "contain",
        background: "transparent",
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 24,
      y: 430,
      width: 232,
      height: 90,
      zIndex: 4,
      props: {
        text: seed.description,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.35,
        color: WHITE,
        background: "transparent",
        align: "center",
      },
    }),
  ];

  // 2 columns × 4 rows
  const colW = 320;
  const rowH = 124;
  const startX = 300;
  const startY = 16;

  seed.items.slice(0, 8).forEach((item, i) => {
    const n = i + 1;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * (colW + 16);
    const y = startY + row * (rowH + 8);

    elements.push(
      el({
        id: `el_item${n}_bar`,
        type: "shape",
        name: `Item ${n} bar`,
        x,
        y,
        width: colW,
        height: 28,
        zIndex: 3,
        locked: true,
        props: { background: primary, borderRadius: 4 },
      }),
      el({
        id: `el_item${n}_name`,
        type: "text",
        name: `Item ${n}`,
        x,
        y,
        width: colW,
        height: 28,
        zIndex: 5,
        props: {
          text: item.name,
          fontSize: 13,
          fontWeight: 800,
          color: WHITE,
          background: "transparent",
          align: "center",
          letterSpacing: 1,
        },
      }),
      el({
        id: `el_item${n}_image`,
        type: "image",
        name: `Item ${n} image`,
        x: x + 210,
        y: y + 34,
        width: 100,
        height: 84,
        zIndex: 4,
        props: {
          imageUrl: item.image,
          fit: "contain",
          background: "transparent",
        },
      }),
    );

    item.sizes.forEach((size, si) => {
      const s = si + 1;
      const lineY = y + 36 + si * 18;
      elements.push(
        el({
          id: `el_item${n}_size${s}`,
          type: "text",
          name: `Item ${n} size ${s}`,
          x: x + 8,
          y: lineY,
          width: 120,
          height: 18,
          zIndex: 5,
          props: {
            text: size.label,
            fontSize: 11,
            fontWeight: 500,
            color: TEXT_DARK,
            background: "transparent",
          },
        }),
        el({
          id: `el_item${n}_price${s}`,
          type: "text",
          name: `Item ${n} price ${s}`,
          x: x + 130,
          y: lineY,
          width: 70,
          height: 18,
          zIndex: 5,
          props: {
            text: size.price,
            fontSize: 11,
            fontWeight: 700,
            color: TEXT_DARK,
            background: "transparent",
            align: "right",
          },
        }),
      );
    });
  });

  return elements;
}

/** Portrait 540×960 — colored header + stacked 2-column item grid. */
function portraitElements(seed: CategorySeed): DesignElement[] {
  const { primary, primaryDark, panel } = seed.colors;
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
      props: { background: panel },
    }),
    el({
      id: "el_sidebar",
      type: "shape",
      name: "Header",
      x: 0,
      y: 0,
      width: 540,
      height: 280,
      zIndex: 1,
      locked: true,
      props: { background: primary },
    }),
    el({
      id: "el_logo",
      type: "logo",
      name: "Logo",
      x: 28,
      y: 20,
      width: 72,
      height: 48,
      zIndex: 4,
      props: { imageUrl: LOGO, fit: "contain", background: "transparent" },
    }),
    el({
      id: "el_restaurant_name",
      type: "text",
      name: "Restaurant",
      x: 110,
      y: 28,
      width: 280,
      height: 28,
      zIndex: 4,
      props: {
        text: seed.restaurantName,
        fontSize: 14,
        fontWeight: 700,
        color: WHITE,
        background: "transparent",
      },
    }),
    el({
      id: "el_category_ribbon",
      type: "shape",
      name: "Title ribbon",
      x: 110,
      y: 64,
      width: 220,
      height: 34,
      zIndex: 3,
      locked: true,
      props: { background: WHITE, borderRadius: 6 },
    }),
    el({
      id: "el_category_title",
      type: "text",
      name: "Category",
      x: 110,
      y: 64,
      width: 220,
      height: 34,
      zIndex: 5,
      props: {
        text: seed.categoryTitle,
        fontFamily: "serif",
        fontSize: 20,
        fontWeight: 700,
        color: primaryDark,
        background: "transparent",
        align: "center",
      },
    }),
    el({
      id: "el_menu_label",
      type: "text",
      name: "MENU",
      x: 340,
      y: 64,
      width: 160,
      height: 34,
      zIndex: 4,
      props: {
        text: "MENU",
        fontSize: 28,
        fontWeight: 900,
        letterSpacing: 2,
        color: WHITE,
        background: "transparent",
      },
    }),
    el({
      id: "el_hero",
      type: "image",
      name: "Hero",
      x: 170,
      y: 110,
      width: 200,
      height: 110,
      zIndex: 4,
      props: {
        imageUrl: seed.heroImage,
        fit: "contain",
        background: "transparent",
      },
    }),
    el({
      id: "el_description",
      type: "text",
      name: "Description",
      x: 24,
      y: 228,
      width: 492,
      height: 42,
      zIndex: 4,
      props: {
        text: seed.description,
        fontSize: 12,
        fontWeight: 500,
        color: WHITE,
        background: "transparent",
        align: "center",
      },
    }),
  ];

  const colW = 248;
  const rowH = 150;
  const startX = 18;
  const startY = 300;

  seed.items.slice(0, 8).forEach((item, i) => {
    const n = i + 1;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * (colW + 10);
    const y = startY + row * (rowH + 10);

    elements.push(
      el({
        id: `el_item${n}_card`,
        type: "shape",
        name: `Item ${n} card`,
        x,
        y,
        width: colW,
        height: rowH,
        zIndex: 2,
        locked: true,
        props: { background: WHITE, borderRadius: 10 },
      }),
      el({
        id: `el_item${n}_bar`,
        type: "shape",
        name: `Item ${n} bar`,
        x,
        y,
        width: colW,
        height: 28,
        zIndex: 3,
        locked: true,
        props: { background: primary, borderRadius: 4 },
      }),
      el({
        id: `el_item${n}_name`,
        type: "text",
        name: `Item ${n}`,
        x,
        y,
        width: colW,
        height: 28,
        zIndex: 5,
        props: {
          text: item.name,
          fontSize: 12,
          fontWeight: 800,
          color: WHITE,
          background: "transparent",
          align: "center",
        },
      }),
      el({
        id: `el_item${n}_image`,
        type: "image",
        name: `Item ${n} image`,
        x: x + 150,
        y: y + 40,
        width: 86,
        height: 96,
        zIndex: 4,
        props: {
          imageUrl: item.image,
          fit: "contain",
          background: "transparent",
        },
      }),
    );

    item.sizes.forEach((size, si) => {
      const s = si + 1;
      const lineY = y + 38 + si * 24;
      elements.push(
        el({
          id: `el_item${n}_size${s}`,
          type: "text",
          name: `Item ${n} size ${s}`,
          x: x + 10,
          y: lineY,
          width: 90,
          height: 20,
          zIndex: 5,
          props: {
            text: size.label,
            fontSize: 11,
            fontWeight: 500,
            color: TEXT_DARK,
            background: "transparent",
          },
        }),
        el({
          id: `el_item${n}_price${s}`,
          type: "text",
          name: `Item ${n} price ${s}`,
          x: x + 100,
          y: lineY,
          width: 44,
          height: 20,
          zIndex: 5,
          props: {
            text: size.price,
            fontSize: 11,
            fontWeight: 700,
            color: TEXT_DARK,
            background: "transparent",
            align: "right",
          },
        }),
      );
    });
  });

  return elements;
}

function buildCategoryBoard(seed: CategorySeed): DesignData {
  const fields = buildFields(seed);
  const portrait = applyDefaults(portraitElements(seed), fields);
  const landscape = applyDefaults(landscapeElements(seed), fields);
  const contentValues: Record<string, string> = {};
  for (const f of fields) contentValues[f.id] = f.defaultValue;

  return {
    smart: true,
    layoutLocked: false,
    layout: "dish-category-board",
    theme: boardTheme(seed.colors),
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
    badge: seed.categoryTitle.toUpperCase(),
    headline: `${seed.categoryTitle} MENU`,
    subheadline: seed.description,
    imageUrl: seed.heroImage,
  };
}

const RESTAURANT = "Today's Bite Restaurant";

const BEV_IMGS = [
  "/templates/dish-bev-1.jpg",
  "/templates/dish-bev-2.jpg",
  "/templates/dish-bev-3.jpg",
  "/templates/dish-bev-4.jpg",
  "/templates/dish-bev-5.jpg",
  "/templates/dish-bev-6.jpg",
  "/templates/dish-bev-7.jpg",
  "/templates/dish-bev-8.jpg",
];

const FOOD_IMGS = [
  "/templates/elegant-appetizer.jpg",
  "/templates/elegant-main.jpg",
  "/templates/elegant-drink.jpg",
  "/templates/premium-food-special.jpg",
  "/templates/premium-menu-hero.jpg",
  "/templates/premium-promo-hero.jpg",
  "/templates/premium-deal-hero.jpg",
  "/templates/heroes/daily-special.svg",
];

function itemsFrom(
  names: string[],
  images: string[],
  pricing: (base: number) => [SizeSeed, SizeSeed, SizeSeed, SizeSeed],
  bases: number[],
): ItemSeed[] {
  return names.map((name, i) => ({
    name,
    image: images[i % images.length],
    sizes: pricing(bases[i] ?? 8),
  }));
}

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    templateName: "Appetizers Menu",
    categoryTitle: "Appetizers",
    description:
      "Start your meal with our chef-crafted appetizers — fresh, shareable, and made to order.",
    heroImage: "/templates/elegant-appetizer.jpg",
    restaurantName: RESTAURANT,
    colors: {
      primary: "#E67E22",
      primaryDark: "#B35900",
      muted: "#FDEBD0",
      panel: "#FFF6EC",
    },
    sortOrder: -20,
    tags: ["appetizers", "starters", "dishes", "menu"],
    items: itemsFrom(
      [
        "GARLIC BREAD",
        "CHICKEN WINGS",
        "CAESAR SALAD",
        "BRUSCHETTA",
        "SPRING ROLLS",
        "ONION RINGS",
        "SOUP OF DAY",
        "NACHOS",
      ],
      FOOD_IMGS,
      portionPrices,
      [6, 9, 8, 7, 8.5, 7.5, 6.5, 10],
    ),
  },
  {
    templateName: "Chicken Entrees Menu",
    categoryTitle: "Chicken Entrees",
    description:
      "Juicy chicken entrees grilled, fried, or roasted — served with your choice of sides.",
    heroImage: "/templates/premium-promo-hero.jpg",
    restaurantName: RESTAURANT,
    colors: {
      primary: "#C0392B",
      primaryDark: "#922B21",
      muted: "#FADBD8",
      panel: "#FDF2F0",
    },
    sortOrder: -19,
    tags: ["chicken", "entrees", "dishes", "menu"],
    items: itemsFrom(
      [
        "GRILLED CHICKEN",
        "FRIED CHICKEN",
        "CHICKEN PARM",
        "CHICKEN CURRY",
        "BBQ CHICKEN",
        "CHICKEN KEBAB",
        "CHICKEN ALFREDO",
        "CHICKEN BIRYANI",
      ],
      FOOD_IMGS,
      portionPrices,
      [12, 11, 13, 12.5, 13.5, 12, 14, 13],
    ),
  },
  {
    templateName: "Beef Entrees Menu",
    categoryTitle: "Beef Entrees",
    description:
      "Premium beef cuts prepared to perfection — steaks, burgers, and house specialties.",
    heroImage: "/templates/premium-deal-hero.jpg",
    restaurantName: RESTAURANT,
    colors: {
      primary: "#6D1A2A",
      primaryDark: "#4A0F1C",
      muted: "#F5D6DC",
      panel: "#F9EEF1",
    },
    sortOrder: -18,
    tags: ["beef", "entrees", "steak", "menu"],
    items: itemsFrom(
      [
        "RIBEYE STEAK",
        "BEEF BURGER",
        "BEEF STROGANOFF",
        "SHORT RIBS",
        "BEEF KEBAB",
        "FILET MIGNON",
        "BEEF BIRYANI",
        "MEATBALLS",
      ],
      FOOD_IMGS,
      portionPrices,
      [22, 14, 16, 18, 15, 26, 14, 12],
    ),
  },
  {
    templateName: "Grill Entrees Menu",
    categoryTitle: "Grill Entrees",
    description:
      "Flame-grilled favorites with bold seasoning — hot off the grill every day.",
    heroImage: "/templates/premium-menu-hero.jpg",
    restaurantName: RESTAURANT,
    colors: {
      primary: "#D35400",
      primaryDark: "#A04000",
      muted: "#FDE0C8",
      panel: "#FFF3E8",
    },
    sortOrder: -17,
    tags: ["grill", "bbq", "entrees", "menu"],
    items: itemsFrom(
      [
        "MIXED GRILL",
        "GRILLED SALMON",
        "LAMB CHOPS",
        "GRILLED SHRIMP",
        "BBQ RIBS",
        "GRILLED VEGGIE",
        "STEAK SKEWERS",
        "GRILL PLATTER",
      ],
      FOOD_IMGS,
      portionPrices,
      [20, 18, 22, 17, 19, 14, 16, 24],
    ),
  },
  {
    templateName: "Vegetable Entrees Menu",
    categoryTitle: "Vegetable Entrees",
    description:
      "Fresh vegetarian entrees — wholesome, colorful, and full of flavor.",
    heroImage: "/templates/heroes/seasonal.svg",
    restaurantName: RESTAURANT,
    colors: {
      primary: "#27AE60",
      primaryDark: "#1E8449",
      muted: "#D5F5E3",
      panel: "#F0FFF6",
    },
    sortOrder: -16,
    tags: ["vegetable", "vegetarian", "entrees", "menu"],
    items: itemsFrom(
      [
        "VEGGIE BOWL",
        "PANEER TIKKA",
        "VEGGIE PASTA",
        "STUFFED PEPPERS",
        "MUSHROOM RISOTTO",
        "TOFU STIR FRY",
        "VEGGIE CURRY",
        "GARDEN PLATTER",
      ],
      FOOD_IMGS,
      portionPrices,
      [11, 13, 12, 12.5, 14, 11.5, 12, 15],
    ),
  },
  {
    templateName: "Desserts Menu",
    categoryTitle: "Desserts",
    description:
      "Sweet endings made fresh — cakes, ice cream, and classic desserts.",
    heroImage: "/templates/heroes/new-item.svg",
    restaurantName: RESTAURANT,
    colors: {
      primary: "#8E44AD",
      primaryDark: "#6C3483",
      muted: "#E8DAEF",
      panel: "#F9F0FC",
    },
    sortOrder: -15,
    tags: ["desserts", "sweets", "dishes", "menu"],
    items: itemsFrom(
      [
        "CHOCOLATE CAKE",
        "CHEESECAKE",
        "ICE CREAM",
        "TIRAMISU",
        "BROWNIE",
        "FRUIT TART",
        "PUDDING",
        "SUNDAE",
      ],
      FOOD_IMGS,
      dessertPrices,
      [6, 7, 4.5, 7.5, 5.5, 6.5, 5, 6],
    ),
  },
  {
    templateName: "Beverages Menu",
    categoryTitle: "Beverages",
    description:
      "We take pride in our beverages — soft drinks, juices, and specialty cups for every taste.",
    heroImage: "/templates/dish-hero-beverages.jpg",
    restaurantName: RESTAURANT,
    colors: {
      primary: "#00A651",
      primaryDark: "#008C44",
      muted: "#E8F5E9",
      panel: "#F3F0EA",
    },
    sortOrder: -14,
    tags: ["beverages", "drinks", "soda", "menu"],
    items: itemsFrom(
      [
        "COCA-COLA",
        "SPRITE",
        "FANTA",
        "PEPSI",
        "MOUNTAIN DEW",
        "DR PEPPER",
        "GINGER ALE",
        "ORANGE JUICE",
      ],
      BEV_IMGS,
      sizePrices,
      [2.99, 2.99, 2.99, 2.99, 2.99, 2.99, 2.99, 3.49],
    ),
  },
];

export function buildDishCategoryBoards(): Record<string, DesignData> {
  const catalog: Record<string, DesignData> = {};
  for (const seed of CATEGORY_SEEDS) {
    catalog[seed.templateName] = buildCategoryBoard(seed);
  }
  return catalog;
}

export function getDishCategoryMeta(): Array<{
  name: string;
  category: string;
  tags: string[];
  sort_order: number;
}> {
  return CATEGORY_SEEDS.map((s) => ({
    name: s.templateName,
    category: "Menu",
    tags: s.tags,
    sort_order: s.sortOrder,
  }));
}
