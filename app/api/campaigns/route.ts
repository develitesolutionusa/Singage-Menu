import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  loopIds: z.array(z.string().uuid()).optional(),
});

export async function GET() {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const supabase = createServiceClient();
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("clerk_org_id", ctx.orgId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (campaigns ?? []).map((c) => c.id);
  if (!ids.length) {
    return NextResponse.json({ campaigns: [] });
  }

  const [{ data: campaignLoops }, { data: campaignPlayers }] = await Promise.all([
    supabase
      .from("campaign_loops")
      .select("*, loop:loops(*)")
      .eq("clerk_org_id", ctx.orgId)
      .in("campaign_id", ids)
      .order("position", { ascending: true }),
    supabase
      .from("campaign_players")
      .select("campaign_id, player_id")
      .eq("clerk_org_id", ctx.orgId)
      .in("campaign_id", ids),
  ]);

  const loopsByCampaign = new Map<
    string,
    Array<{
      campaign_id: string;
      loop_id: string;
      position: number;
      loop?: { name?: string } | null;
    }>
  >();
  for (const row of (campaignLoops ?? []) as Array<{
    campaign_id: string;
    loop_id: string;
    position: number;
    loop?: { name?: string } | null;
  }>) {
    const list = loopsByCampaign.get(row.campaign_id) ?? [];
    list.push(row);
    loopsByCampaign.set(row.campaign_id, list);
  }

  const playersByCampaign = new Map<string, number>();
  for (const row of (campaignPlayers ?? []) as Array<{
    campaign_id: string;
    player_id: string;
  }>) {
    playersByCampaign.set(
      row.campaign_id,
      (playersByCampaign.get(row.campaign_id) ?? 0) + 1,
    );
  }

  const enriched = (campaigns ?? []).map((campaign) => {
    const loops = loopsByCampaign.get(campaign.id) ?? [];
    const main = loops[0];
    const mainLoopName = main?.loop?.name ?? null;
    return {
      ...campaign,
      mainLoopName,
      loopsCount: loops.length,
      playersCount: playersByCampaign.get(campaign.id) ?? 0,
      loops,
    };
  });

  return NextResponse.json({ campaigns: enriched });
}

export async function POST(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const body = createSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      clerk_org_id: ctx.orgId,
      name: body.name,
    })
    .select("*")
    .single();

  if (error || !campaign) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create campaign" },
      { status: 500 },
    );
  }

  if (body.loopIds?.length) {
    const { data: loops } = await supabase
      .from("loops")
      .select("id")
      .eq("clerk_org_id", ctx.orgId)
      .in("id", body.loopIds);

    const valid = new Set((loops ?? []).map((l) => l.id));
    const rows = body.loopIds
      .filter((id) => valid.has(id))
      .map((loopId, position) => ({
        clerk_org_id: ctx.orgId,
        campaign_id: campaign.id,
        loop_id: loopId,
        position,
      }));

    if (rows.length) {
      const { error: linkError } = await supabase
        .from("campaign_loops")
        .insert(rows);
      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 500 });
      }
    }
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Created campaign "${campaign.name}"`,
    entityType: "campaign",
    entityId: campaign.id,
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
