import { getElements } from "../lib/design-elements";
import {
  buildRestaurantSmartTemplates,
  setContentField,
  isSmartTemplate,
  getContentValues,
} from "../lib/smart-templates";

const all = buildRestaurantSmartTemplates();
const d = all["Daily Special"];
if (!isSmartTemplate(d)) throw new Error("not smart");
if (getElements(d).length < 5) throw new Error("missing elements");
if ((d.editableFields?.length ?? 0) < 6) throw new Error("missing fields");

const next = setContentField(d, "price", "$42");
if (getContentValues(next).price !== "$42") throw new Error("contentValues");
if (getElements(next).find((e) => e.id === "el_price")?.props.price !== "$42") {
  throw new Error("element price not synced");
}

const titled = setContentField(next, "title", "Tonight Only");
if (getElements(titled).find((e) => e.id === "el_title")?.props.text !== "Tonight Only") {
  throw new Error("title not synced");
}
if (titled.layoutLocked !== false) throw new Error("layout should stay unlocked by default");

console.log("✓ Smart Template schema + live content sync OK");
console.log(`  ${Object.keys(all).length} restaurant templates`);
console.log(`  Daily Special: ${getElements(d).length} elements, ${d.editableFields?.length} fields`);
