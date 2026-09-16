import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
});

export async function GET() {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("loops")
    .select("*")
    .eq("clerk_org_id", ctx.orgId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ loops: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const body = createSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("loops")
    .insert({
      clerk_org_id: ctx.orgId,
      name: body.name,
      orientation: body.orientation,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Created loop "${body.name}"`,
    entityType: "loop",
    entityId: data.id,
  });

  return NextResponse.json({ loop: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const body = z
    .object({ id: z.string().uuid() })
    .parse(await request.json());

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("loops")
    .delete()
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: "Deleted a loop",
    entityType: "loop",
    entityId: body.id,
  });

  return NextResponse.json({ ok: true });
}
