/**
 * Persist Smart Template schemas for Restaurant & Food system templates.
 * Inserts missing templates; updates existing ones.
 * Run: npx tsx scripts/upgrade-smart-templates.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { buildRestaurantSmartTemplates } from "../lib/smart-templates";
import type { DesignData, Orientation, TemplateIndustry } from "../types/db";

function loadEnvFile(file: string) {
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

type TemplateSeedMeta = {
  industry: TemplateIndustry;
  category: string;
  tags: string[];
  orientation: Orientation;
  default_duration_seconds: number;
  sort_order: number;
};

const META: Record<string, TemplateSeedMeta> = {
  "Restaurant Menu": {
    industry: "Restaurant & Food",
    category: "Menu",
    tags: ["menu", "board", "dining"],
    orientation: "landscape",
    default_duration_seconds: 20,
    sort_order: 1,
  },
  "Food Promotion": {
    industry: "Restaurant & Food",
    category: "Promotion",
    tags: ["promo", "sale", "marketing"],
    orientation: "landscape",
    default_duration_seconds: 12,
    sort_order: 2,
  },
  "Daily Special": {
    industry: "Restaurant & Food",
    category: "Special",
    tags: ["daily", "chef", "special"],
    orientation: "landscape",
    default_duration_seconds: 15,
    sort_order: 3,
  },
  "Happy Hour": {
    industry: "Restaurant & Food",
    category: "Promotion",
    tags: ["drinks", "bar", "happy-hour"],
    orientation: "landscape",
    default_duration_seconds: 12,
    sort_order: 4,
  },
  "Breakfast Menu": {
    industry: "Restaurant & Food",
    category: "Menu",
    tags: ["breakfast", "morning", "brunch"],
    orientation: "landscape",
    default_duration_seconds: 18,
    sort_order: 5,
  },
  "Seasonal Offer": {
    industry: "Restaurant & Food",
    category: "Promotion",
    tags: ["seasonal", "limited", "offer"],
    orientation: "landscape",
    default_duration_seconds: 14,
    sort_order: 6,
  },
  "Lunch Deal": {
    industry: "Restaurant & Food",
    category: "Deal",
    tags: ["lunch", "combo", "deal"],
    orientation: "landscape",
    default_duration_seconds: 12,
    sort_order: 7,
  },
  "New Item": {
    industry: "Restaurant & Food",
    category: "Special",
    tags: ["new", "featured", "launch"],
    orientation: "landscape",
    default_duration_seconds: 12,
    sort_order: 8,
  },
  "Combo Promotion": {
    industry: "Restaurant & Food",
    category: "Deal",
    tags: ["combo", "family", "value"],
    orientation: "landscape",
    default_duration_seconds: 14,
    sort_order: 9,
  },
  "Premium Food Special": {
    industry: "Restaurant & Food",
    category: "Special",
    tags: ["premium", "biryani", "hero", "gold", "special"],
    orientation: "landscape",
    default_duration_seconds: 15,
    sort_order: 0,
  },
};

async function upsertTemplate(name: string, design: DesignData) {
  const meta = META[name] ?? {
    industry: "Restaurant & Food" as TemplateIndustry,
    category: "Custom",
    tags: ["smart"],
    orientation: "landscape" as Orientation,
    default_duration_seconds: 15,
    sort_order: 50,
  };

  const { data: existing, error: findError } = await supabase
    .from("templates")
    .select("id, version")
    .eq("name", name)
    .is("clerk_org_id", null)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const nextVersion = Math.max(2, Number(existing.version) || 1) + 0;
    const { data, error } = await supabase
      .from("templates")
      .update({
        design_data: design,
        version: Math.max(2, Number(existing.version) || 1),
        category: meta.category,
        tags: meta.tags,
        sort_order: meta.sort_order,
        is_published: true,
      })
      .eq("id", existing.id)
      .select("id, name, version")
      .single();
    if (error) throw error;
    console.log(`  ✓ updated ${data.name} v${data.version} (${data.id})`);
    void nextVersion;
    return;
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({
      clerk_org_id: null,
      name,
      industry: meta.industry,
      category: meta.category,
      tags: meta.tags,
      orientation: meta.orientation,
      default_duration_seconds: meta.default_duration_seconds,
      design_data: design,
      sort_order: meta.sort_order,
      is_published: true,
      version: 1,
    })
    .select("id, name, version")
    .single();

  if (error) throw error;
  console.log(`  + inserted ${data.name} v${data.version} (${data.id})`);
}

async function main() {
  const catalog = buildRestaurantSmartTemplates();
  const names = Object.keys(catalog);
  console.log(`Upserting ${names.length} restaurant Smart Templates…`);

  for (const name of names) {
    await upsertTemplate(name, catalog[name]);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
