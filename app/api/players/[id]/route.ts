import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { assignPlayerCampaign } from "@/lib/campaign-assign";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  rotation: z
    .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
    .optional(),
  campaignId: z.string().uuid().nullable().optional(),
});

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json({ player: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const body = updateSchema.parse(await request.json());
  const supabase = createServiceClient();

  if (body.campaignId) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("clerk_org_id", ctx.orgId)
      .eq("id", body.campaignId)
      .maybeSingle();
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
  }

  let data;
  try {
    if (body.campaignId !== undefined) {
      data = await assignPlayerCampaign(
        supabase,
        ctx.orgId,
        id,
        body.campaignId,
      );
    }

    const { data: updated, error } = await supabase
      .from("players")
      .update({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.rotation !== undefined ? { rotation: body.rotation } : {}),
      })
      .eq("clerk_org_id", ctx.orgId)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message ?? "Player not found" },
        { status: 404 },
      );
    }
    data = updated;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Updated player "${data.name}"`,
    entityType: "player",
    entityId: data.id,
  });

  return NextResponse.json({ player: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("players")
    .delete()
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .select("id, name")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Player not found" },
      { status: 404 },
    );
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Deleted player "${data.name}"`,
    entityType: "player",
    entityId: data.id,
  });

  return NextResponse.json({ ok: true });
}
