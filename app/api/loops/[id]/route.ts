import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  orientation: z.enum(["landscape", "portrait"]).optional(),
});

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("loops")
    .select("*")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  return NextResponse.json({ loop: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const body = updateSchema.parse(await request.json());

  if (body.name === undefined && body.orientation === undefined) {
    return NextResponse.json(
      { error: "Provide name and/or orientation to update" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("loops")
    .update({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.orientation !== undefined
        ? { orientation: body.orientation }
        : {}),
    })
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Updated loop "${data.name}"`,
    entityType: "loop",
    entityId: data.id,
  });

  return NextResponse.json({ loop: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("loops")
    .delete()
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .select("id, name")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Deleted loop "${data.name}"`,
    entityType: "loop",
    entityId: data.id,
  });

  return NextResponse.json({ ok: true });
}
