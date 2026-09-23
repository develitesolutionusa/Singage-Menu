import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { buildTemplateSlideInsert } from "@/lib/loop-slides";

type Params = { params: Promise<{ id: string }> };

const useSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    loopId: z.string().uuid(),
  }),
  z.object({
    mode: z.literal("new"),
    loopName: z.string().trim().min(1).max(120).optional(),
    orientation: z.enum(["landscape", "portrait"]).optional(),
  }),
]);

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const templateId = z.string().uuid().safeParse(id);
  if (!templateId.success) {
    return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
  }

  const body = useSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId.data)
    .eq("is_published", true)
    .maybeSingle();

  if (templateError) {
    return NextResponse.json({ error: templateError.message }, { status: 500 });
  }
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let loopId: string;
  let createdNew = false;

  if (body.mode === "existing") {
    const { data: loop } = await supabase
      .from("loops")
      .select("id, name")
      .eq("clerk_org_id", ctx.orgId)
      .eq("id", body.loopId)
      .maybeSingle();

    if (!loop) {
      return NextResponse.json({ error: "Loop not found" }, { status: 404 });
    }
    loopId = loop.id;
  } else {
    const name = body.loopName?.trim() || template.name;
    const orientation = body.orientation ?? template.orientation ?? "landscape";

    const { data: loop, error: loopError } = await supabase
      .from("loops")
      .insert({
        clerk_org_id: ctx.orgId,
        name,
        orientation,
      })
      .select("id, name")
      .single();

    if (loopError || !loop) {
      return NextResponse.json(
        { error: loopError?.message ?? "Could not create loop" },
        { status: 500 },
      );
    }

    loopId = loop.id;
    createdNew = true;

    await logActivity({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: `Created loop "${name}" from template "${template.name}"`,
      entityType: "loop",
      entityId: loop.id,
    });
  }

  const { data: existing } = await supabase
    .from("loop_items")
    .select("position")
    .eq("loop_id", loopId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    body.mode === "new" ? 0 : (existing?.[0]?.position ?? -1) + 1;

  const { data: item, error: itemError } = await supabase
    .from("loop_items")
    .insert(
      buildTemplateSlideInsert({
        orgId: ctx.orgId,
        loopId,
        template,
        position: nextPosition,
      }),
    )
    .select("*")
    .single();

  if (itemError || !item) {
    return NextResponse.json(
      { error: itemError?.message ?? "Could not add template slide" },
      { status: 500 },
    );
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: createdNew
      ? `Added template "${template.name}" as first slide`
      : `Added template "${template.name}" to a loop`,
    entityType: "loop",
    entityId: loopId,
    metadata: { templateId: template.id, loopItemId: item.id },
  });

  return NextResponse.json(
    {
      loopId,
      item,
      createdNew,
    },
    { status: 201 },
  );
}
