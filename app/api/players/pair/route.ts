import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const pairSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Pairing code must be 6 digits"),
  name: z.string().trim().min(1).max(120).optional(),
});

/** Claim an unpaired player by 6-digit code into the current org. */
export async function POST(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const body = pairSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data: player, error: findError } = await supabase
    .from("players")
    .select("*")
    .eq("pairing_code", body.code)
    .is("clerk_org_id", null)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (!player) {
    return NextResponse.json(
      { error: "Invalid or already claimed pairing code" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("players")
    .update({
      clerk_org_id: ctx.orgId,
      pairing_code: null,
      status: "online" as const,
      last_seen_at: new Date().toISOString(),
      name: body.name ?? player.name ?? "New Player",
    })
    .eq("id", player.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to pair player" },
      { status: 500 },
    );
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Paired player "${data.name}"`,
    entityType: "player",
    entityId: data.id,
  });

  return NextResponse.json({ player: data }, { status: 201 });
}
