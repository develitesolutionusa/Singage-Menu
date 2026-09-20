import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

const idSchema = z.string().uuid();

export async function POST(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: template } = await supabase
    .from("templates")
    .select("id")
    .eq("id", parsed.data)
    .eq("is_published", true)
    .maybeSingle();

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("template_favorites")
    .select("id")
    .eq("clerk_org_id", ctx.orgId)
    .eq("clerk_user_id", ctx.userId)
    .eq("template_id", parsed.data)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("template_favorites")
      .delete()
      .eq("id", existing.id)
      .eq("clerk_org_id", ctx.orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ favorited: false });
  }

  const { error } = await supabase.from("template_favorites").insert({
    clerk_org_id: ctx.orgId,
    clerk_user_id: ctx.userId,
    template_id: parsed.data,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ favorited: true });
}
