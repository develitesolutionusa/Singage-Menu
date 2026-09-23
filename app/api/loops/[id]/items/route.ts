import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import type { DesignData } from "@/types/db";

type Params = { params: Promise<{ id: string }> };

const itemSchema = z.object({
  libraryItemId: z.string().uuid(),
  durationSeconds: z.number().positive().max(36000).optional(),
});

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
      durationSeconds: z.number().positive().max(36000).optional(),
      contentData: z.record(z.string(), z.unknown()).optional(),
      designData: z.record(z.string(), z.unknown()).optional(),
      slideName: z.string().trim().min(1).max(120).optional(),
    }),
  ),
});

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: loop, error: loopError } = await supabase
    .from("loops")
    .select("*")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .single();

  if (loopError || !loop) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  const { data: items, error } = await supabase
    .from("loop_items")
    .select("*, library_item:library_items(*)")
    .eq("clerk_org_id", ctx.orgId)
    .eq("loop_id", id)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ loop, items: items ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const body = itemSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data: loop } = await supabase
    .from("loops")
    .select("id")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .single();

  if (!loop) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  const { data: libraryItem } = await supabase
    .from("library_items")
    .select("*")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", body.libraryItemId)
    .single();

  if (!libraryItem) {
    return NextResponse.json(
      { error: "Library item not found" },
      { status: 404 },
    );
  }

  const { data: existing } = await supabase
    .from("loop_items")
    .select("position")
    .eq("loop_id", id)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;
  const duration =
    body.durationSeconds ??
    libraryItem.duration_seconds ??
    (libraryItem.file_type === "image" ? 10 : 15);

  const { data, error } = await supabase
    .from("loop_items")
    .insert({
      clerk_org_id: ctx.orgId,
      loop_id: id,
      library_item_id: body.libraryItemId,
      position: nextPosition,
      duration_seconds: duration,
    })
    .select("*, library_item:library_items(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Added "${libraryItem.name}" to a loop`,
    entityType: "loop",
    entityId: id,
  });

  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const body = reorderSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data: loop } = await supabase
    .from("loops")
    .select("id")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .single();

  if (!loop) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  for (const item of body.items) {
    const update: {
      position: number;
      duration_seconds?: number;
      content_data?: DesignData;
      design_data?: DesignData;
      slide_name?: string;
      publish_status?: "draft" | "saved" | "published";
    } = {
      position: item.position,
    };
    if (item.durationSeconds != null) {
      update.duration_seconds = item.durationSeconds;
    }
    if (item.contentData != null) {
      update.content_data = item.contentData as DesignData;
      update.design_data = item.contentData as DesignData;
      update.publish_status = "saved";
    } else if (item.designData != null) {
      update.design_data = item.designData as DesignData;
      update.content_data = item.designData as DesignData;
      update.publish_status = "saved";
    }
    if (item.slideName != null) {
      update.slide_name = item.slideName;
    }

    const { error } = await supabase
      .from("loop_items")
      .update(update)
      .eq("clerk_org_id", ctx.orgId)
      .eq("loop_id", id)
      .eq("id", item.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const body = z
    .object({ itemId: z.string().uuid() })
    .parse(await request.json());

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("loop_items")
    .delete()
    .eq("clerk_org_id", ctx.orgId)
    .eq("loop_id", id)
    .eq("id", body.itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
