import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg, requirePermission } from "@/lib/clerk";
import { authorizeDesignDataUpdate } from "@/lib/design-auth";
import {
  formatPublishValidationError,
  validateDesignForPublish,
} from "@/lib/design-publish-validation";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { buildTemplateVersionStatus } from "@/lib/template-versioning";
import type { DesignData, LoopItem, Orientation, Template } from "@/types/db";

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
      /** Persist as saved when omitted; draft is only for in-editor unsaved state. */
      publishStatus: z.enum(["draft", "saved", "published"]).optional(),
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

  const rows = (items ?? []) as LoopItem[];
  const templateIds = Array.from(
    new Set(
      rows
        .map((row) => row.source_template_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const mastersById = new Map<
    string,
    Pick<Template, "id" | "name" | "version">
  >();
  if (templateIds.length > 0) {
    const { data: masters, error: mastersError } = await supabase
      .from("templates")
      .select("id, name, version")
      .in("id", templateIds);

    if (mastersError) {
      return NextResponse.json({ error: mastersError.message }, { status: 500 });
    }
    for (const master of masters ?? []) {
      mastersById.set(master.id, master);
    }
  }

  const enriched = rows.map((row) => ({
    ...row,
    template_version_status: buildTemplateVersionStatus({
      item: row,
      master: row.source_template_id
        ? (mastersById.get(row.source_template_id) ?? null)
        : null,
    }),
  }));

  return NextResponse.json({
    loop,
    items: enriched,
    permissions: ctx.permissions,
  });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const denied = requirePermission(ctx, "edit_content");
  if (denied) return denied;

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
    .select("id, orientation, name")
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", id)
    .single();

  if (!loop) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  const publishingItems = body.items.filter(
    (item) => item.publishStatus === "published",
  );

  const designItemIds = Array.from(
    new Set([
      ...body.items
        .filter((item) => item.contentData != null || item.designData != null)
        .map((item) => item.id),
      ...publishingItems.map((item) => item.id),
    ]),
  );

  const previousById = new Map<string, DesignData | null>();
  const previousStatusById = new Map<string, string>();
  if (designItemIds.length > 0) {
    const { data: existingRows, error: existingError } = await supabase
      .from("loop_items")
      .select("id, design_data, content_data, slide_name, publish_status")
      .eq("clerk_org_id", ctx.orgId)
      .eq("loop_id", id)
      .in("id", designItemIds);

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 },
      );
    }

    for (const row of existingRows ?? []) {
      previousById.set(
        row.id,
        (row.content_data as DesignData | null) ??
          (row.design_data as DesignData | null) ??
          null,
      );
      previousStatusById.set(row.id, row.publish_status ?? "draft");
    }
  }

  const newlyPublishing = publishingItems.filter(
    (item) => previousStatusById.get(item.id) !== "published",
  );
  if (newlyPublishing.length > 0) {
    const denied = requirePermission(ctx, "publish");
    if (denied) return denied;
  }

  let publishedCount = 0;
  const orientation = (loop.orientation === "portrait"
    ? "portrait"
    : "landscape") as Orientation;

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

    const incomingDesign =
      (item.contentData as DesignData | undefined) ??
      (item.designData as DesignData | undefined);

    if (incomingDesign != null) {
      const authorized = authorizeDesignDataUpdate(
        previousById.get(item.id) ?? null,
        incomingDesign,
        ctx.permissions,
      );
      if (!authorized.ok) {
        return NextResponse.json(
          { error: authorized.error, permission: authorized.permission },
          { status: 403 },
        );
      }

      const nextStatus = item.publishStatus ?? "saved";
      if (nextStatus === "published") {
        const validation = validateDesignForPublish(authorized.data, {
          orientation,
          slideName: item.slideName,
        });
        if (!validation.ok) {
          return NextResponse.json(
            {
              error: formatPublishValidationError(validation),
              issues: validation.issues,
            },
            { status: 400 },
          );
        }
        if (previousStatusById.get(item.id) !== "published") {
          publishedCount += 1;
        }
      }

      update.content_data = authorized.data;
      update.design_data = authorized.data;
      update.publish_status = nextStatus;
    } else if (item.publishStatus != null) {
      // Status-only updates (e.g. publish already-persisted design)
      if (item.publishStatus === "published") {
        const existing = previousById.get(item.id);
        const validation = validateDesignForPublish(existing ?? null, {
          orientation,
          slideName: item.slideName,
        });
        if (!validation.ok) {
          return NextResponse.json(
            {
              error: formatPublishValidationError(validation),
              issues: validation.issues,
            },
            { status: 400 },
          );
        }
        publishedCount += 1;
      }
      update.publish_status = item.publishStatus;
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

  // Touch the loop so players subscribed to `loops` also refresh playback.
  if (publishedCount > 0 || designItemIds.length > 0) {
    await supabase
      .from("loops")
      .update({ updated_at: new Date().toISOString() })
      .eq("clerk_org_id", ctx.orgId)
      .eq("id", id);
  }

  if (publishedCount > 0) {
    await logActivity({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: `Published ${publishedCount} slide(s) on loop "${loop.name}"`,
      entityType: "loop",
      entityId: id,
    });
  }

  return NextResponse.json({ ok: true, publishedCount });
}

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const denied = requirePermission(ctx, "edit_content");
  if (denied) return denied;

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
