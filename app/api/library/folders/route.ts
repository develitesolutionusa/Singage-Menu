import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: z.string().uuid().nullable().optional(),
});

export async function GET(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");

  const supabase = createServiceClient();
  let query = supabase
    .from("library_folders")
    .select("*")
    .eq("clerk_org_id", ctx.orgId)
    .order("name", { ascending: true });

  if (parentId === "root" || !parentId) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ folders: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const body = createSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("library_folders")
    .insert({
      clerk_org_id: ctx.orgId,
      name: body.name,
      parent_id: body.parentId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Created folder "${body.name}"`,
    entityType: "library_folder",
    entityId: data.id,
  });

  return NextResponse.json({ folder: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const body = z
    .object({ id: z.string().uuid() })
    .parse(await request.json());

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("library_folders")
    .delete()
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: "Deleted a library folder",
    entityType: "library_folder",
    entityId: body.id,
  });

  return NextResponse.json({ ok: true });
}
