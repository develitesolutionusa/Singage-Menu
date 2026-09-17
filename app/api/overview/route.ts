import { NextResponse } from "next/server";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const supabase = createServiceClient();

  const [library, loops, players, campaigns, activities, announcements] =
    await Promise.all([
      supabase
        .from("library_items")
        .select("size_bytes")
        .eq("clerk_org_id", ctx.orgId),
      supabase
        .from("loops")
        .select("id", { count: "exact", head: true })
        .eq("clerk_org_id", ctx.orgId),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("clerk_org_id", ctx.orgId),
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("clerk_org_id", ctx.orgId),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("clerk_org_id", ctx.orgId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("announcements")
        .select("*")
        .or(`clerk_org_id.is.null,clerk_org_id.eq.${ctx.orgId}`)
        .order("published_at", { ascending: false })
        .limit(10),
    ]);

  const librarySizeBytes = (library.data ?? []).reduce(
    (sum, row) => sum + (row.size_bytes ?? 0),
    0,
  );

  return NextResponse.json({
    stats: {
      librarySizeBytes,
      loopsCount: loops.count ?? 0,
      playersCount: players.count ?? 0,
      campaignsCount: campaigns.count ?? 0,
    },
    activities: activities.data ?? [],
    announcements: announcements.data ?? [],
  });
}
