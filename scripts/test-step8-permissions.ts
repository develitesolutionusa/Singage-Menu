import assert from "node:assert/strict";
import { authorizeDesignDataUpdate } from "../lib/design-auth";
import { buildRestaurantSmartTemplates, getContentValues } from "../lib/smart-templates";
import { permissionsForOrgRole } from "../lib/template-permissions";
import { getElements } from "../lib/design-elements";

const member = permissionsForOrgRole("org:member");
const admin = permissionsForOrgRole("org:admin");
const specialBase = buildRestaurantSmartTemplates()["Daily Special"];
/** Permission tests use an explicitly locked instance (defaults are unlocked). */
const special = { ...specialBase, layoutLocked: true };

// Member can edit content while locked
const contentEdit = authorizeDesignDataUpdate(
  special,
  {
    ...special,
    contentValues: { ...getContentValues(special), price: "$99" },
  },
  member,
);
assert.equal(contentEdit.ok, true);
if (contentEdit.ok) {
  assert.equal(getContentValues(contentEdit.data).price, "$99");
  assert.equal(contentEdit.data.layoutLocked, true);
  assert.equal(
    getElements(contentEdit.data).find((e) => e.id === "el_price")?.x,
    getElements(special).find((e) => e.id === "el_price")?.x,
  );
}

// Member cannot unlock
const unlockAttempt = authorizeDesignDataUpdate(
  special,
  { ...special, layoutLocked: false },
  member,
);
assert.equal(unlockAttempt.ok, false);
if (!unlockAttempt.ok) {
  assert.equal(unlockAttempt.permission, "unlock_layout");
}

// Member structural move is stripped to content-only (or rejected)
const moved = {
  ...special,
  elements: getElements(special).map((el) =>
    el.id === "el_price" ? { ...el, x: el.x + 40 } : el,
  ),
};
const memberMove = authorizeDesignDataUpdate(special, moved, member);
assert.equal(memberMove.ok, true);
if (memberMove.ok) {
  assert.equal(
    getElements(memberMove.data).find((e) => e.id === "el_price")?.x,
    getElements(special).find((e) => e.id === "el_price")?.x,
    "member move should not persist",
  );
}

// Admin can unlock and move
const adminUnlock = authorizeDesignDataUpdate(
  special,
  { ...moved, layoutLocked: false },
  admin,
);
assert.equal(adminUnlock.ok, true);
if (adminUnlock.ok) {
  assert.equal(adminUnlock.data.layoutLocked, false);
  assert.equal(
    getElements(adminUnlock.data).find((e) => e.id === "el_price")?.x,
    getElements(special).find((e) => e.id === "el_price")!.x + 40,
  );
}

assert.equal(member.unlock_layout, false);
assert.equal(admin.unlock_layout, true);
assert.equal(member.edit_content, true);
assert.equal(admin.publish, true);

console.log("✓ Step 8 layout lock + permissions OK");
