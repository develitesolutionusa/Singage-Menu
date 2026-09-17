import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

const daySchema = z.number().int().min(0).max(6);

const exceptionSchema = z.object({
  name: z.string().trim().min(1).max(120).default("Exception"),
  overrideLoopId: z.string().uuid(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  daysOfWeek: z.array(daySchema).nullable().optional(),
  enabled: z.boolean().optional().default(true),
});

const updateSchema = exceptionSchema.partial().extend({
  exceptionId: z.string().uuid(),
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
    .from("campaign_exceptions")
    .select("*, override_loop:loops(*)")
    .eq("clerk_org_id", ctx.orgId)
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exceptions: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  if (!(await assertCampaign(ctx.orgId, id))) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const body = exceptionSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data: loop } = await supabase
    .from("loops")
    .select("id")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", body.overrideLoopId)
    .maybeSingle();

  if (!loop) {
    return NextResponse.json({ error: "Override loop not found" }, { status: 404 });
  }

  if (
    body.startDate &&
    body.endDate &&
    body.startDate > body.endDate
  ) {
    return NextResponse.json(
      { error: "startDate must be on or before endDate" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("campaign_exceptions")
    .insert({
      clerk_org_id: ctx.orgId,
      campaign_id: id,
      name: body.name,
      override_loop_id: body.overrideLoopId,
      start_date: body.startDate ?? null,
      end_date: body.endDate ?? null,
      days_of_week: body.daysOfWeek ?? null,
      enabled: body.enabled ?? true,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create exception" },
      { status: 500 },
    );
  }

  const { data: withLoop } = await supabase
    .from("campaign_exceptions")
    .select("*, override_loop:loops(*)")
    .eq("id", data.id)
    .maybeSingle();

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Added exception "${data.name}"`,
    entityType: "campaign_exception",
    entityId: data.id,
  });

  return NextResponse.json(
    { exception: withLoop ?? data },
    { status: 201 },
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  if (!(await assertCampaign(ctx.orgId, id))) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const body = updateSchema.parse(await request.json());
  const supabase = createServiceClient();

  if (body.overrideLoopId) {
    const { data: loop } = await supabase
      .from("loops")
      .select("id")
      .eq("clerk_org_id", ctx.orgId)
      .eq("id", body.overrideLoopId)
      .maybeSingle();
    if (!loop) {
      return NextResponse.json(
        { error: "Override loop not found" },
        { status: 404 },
      );
    }
  }

  const { data, error } = await supabase
    .from("campaign_exceptions")
    .update({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.overrideLoopId !== undefined
        ? { override_loop_id: body.overrideLoopId }
        : {}),
      ...(body.startDate !== undefined ? { start_date: body.startDate } : {}),
      ...(body.endDate !== undefined ? { end_date: body.endDate } : {}),
      ...(body.daysOfWeek !== undefined
        ? { days_of_week: body.daysOfWeek }
        : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    })
    .eq("clerk_org_id", ctx.orgId)
    .eq("campaign_id", id)
    .eq("id", body.exceptionId)
    .select("*, override_loop:loops(*)")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Exception not found" }, { status: 404 });
  }

  return NextResponse.json({ exception: data });
}

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const body = z
    .object({ exceptionId: z.string().uuid() })
    .parse(await request.json());

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("campaign_exceptions")
    .delete()
    .eq("clerk_org_id", ctx.orgId)
    .eq("campaign_id", id)
    .eq("id", body.exceptionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: "Deleted a campaign exception",
    entityType: "campaign_exception",
    entityId: body.exceptionId,
  });

  return NextResponse.json({ ok: true });
}
