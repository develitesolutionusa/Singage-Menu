import { NextResponse } from "next/server";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import {
  getHeartbeatTimestamps,
  isOnlineFromTimestamps,
} from "@/lib/player-heartbeat";
import { createServiceClient } from "@/lib/supabase";

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

  const rows = data ?? [];
  const redisBeats = await getHeartbeatTimestamps(rows.map((p) => p.id));
  const now = Date.now();

  const players = rows.map((player) => {
    const redisSeen = redisBeats.get(player.id);
    const lastSeenAt = redisSeen ?? player.last_seen_at;
    const online = isOnlineFromTimestamps(lastSeenAt, now);
    return {
      ...player,
      last_seen_at: lastSeenAt,
      status:
        player.status === "unpaired"
          ? "unpaired"
          : online
            ? "online"
            : "offline",
    };
  });

  return NextResponse.json({ players });
}
