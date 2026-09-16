import { NextResponse } from "next/server";
import { z } from "zod";
import { recordHeartbeat } from "@/lib/player-heartbeat";
import { createServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

const idSchema = z.string().uuid();

/** Public heartbeat — player pings every ~30s. */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: player, error } = await supabase
    .from("players")
    .select("id, clerk_org_id, status")
    .eq("id", parsed.data)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  if (!player.clerk_org_id) {
    return NextResponse.json(
      { error: "Player is not paired yet" },
      { status: 409 },
    );
  }

  const result = await recordHeartbeat(player.id);
  return NextResponse.json({ ok: true, ...result });
}
