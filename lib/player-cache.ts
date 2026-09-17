export type PlaybackItem = {
  id: string;
  position: number;
  durationSeconds: number;
  libraryItemId: string;
  name: string;
  fileType: "image" | "video" | string;
  mimeType: string;
  url: string | null;
};

export type PlaybackPayload = {
  state: "unpaired" | "paired_no_loop" | "paired_no_campaign" | "playing";
  player: {
    id: string;
    pairingCode: string | null;
    rotation: 0 | 90 | 180 | 270;
    name: string;
    loopId?: string | null;
    campaignId?: string | null;
  };
  campaign?: {
    id: string;
    name: string;
    updatedAt: string;
  } | null;
  exception?: {
    id: string;
    name: string;
    overrideLoopId: string;
  } | null;
  loop: {
    id: string;
    name: string;
    orientation: string;
    updatedAt: string;
  } | null;
  items: PlaybackItem[];
  updatedAt: string;
  resolution?: "exception" | "campaign";
  localDate?: string;
};

const DB_NAME = "signage-player-cache";
const DB_VERSION = 1;
const STORE = "playback";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cachePlayback(
  playerId: string,
  payload: PlaybackPayload,
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(
        { ...payload, cachedAt: new Date().toISOString() },
        playerId,
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Cache is best-effort
  }
}

export async function readCachedPlayback(
  playerId: string,
): Promise<PlaybackPayload | null> {
  try {
    const db = await openDb();
    const result = await new Promise<PlaybackPayload | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(playerId);
      req.onsuccess = () => resolve((req.result as PlaybackPayload) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function registerPlayerServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    // Ignore SW registration failures (http private network, etc.)
  }
}

/** Ask the SW to precache media URLs for offline playback. */
export async function precacheMediaUrls(urls: string[]): Promise<void> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  if (!unique.length || !("serviceWorker" in navigator)) return;

  const ready = await navigator.serviceWorker.ready;
  ready.active?.postMessage({ type: "PRECACHE_URLS", urls: unique });
}
