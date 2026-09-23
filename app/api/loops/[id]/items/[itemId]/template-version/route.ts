import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg, requirePermission } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import {
  buildDetachUpdate,
  buildTemplateVersionPreview,
  buildTemplateVersionStatus,
  mergeTemplateUpdate,
  withAcknowledgedMasterVersion,
} from "@/lib/template-versioning";
import type { LoopItem, Template } from "@/types/db";

type Params = { params: Promise<{ id: string; itemId: string }> };

const actionSchema = z.object({
  action: z.enum(["update", "keep", "detach"]),
});

type Loaded =
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      supabase: ReturnType<typeof createServiceClient>;
      loop: { id: string; name: string };
      item: LoopItem;
      master: Template | null;
    };

async function loadLinkedItem(input: {
  orgId: string;
  loopId: string;
  itemId: string;
}): Promise<Loaded> {
  const supabase = createServiceClient();

  const { data: loop } = await supabase
    .from("loops")
    .select("id, name")
    .eq("clerk_org_id", input.orgId)
    .eq("id", input.loopId)
    .maybeSingle();

  if (!loop) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Loop not found" }, { status: 404 }),
    };
  }

  const { data: item, error: itemError } = await supabase
    .from("loop_items")
    .select("*")
    .eq("clerk_org_id", input.orgId)
    .eq("loop_id", input.loopId)
    .eq("id", input.itemId)
    .maybeSingle();

  if (itemError) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: itemError.message },
        { status: 500 },
      ),
    };
  }
  if (!item || item.item_type !== "design") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Design slide not found" },
        { status: 404 },
      ),
    };
  }

  let master: Template | null = null;
  if (item.source_template_id) {
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", item.source_template_id)
      .maybeSingle();

    if (templateError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: templateError.message },
          { status: 500 },
        ),
      };
    }
    master = (template as Template | null) ?? null;
  }

  return {
    ok: true,
    supabase,
    loop,
    item: item as LoopItem,
    master,
  };
}

/** Preview version mismatch + change summary for confirmation dialog. */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id: loopId, itemId } = await params;
  const loaded = await loadLinkedItem({
    orgId: ctx.orgId,
    loopId,
    itemId,
  });
  if (!loaded.ok) return loaded.response;

  const { item, master } = loaded;

  if (!item.source_template_id || !master) {
    return NextResponse.json({
      status: buildTemplateVersionStatus({ item, master: null }),
      preview: null,
    });
  }

  const preview = buildTemplateVersionPreview({ item, master });
  return NextResponse.json({ status: preview, preview });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const denied = requirePermission(ctx, "edit_content");
  if (denied) return denied;

  const { id: loopId, itemId } = await params;
  const body = actionSchema.parse(await request.json());

  const loaded = await loadLinkedItem({
    orgId: ctx.orgId,
    loopId,
    itemId,
  });
  if (!loaded.ok) return loaded.response;

  const { supabase, loop, item, master } = loaded;

  if (body.action === "detach") {
    if (!item.source_template_id && !item.template_version) {
      return NextResponse.json({
        item,
        status: buildTemplateVersionStatus({ item, master: null }),
      });
    }

    const detached = buildDetachUpdate({ item });
    const { data: updated, error } = await supabase
      .from("loop_items")
      .update({
        source_template_id: null,
        template_version: null,
        content_data: detached.contentData,
        design_data: detached.designData,
        overrides: detached.overrides,
        publish_status: "draft",
      })
      .eq("clerk_org_id", ctx.orgId)
      .eq("loop_id", loopId)
      .eq("id", itemId)
      .select("*")
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message ?? "Could not detach" },
        { status: 500 },
      );
    }

    await logActivity({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: `Detached slide from template on loop "${loop.name}"`,
      entityType: "loop",
      entityId: loopId,
      metadata: { loopItemId: itemId },
    });

    return NextResponse.json({
      item: updated,
      status: buildTemplateVersionStatus({
        item: updated as LoopItem,
        master: null,
      }),
    });
  }

  if (!item.source_template_id || !master) {
    return NextResponse.json(
      { error: "Slide is not linked to a template" },
      { status: 400 },
    );
  }

  if (body.action === "keep") {
    const overrides = withAcknowledgedMasterVersion(
      item.overrides,
      Number(master.version) || 1,
    );
    const { data: updated, error } = await supabase
      .from("loop_items")
      .update({ overrides })
      .eq("clerk_org_id", ctx.orgId)
      .eq("loop_id", loopId)
      .eq("id", itemId)
      .select("*")
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message ?? "Could not keep current version" },
        { status: 500 },
      );
    }

    await logActivity({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: `Kept template v${item.template_version} on loop "${loop.name}" (master v${master.version})`,
      entityType: "loop",
      entityId: loopId,
      metadata: {
        loopItemId: itemId,
        templateId: master.id,
        instanceVersion: item.template_version,
        masterVersion: master.version,
      },
    });

    return NextResponse.json({
      item: updated,
      status: buildTemplateVersionStatus({
        item: updated as LoopItem,
        master,
      }),
    });
  }

  const merged = mergeTemplateUpdate({ item, master });
  const { data: updated, error } = await supabase
    .from("loop_items")
    .update({
      content_data: merged.contentData,
      design_data: merged.designData,
      template_version: merged.templateVersion,
      overrides: merged.overrides,
      publish_status: "draft",
    })
    .eq("clerk_org_id", ctx.orgId)
    .eq("loop_id", loopId)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Could not update to latest template" },
      { status: 500 },
    );
  }

  await supabase
    .from("loops")
    .update({ updated_at: new Date().toISOString() })
    .eq("clerk_org_id", ctx.orgId)
    .eq("id", loopId);

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Updated slide to template v${merged.templateVersion} on loop "${loop.name}"`,
    entityType: "loop",
    entityId: loopId,
    metadata: {
      loopItemId: itemId,
      templateId: master.id,
      fromVersion: item.template_version,
      toVersion: merged.templateVersion,
      preservedOverrides: merged.preservedCount,
    },
  });

  return NextResponse.json({
    item: updated,
    status: buildTemplateVersionStatus({
      item: updated as LoopItem,
      master,
    }),
    preservedCount: merged.preservedCount,
  });
}
