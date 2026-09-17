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

  if (parentId === "all") {
    // all folders for move dropdown
  } else if (parentId === "root" || !parentId) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const folders = data ?? [];

  // Move dropdown only needs names — skip expensive totals.
  if (parentId === "all" || folders.length === 0) {
    return NextResponse.json({ folders });
  }

  // Sum size + duration of media in each folder (includes nested descendants).
  const [{ data: allFolders }, { data: allItems }] = await Promise.all([
    supabase
      .from("library_folders")
      .select("id, parent_id")
      .eq("clerk_org_id", ctx.orgId),
    supabase
      .from("library_items")
      .select("folder_id, size_bytes, duration_seconds")
      .eq("clerk_org_id", ctx.orgId),
  ]);

  const childrenByParent = new Map<string | null, string[]>();
  for (const folder of allFolders ?? []) {
    const key = folder.parent_id;
    const list = childrenByParent.get(key) ?? [];
    list.push(folder.id);
    childrenByParent.set(key, list);
  }

  const directTotals = new Map<string, { size: number; duration: number }>();
  for (const item of allItems ?? []) {
    if (!item.folder_id) continue;
    const current = directTotals.get(item.folder_id) ?? {
      size: 0,
      duration: 0,
    };
    current.size += Number(item.size_bytes) || 0;
    current.duration += Number(item.duration_seconds) || 0;
    directTotals.set(item.folder_id, current);
  }

  const subtreeCache = new Map<string, { size: number; duration: number }>();
  function subtreeTotal(folderId: string): { size: number; duration: number } {
    const cached = subtreeCache.get(folderId);
    if (cached) return cached;

    const direct = directTotals.get(folderId) ?? { size: 0, duration: 0 };
    let size = direct.size;
    let duration = direct.duration;
    for (const childId of childrenByParent.get(folderId) ?? []) {
      const child = subtreeTotal(childId);
      size += child.size;
      duration += child.duration;
    }
    const total = { size, duration };
    subtreeCache.set(folderId, total);
    return total;
  }

  return NextResponse.json({
    folders: folders.map((folder) => {
      const totals = subtreeTotal(folder.id);
      return {
        ...folder,
        size_bytes: totals.size,
        duration_seconds: totals.duration,
      };
    }),
  });
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

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export async function PATCH(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const body = updateSchema.parse(await request.json());
  if (body.name === undefined && body.parentId === undefined) {
    return NextResponse.json(
      { error: "Provide name and/or parentId to update" },
      { status: 400 },
    );
  }

  if (body.parentId === body.id) {
    return NextResponse.json(
      { error: "Folder cannot be its own parent" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  if (body.parentId) {
    const { data: parent } = await supabase
      .from("library_folders")
      .select("id")
      .eq("clerk_org_id", ctx.orgId)
      .eq("id", body.parentId)
      .maybeSingle();
    if (!parent) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }
  }

  const { data, error } = await supabase
    .from("library_folders")
    .update({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.parentId !== undefined ? { parent_id: body.parentId } : {}),
    })
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", body.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Updated folder "${data.name}"`,
    entityType: "library_folder",
    entityId: data.id,
  });

  return NextResponse.json({ folder: data });
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
