/**
 * Persist Smart Template schemas for Restaurant & Food system templates.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { buildRestaurantSmartTemplates } from "../lib/smart-templates.ts";

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const catalog = buildRestaurantSmartTemplates();
  const names = Object.keys(catalog);
  console.log(`Upgrading ${names.length} restaurant Smart Templates…`);

  for (const name of names) {
    const design = catalog[name];
    const { data, error } = await supabase
      .from("templates")
      .update({
        design_data: design,
        version: 2,
      })
      .eq("name", name)
      .is("clerk_org_id", null)
      .select("id, name")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      console.warn(`  · skipped (not found): ${name}`);
      continue;
    }
    console.log(`  ✓ ${data.name} (${data.id})`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
