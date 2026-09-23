import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { TEMPLATE_INDUSTRIES } from "@/lib/templates";
import { ensureSmartDesign } from "@/lib/smart-templates";
import type { DesignData, Template, TemplateIndustry } from "@/types/db";

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  industry: z.enum(TEMPLATE_INDUSTRIES as [TemplateIndustry, ...TemplateIndustry[]]).optional(),
  category: z.string().trim().max(80).optional(),
  favoritesOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export async function GET(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    industry: url.searchParams.get("industry") || undefined,
    category: url.searchParams.get("category") || undefined,
    favoritesOnly: url.searchParams.get("favoritesOnly") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { q, industry, category, favoritesOnly } = parsed.data;
  const supabase = createServiceClient();

  let query = supabase
    .from("templates")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (industry) query = query.eq("industry", industry);
  if (category) query = query.eq("category", category);

  const { data: templates, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: favorites, error: favError } = await supabase
    .from("template_favorites")
    .select("template_id")
    .eq("clerk_org_id", ctx.orgId)
    .eq("clerk_user_id", ctx.userId);

  if (favError) {
    return NextResponse.json({ error: favError.message }, { status: 500 });
  }

  const favoriteIds = new Set((favorites ?? []).map((f) => f.template_id));

  let filtered = (templates ?? []) as Template[];

  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((t) => {
      if (t.name.toLowerCase().includes(needle)) return true;
      if (t.category.toLowerCase().includes(needle)) return true;
      if (t.industry.toLowerCase().includes(needle)) return true;
      return (t.tags ?? []).some((tag) => tag.toLowerCase().includes(needle));
    });
  }

  const items = filtered
    .map((t) => ({
      id: t.id,
      name: t.name,
      industry: t.industry,
      category: t.category,
      tags: t.tags ?? [],
      orientation: t.orientation,
      default_duration_seconds: Number(t.default_duration_seconds),
      design_data: ensureSmartDesign(
        (t.design_data ?? {}) as DesignData,
        t.name,
      ),
      sort_order: t.sort_order,
      is_favorited: favoriteIds.has(t.id),
    }))
    .filter((t) => (favoritesOnly ? t.is_favorited : true));

  const categories = Array.from(
    new Set(
      ((templates ?? []) as Template[])
        .filter((t) => !industry || t.industry === industry)
        .map((t) => t.category),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({
    templates: items,
    industries: TEMPLATE_INDUSTRIES,
    categories,
  });
}
