import { NextResponse } from "next/server";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export async function GET() {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("clerk_org_id", ctx.orgId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const players = (data ?? []).map((player) => {
    const lastSeen = player.last_seen_at
      ? new Date(player.last_seen_at).getTime()
      : 0;
    const isOnline =
      player.status !== "unpaired" && now - lastSeen < ONLINE_THRESHOLD_MS;
    return {
      ...player,
      status: player.status === "unpaired" ? "unpaired" : isOnline ? "online" : "offline",
    };
  });

  return NextResponse.json({ players });
}
