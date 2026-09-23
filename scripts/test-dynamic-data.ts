/**
 * Step 9 — Dynamic Data Binding smoke tests.
 * Run: npx tsx scripts/test-dynamic-data.ts
 */
import {
  buildDynamicContext,
  formatDynamicToken,
  resolveBinding,
  resolveElementProps,
  resolveString,
  syncDynamicContextFromContent,
} from "../lib/dynamic-data";
import {
  getContentValues,
  setContentField,
  buildRestaurantSmartTemplates,
} from "../lib/smart-templates";
import { getElements } from "../lib/design-elements";
import type { DesignData } from "../types/db";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const templates = buildRestaurantSmartTemplates();
const special = templates["Daily Special"] as DesignData;
assert(special, "Daily Special template missing");

// 1) Context builds from contentValues
const ctx = buildDynamicContext(special, {
  name: "Harbor Grill",
  logo: "https://example.com/logo.png",
});
assert(ctx.product.price, "product.price from contentValues");
assert(ctx.restaurant.name === "Harbor Grill", "restaurant.name from org");
assert(ctx.restaurant.logo?.includes("logo"), "restaurant.logo from org");

// 2) Token resolution
assert(
  resolveString("Buy {{product.name}} for {{product.price}}", ctx) ===
    `Buy ${ctx.product.name} for ${ctx.product.price}`,
  "multi-token resolve",
);
assert(
  resolveString("{{restaurant.name}}", ctx) === "Harbor Grill",
  "restaurant token",
);
assert(
  resolveString("{{product.missing}}", ctx, "N/A") === "N/A",
  "fallback on missing",
);

// 3) Price change propagates via contentValues → context
const updated = setContentField(special, "price", "$16.99");
const ctx2 = buildDynamicContext(updated, {
  name: "Harbor Grill",
  logo: "https://example.com/logo.png",
});
assert(ctx2.product.price === "$16.99", "contentValues sync product.price");
assert(getContentValues(updated).price === "$16.99", "contentValues stored");

const priceEl = getElements(updated).find((e) => e.id === "el_price");
assert(priceEl, "el_price exists");
assert(priceEl.props.dataSource === "product", "price has dataSource");
assert(priceEl.props.field === "price", "price has field");

const resolved = resolveElementProps(priceEl.props, ctx2);
assert(resolved.price === "$16.99", "resolved price badge shows new price");
assert(resolved.text === "$16.99", "resolved text shows new price");

// 4) Dynamic-data style binding with fallback
const bound = resolveBinding(ctx2, "product", "price", "$0.00");
assert(bound === "$16.99", "resolveBinding product.price");

const emptyCtx = buildDynamicContext({
  contentValues: {},
  editableFields: [],
} as DesignData);
assert(
  resolveBinding(emptyCtx, "product", "price", "$0.00") === "$0.00",
  "fallback when empty",
);

// 5) Image / logo binding
const logoProps = resolveElementProps(
  {
    dataSource: "restaurant",
    field: "logo",
    fallback: "",
    imageUrl: formatDynamicToken("restaurant", "logo"),
  },
  ctx2,
);
assert(
  logoProps.imageUrl === "https://example.com/logo.png",
  "logo imageUrl resolves",
);

// 6) syncDynamicContextFromContent keeps restaurant
const synced = syncDynamicContextFromContent(
  updated,
  getContentValues(updated),
  { name: "Harbor Grill", logo: "https://example.com/logo.png" },
);
const bag = synced.dynamicContext as {
  product: { price: string };
  restaurant: { name: string };
};
assert(bag.product.price === "$16.99", "synced dynamicContext.product.price");
assert(bag.restaurant.name === "Harbor Grill", "synced restaurant");

// 7) Manual fields without tokens pass through
const manual = resolveElementProps(
  { text: "Static headline", price: "$9" },
  ctx2,
);
assert(manual.text === "Static headline", "manual text intact");
assert(manual.price === "$9", "manual price intact");

console.log("Step 9 dynamic data binding: all checks passed");
console.log(`  product.price $14.99 → $16.99 resolves on bound elements`);
console.log(`  restaurant.name = ${ctx.restaurant.name}`);
