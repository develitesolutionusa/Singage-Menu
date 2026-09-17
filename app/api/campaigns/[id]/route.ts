import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const [loopsRes, playersRes, exceptionsRes] = await Promise.all([
    supabase
      .from("campaign_loops")
      .select("*, loop:loops(*)")
      .eq("clerk_org_id", ctx.orgId)
      .eq("campaign_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("campaign_players")
      .select("*, player:players(*)")
      .eq("clerk_org_id", ctx.orgId)
      .eq("campaign_id", id),
    supabase
      .from("campaign_exceptions")
      .select("*, override_loop:loops(*)")
      .eq("clerk_org_id", ctx.orgId)
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    campaign,
    loops: loopsRes.data ?? [],
    players: playersRes.data ?? [],
    exceptions: exceptionsRes.data ?? [],
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const body = updateSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("campaigns")
    .update({ name: body.name })
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Updated campaign "${data.name}"`,
    entityType: "campaign",
    entityId: data.id,
  });

  return NextResponse.json({ campaign: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("campaigns")
    .delete()
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .select("id, name")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Deleted campaign "${data.name}"`,
    entityType: "campaign",
    entityId: data.id,
  });

  return NextResponse.json({ ok: true });
}
