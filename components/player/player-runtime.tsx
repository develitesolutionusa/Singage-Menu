"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import {
  cachePlayback,
  precacheMediaUrls,
  readCachedPlayback,
  registerPlayerServiceWorker,
  type PlaybackItem,
  type PlaybackPayload,
} from "@/lib/player-cache";

const HEARTBEAT_MS = 30_000;
const POLL_MS = 15_000;
const POLL_FAST_MS = 5_000;

function rotationStyle(rotation: 0 | 90 | 180 | 270): React.CSSProperties {
  const landscape = rotation === 0 || rotation === 180;
  if (landscape) {
    return {
      width: "100vw",
      height: "100vh",
      transform: `rotate(${rotation}deg)`,
      transformOrigin: "center center",
    };
  }
  // 90 / 270: swap viewport axes so content fills the physical screen
  return {
    width: "100vh",
    height: "100vw",
    transform: `rotate(${rotation}deg)`,
    transformOrigin: "center center",
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: "-50vw",
    marginLeft: "-50vh",
  };
}

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function PlayerRuntime({ playerId }: { playerId: string }) {
  const [payload, setPayload] = useState<PlaybackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [realtimeOk, setRealtimeOk] = useState(true);
  const [offline, setOffline] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);
  const payloadRef = useRef<PlaybackPayload | null>(null);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  const applyPayload = useCallback(
    (next: PlaybackPayload, fromCache = false) => {
      setPayload((prev) => {
        const sameLoop =
          prev?.loop?.id === next.loop?.id &&
          prev?.updatedAt === next.updatedAt &&
          prev?.items.length === next.items.length &&
          prev?.items.every(
            (item, i) =>
              item.id === next.items[i]?.id &&
              item.durationSeconds === next.items[i]?.durationSeconds &&
              item.url === next.items[i]?.url,
          ) &&
          prev?.player.rotation === next.player.rotation &&
          prev?.state === next.state;

        if (sameLoop) return prev;
        return next;
      });
      setOffline(fromCache);
      setError(null);

      if (next.state === "playing" && next.items.length) {
        void cachePlayback(playerId, next);
        void precacheMediaUrls(
          next.items.map((i) => i.url).filter((u): u is string => Boolean(u)),
        );
      }
    },
    [playerId],
  );

  const fetchPlayback = useCallback(async () => {
    try {
      const res = await fetch(`/api/players/${playerId}/playback`, {
        cache: "no-store",
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          res.status === 401 || res.status === 404
            ? "Playback API blocked or missing — check auth middleware"
            : `Unexpected response (${res.status})`,
        );
      }
      const json = (await res.json()) as PlaybackPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load playback");
      applyPayload(json, false);
      setError(null);
      setOffline(false);
      return true;
    } catch (e) {
      const cached = await readCachedPlayback(playerId);
      if (cached && cached.state === "playing" && cached.items.length) {
        applyPayload(cached, true);
        setError(null);
        return false;
      }
      setError(e instanceof Error ? e.message : "Playback load failed");
      return false;
    }
  }, [applyPayload, playerId]);

  // Boot: SW + initial fetch
  useEffect(() => {
    void registerPlayerServiceWorker();
    void fetchPlayback();
  }, [fetchPlayback]);

  // Heartbeat every 30s when paired
  useEffect(() => {
    if (!payload || payload.state === "unpaired") return;

    const beat = () => {
      void fetch(`/api/players/${playerId}/heartbeat`, { method: "POST" });
    };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [playerId, payload?.state]);

  // Realtime + polling fallback
  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = (fast: boolean) => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => {
        void fetchPlayback();
      }, fast ? POLL_FAST_MS : POLL_MS);
    };

    const client = createAnonClient();
    if (!client) {
      setRealtimeOk(false);
      startPolling(true);
      return () => {
        if (pollTimer) clearInterval(pollTimer);
      };
    }

    channel = client
      .channel(`player-${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `id=eq.${playerId}`,
        },
        () => {
          void fetchPlayback();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loop_items" },
        () => {
          void fetchPlayback();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loops" },
        () => {
          void fetchPlayback();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "library_items" },
        () => {
          void fetchPlayback();
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          setRealtimeOk(true);
          startPolling(false);
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeOk(false);
          startPolling(true);
        }
      });

    // Always keep a slow poll as safety net
    startPolling(false);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (channel) void client.removeChannel(channel);
    };
  }, [fetchPlayback, playerId]);

  // Advance playlist on a timer
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!payload || payload.state !== "playing" || payload.items.length === 0) {
      return;
    }

    if (index >= payload.items.length) {
      setIndex(0);
      return;
    }

    const item = payload.items[index];
    const ms = Math.max(1, Number(item.durationSeconds) || 10) * 1000;
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % payload.items.length);
    }, ms);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [payload, index]);

  // Reset index when playlist identity changes
  useEffect(() => {
    setIndex(0);
  }, [payload?.loop?.id, payload?.items.map((i) => i.id).join(",")]);

  if (error && !payload) {
    return (
      <Shell>
        <p className="text-red-400">{error}</p>
      </Shell>
    );
  }

  if (!payload) {
    return (
      <Shell>
        <p className="text-zinc-400">Loading player…</p>
      </Shell>
    );
  }

  if (payload.state === "unpaired") {
    return (
      <Shell>
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
          Signage Menu · Pair device
        </p>
        <p className="mt-10 font-mono text-7xl font-semibold tracking-[0.35em] sm:text-8xl">
          {payload.player.pairingCode ?? "······"}
        </p>
        <p className="mt-8 max-w-md text-center text-zinc-400">
          In the dashboard, open Players → Add New Player and enter this code.
        </p>
        <StatusBits offline={offline} realtimeOk={realtimeOk} />
      </Shell>
    );
  }

  if (payload.state === "paired_no_loop" || payload.items.length === 0) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white"
        style={rotationStyle(payload.player.rotation)}
      >
        <div className="text-center">
          <p className="text-lg font-medium">{payload.player.name}</p>
          <p className="mt-2 text-zinc-400">
            Paired — assign a loop in the dashboard to start playback.
          </p>
          <StatusBits offline={offline} realtimeOk={realtimeOk} />
        </div>
      </div>
    );
  }

  const current = payload.items[index] ?? payload.items[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        className="flex items-center justify-center bg-black"
        style={rotationStyle(payload.player.rotation)}
      >
        <MediaSlide key={`${current.id}-${index}`} item={current} />
      </div>
      <StatusBits offline={offline} realtimeOk={realtimeOk} compact />
    </div>
  );
}

function MediaSlide({ item }: { item: PlaybackItem }) {
  if (!item.url) {
    return (
      <div className="flex h-full w-full items-center justify-center text-zinc-500">
        Missing media URL
      </div>
    );
  }

  if (item.fileType === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={item.url}
        className="h-full w-full object-contain"
        autoPlay
        muted
        playsInline
        loop={false}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt={item.name}
      className="h-full w-full object-contain"
      draggable={false}
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-white">
      {children}
    </div>
  );
}

function StatusBits({
  offline,
  realtimeOk,
  compact,
}: {
  offline: boolean;
  realtimeOk: boolean;
  compact?: boolean;
}) {
  return (
    <p
      className={
        compact
          ? "pointer-events-none absolute bottom-2 right-2 text-[10px] text-white/30"
          : "mt-6 text-xs text-zinc-600"
      }
    >
      {offline ? "Offline cache · " : ""}
      {realtimeOk ? "Live" : "Polling"}
    </p>
  );
}
