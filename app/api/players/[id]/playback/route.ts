import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import {
  findActiveException,
  getZonedDateInfo,
} from "@/lib/campaign-resolve";
import type { LibraryItem, Loop } from "@/types/db";

type Params = { params: Promise<{ id: string }> };

const idSchema = z.string().uuid();

type PlaybackItemOut = {
  id: string;
  position: number;
  durationSeconds: number;
  libraryItemId: string;
  name: string;
  fileType: string;
  mimeType: string;
  url: string | null;
  sourceLoopId: string;
};

async function buildItemsForLoops(
  supabase: ReturnType<typeof createServiceClient>,
  loopIds: string[],
): Promise<{ items: PlaybackItemOut[]; loops: Loop[] }> {
  if (!loopIds.length) return { items: [], loops: [] };

  const { data: loops } = await supabase
    .from("loops")
    .select("*")
    .in("id", loopIds);

  const loopsById = new Map((loops ?? []).map((l) => [l.id, l]));
  const orderedLoops = loopIds
    .map((id) => loopsById.get(id))
    .filter((l): l is Loop => Boolean(l));

  const { data: loopItems } = await supabase
    .from("loop_items")
    .select("*")
    .in("loop_id", loopIds)
    .order("position", { ascending: true });

  const libraryIds = Array.from(
    new Set((loopItems ?? []).map((i) => i.library_item_id)),
  );

  const { data: libraryItems } = libraryIds.length
    ? await supabase.from("library_items").select("*").in("id", libraryIds)
    : { data: [] as LibraryItem[] };

  const libraryById = new Map((libraryItems ?? []).map((row) => [row.id, row]));

  const itemsByLoop = new Map<string, typeof loopItems>();
  for (const item of loopItems ?? []) {
    const list = itemsByLoop.get(item.loop_id) ?? [];
    list.push(item);
    itemsByLoop.set(item.loop_id, list);
  }

  const items: PlaybackItemOut[] = [];
  let globalPos = 0;
  for (const loopId of loopIds) {
    const group = itemsByLoop.get(loopId) ?? [];
    for (const item of group) {
      const media = libraryById.get(item.library_item_id);
      items.push({
        id: item.id,
        position: globalPos++,
        durationSeconds: Number(item.duration_seconds),
        libraryItemId: item.library_item_id,
        name: media?.name ?? "Media",
        fileType: media?.file_type ?? "image",
        mimeType: media?.mime_type ?? "application/octet-stream",
        url: media?.public_url ?? null,
        sourceLoopId: loopId,
      });
    }
  }

  return { items, loops: orderedLoops };
}

/**
 * Public playback payload for a player device.
 * Resolution: active exception today → else campaign loops in order → player rotation.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: player, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", parsed.data)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (!player.clerk_org_id || player.status === "unpaired") {
    return NextResponse.json({
      state: "unpaired" as const,
      player: {
        id: player.id,
        pairingCode: player.pairing_code,
        rotation: player.rotation,
        name: player.name,
        campaignId: null,
      },
      campaign: null,
      exception: null,
      loop: null,
      items: [],
      updatedAt: player.updated_at,
    });
  }

  if (!player.campaign_id) {
    return NextResponse.json({
      state: "paired_no_campaign" as const,
      player: {
        id: player.id,
        pairingCode: null,
        rotation: player.rotation,
        name: player.name,
        campaignId: null,
      },
      campaign: null,
      exception: null,
      loop: null,
      items: [],
      updatedAt: player.updated_at,
    });
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", player.campaign_id)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({
      state: "paired_no_campaign" as const,
      player: {
        id: player.id,
        pairingCode: null,
        rotation: player.rotation,
        name: player.name,
        campaignId: player.campaign_id,
      },
      campaign: null,
      exception: null,
      loop: null,
      items: [],
      updatedAt: player.updated_at,
    });
  }

  const { data: exceptions } = await supabase
    .from("campaign_exceptions")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("enabled", true)
    .order("created_at", { ascending: false });

  const { dateStr, dayOfWeek } = getZonedDateInfo(player.timezone || "UTC");
  const activeException = findActiveException(
    (exceptions ?? []).map((ex) => ({
      id: ex.id,
      enabled: ex.enabled,
      start_date: ex.start_date,
      end_date: ex.end_date,
      days_of_week: ex.days_of_week,
      override_loop_id: ex.override_loop_id,
      name: ex.name,
    })),
    dateStr,
    dayOfWeek,
  );

  let loopIds: string[] = [];
  let resolution: "exception" | "campaign" = "campaign";

  if (activeException) {
    loopIds = [activeException.override_loop_id];
    resolution = "exception";
  } else {
    const { data: campaignLoops } = await supabase
      .from("campaign_loops")
      .select("loop_id, position")
      .eq("campaign_id", campaign.id)
      .order("position", { ascending: true });
    loopIds = (campaignLoops ?? []).map((row) => row.loop_id);
  }

  if (!loopIds.length) {
    return NextResponse.json({
      state: "paired_no_loop" as const,
      player: {
        id: player.id,
        pairingCode: null,
        rotation: player.rotation,
        name: player.name,
        campaignId: campaign.id,
      },
      campaign: {
        id: campaign.id,
        name: campaign.name,
        updatedAt: campaign.updated_at,
      },
      exception: null,
      loop: null,
      items: [],
      updatedAt: player.updated_at,
      resolution,
      localDate: dateStr,
    });
  }

  const { items, loops } = await buildItemsForLoops(supabase, loopIds);
  const primaryLoop = loops[0] ?? null;

  return NextResponse.json({
    state: items.length ? ("playing" as const) : ("paired_no_loop" as const),
    player: {
      id: player.id,
      pairingCode: null,
      rotation: player.rotation,
      name: player.name,
      campaignId: campaign.id,
    },
    campaign: {
      id: campaign.id,
      name: campaign.name,
      updatedAt: campaign.updated_at,
    },
    exception: activeException
      ? {
          id: activeException.id,
          name: activeException.name,
          overrideLoopId: activeException.override_loop_id,
        }
      : null,
    loop: primaryLoop
      ? {
          id: primaryLoop.id,
          name: primaryLoop.name,
          orientation: primaryLoop.orientation,
          updatedAt: primaryLoop.updated_at,
        }
      : null,
    loops: loops.map((l) => ({
      id: l.id,
      name: l.name,
      orientation: l.orientation,
      updatedAt: l.updated_at,
    })),
    items,
    updatedAt: player.updated_at,
    resolution,
    localDate: dateStr,
  });
}
