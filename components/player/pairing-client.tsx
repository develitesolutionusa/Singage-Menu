"use client";

import { useEffect, useState } from "react";

/**
 * Phase 1 pairing screen only (fullscreen playback comes in Phase 2).
 * Requests a pairing code and displays it until claimed.
 */
export function PlayerPairingClient() {
  const [code, setCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = sessionStorage.getItem("signage_player_session");
        if (existing) {
          const parsed = JSON.parse(existing) as {
            playerId: string;
            pairingCode: string;
          };
          if (!cancelled) {
            setPlayerId(parsed.playerId);
            setCode(parsed.pairingCode);
          }
          return;
        }

        const res = await fetch("/api/players/pair/init", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to get code");
        sessionStorage.setItem(
          "signage_player_session",
          JSON.stringify({
            playerId: json.playerId,
            pairingCode: json.pairingCode,
          }),
        );
        if (!cancelled) {
          setPlayerId(json.playerId);
          setCode(json.pairingCode);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Pairing init failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-white">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
        Signage Menu · Pair device
      </p>
      {error ? (
        <p className="mt-8 text-center text-red-400">{error}</p>
      ) : (
        <>
          <p className="mt-10 font-mono text-7xl font-semibold tracking-[0.35em] sm:text-8xl">
            {code ?? "······"}
          </p>
          <p className="mt-8 max-w-md text-center text-zinc-400">
            In the dashboard, open Players → Add New Player and enter this code.
          </p>
          {playerId ? (
            <p className="mt-4 font-mono text-xs text-zinc-600">{playerId}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
