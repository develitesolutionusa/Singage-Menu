"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SESSION_KEY = "signage_player_session";

/**
 * Entry point: allocate/reuse a player id, then go to /player/[playerId]
 * where pairing UI or playback runs (Phase 2).
 */
export default function PlayerEntryPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = sessionStorage.getItem(SESSION_KEY);
        if (existing) {
          const parsed = JSON.parse(existing) as { playerId?: string };
          if (parsed.playerId) {
            router.replace(`/player/${parsed.playerId}`);
            return;
          }
        }

        const res = await fetch("/api/players/pair/init", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to init player");

        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            playerId: json.playerId,
            pairingCode: json.pairingCode,
          }),
        );
        if (!cancelled) {
          router.replace(`/player/${json.playerId}`);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Player init failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-white">
      {error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <p className="text-zinc-400">Starting player…</p>
      )}
    </div>
  );
}
