import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

const replaceSchema = z.object({
  loopIds: z.array(z.string().uuid()),
});

const addSchema = z.object({
  loopId: z.string().uuid(),
});

async function assertCampaign(orgId: string, campaignId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id")
    .eq("clerk_org_id", orgId)
    .eq("id", campaignId)
    .maybeSingle();
  return data;
}

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  if (!(await assertCampaign(ctx.orgId, id))) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("campaign_loops")
    .select("*, loop:loops(*)")
    .eq("clerk_org_id", ctx.orgId)
    .eq("campaign_id", id)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ loops: data ?? [] });
}

/** Replace full ordered loop list for the campaign. */
export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  if (!(await assertCampaign(ctx.orgId, id))) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const body = replaceSchema.parse(await request.json());
  const supabase = createServiceClient();

  if (body.loopIds.length) {
    const { data: loops } = await supabase
      .from("loops")
      .select("id")
      .eq("clerk_org_id", ctx.orgId)
      .in("id", body.loopIds);
    const valid = new Set((loops ?? []).map((l) => l.id));
    if (body.loopIds.some((lid) => !valid.has(lid))) {
      return NextResponse.json(
        { error: "One or more loops were not found" },
        { status: 400 },
      );
    }
  }

  await supabase
    .from("campaign_loops")
    .delete()
    .eq("clerk_org_id", ctx.orgId)
    .eq("campaign_id", id);

  if (body.loopIds.length) {
    const { error } = await supabase.from("campaign_loops").insert(
      body.loopIds.map((loopId, position) => ({
        clerk_org_id: ctx.orgId,
        campaign_id: id,
        loop_id: loopId,
        position,
      })),
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await supabase
    .from("campaigns")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: "Updated campaign loops",
    entityType: "campaign",
    entityId: id,
  });

  const { data } = await supabase
    .from("campaign_loops")
    .select("*, loop:loops(*)")
    .eq("campaign_id", id)
    .order("position", { ascending: true });

  return NextResponse.json({ loops: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  if (!(await assertCampaign(ctx.orgId, id))) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const body = addSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data: loop } = await supabase
    .from("loops")
    .select("id")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", body.loopId)
    .maybeSingle();

  if (!loop) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("campaign_loops")
    .select("position")
    .eq("campaign_id", id)
    .order("position", { ascending: false })
    .limit(1);

  const position = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("campaign_loops")
    .insert({
      clerk_org_id: ctx.orgId,
      campaign_id: id,
      loop_id: body.loopId,
      position,
    })
    .select("*, loop:loops(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ loop: data }, { status: 201 });
}

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const body = z
    .object({ campaignLoopId: z.string().uuid() })
    .parse(await request.json());

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("campaign_loops")
    .delete()
    .eq("clerk_org_id", ctx.orgId)
    .eq("campaign_id", id)
    .eq("id", body.campaignLoopId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
