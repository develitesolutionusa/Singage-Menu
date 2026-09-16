import { getRedis } from "@/lib/redis";
import { createServiceClient } from "@/lib/supabase";

export const HEARTBEAT_KEY_PREFIX = "player:heartbeat:";
export const HEARTBEAT_TTL_SECONDS = 90;
export const ONLINE_THRESHOLD_MS = 90_000;
/** Sync Redis heartbeat to Supabase at most this often per player. */
export const SUPABASE_SYNC_INTERVAL_MS = 60_000;

export function heartbeatKey(playerId: string) {
  return `${HEARTBEAT_KEY_PREFIX}${playerId}`;
}

export async function recordHeartbeat(playerId: string): Promise<{
  syncedToDb: boolean;
  at: string;
}> {
  const at = new Date().toISOString();
  const redis = getRedis();

  if (redis) {
    await redis.set(heartbeatKey(playerId), at, { ex: HEARTBEAT_TTL_SECONDS });

    const syncKey = `${heartbeatKey(playerId)}:synced`;
    const alreadySynced = await redis.get<string>(syncKey);
    if (!alreadySynced) {
      await syncLastSeenToSupabase(playerId, at);
      await redis.set(syncKey, "1", {
        ex: Math.ceil(SUPABASE_SYNC_INTERVAL_MS / 1000),
      });
      return { syncedToDb: true, at };
    }
    return { syncedToDb: false, at };
  }

  // No Redis configured — write straight to Supabase (Phase 2 still works).
  await syncLastSeenToSupabase(playerId, at);
  return { syncedToDb: true, at };
}

async function syncLastSeenToSupabase(playerId: string, at: string) {
  const supabase = createServiceClient();
  await supabase
    .from("players")
    .update({
      last_seen_at: at,
      status: "online",
    })
    .eq("id", playerId)
    .not("clerk_org_id", "is", null);
}

export async function getHeartbeatTimestamps(
  playerIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const redis = getRedis();
  if (!redis || playerIds.length === 0) return map;

  const values = await Promise.all(
    playerIds.map((id) => redis.get<string>(heartbeatKey(id))),
  );
  playerIds.forEach((id, i) => {
    const value = values[i];
    if (typeof value === "string" && value) map.set(id, value);
  });
  return map;
}

export function isOnlineFromTimestamps(
  lastSeenIso: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!lastSeenIso) return false;
  const ts = new Date(lastSeenIso).getTime();
  if (!Number.isFinite(ts)) return false;
  return now - ts < ONLINE_THRESHOLD_MS;
}
