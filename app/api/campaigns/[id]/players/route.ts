import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { assignPlayerCampaign } from "@/lib/campaign-assign";

type Params = { params: Promise<{ id: string }> };

const assignSchema = z.object({
  playerIds: z.array(z.string().uuid()),
});

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("campaign_players")
    .select("*, player:players(*)")
    .eq("clerk_org_id", ctx.orgId)
    .eq("campaign_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ players: data ?? [] });
}

/** Replace the set of players assigned to this campaign. */
export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const body = assignSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (body.playerIds.length) {
    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("clerk_org_id", ctx.orgId)
      .in("id", body.playerIds);
    const valid = new Set((players ?? []).map((p) => p.id));
    if (body.playerIds.some((pid) => !valid.has(pid))) {
      return NextResponse.json(
        { error: "One or more players were not found" },
        { status: 400 },
      );
    }
  }

  // Unassign anyone currently on this campaign but not in the new set
  const { data: current } = await supabase
    .from("campaign_players")
    .select("player_id")
    .eq("clerk_org_id", ctx.orgId)
    .eq("campaign_id", id);

  const nextSet = new Set(body.playerIds);
  for (const row of current ?? []) {
    if (!nextSet.has(row.player_id)) {
      await assignPlayerCampaign(supabase, ctx.orgId, row.player_id, null);
    }
  }

  for (const playerId of body.playerIds) {
    await assignPlayerCampaign(supabase, ctx.orgId, playerId, id);
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Assigned players to campaign "${campaign.name}"`,
    entityType: "campaign",
    entityId: id,
    metadata: { playerCount: body.playerIds.length },
  });

  const { data } = await supabase
    .from("campaign_players")
    .select("*, player:players(*)")
    .eq("campaign_id", id);

  return NextResponse.json({ players: data ?? [] });
}

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const body = z
    .object({ playerId: z.string().uuid() })
    .parse(await request.json());

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("campaign_players")
    .select("player_id")
    .eq("clerk_org_id", ctx.orgId)
    .eq("campaign_id", id)
    .eq("player_id", body.playerId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await assignPlayerCampaign(supabase, ctx.orgId, body.playerId, null);
  return NextResponse.json({ ok: true });
}
