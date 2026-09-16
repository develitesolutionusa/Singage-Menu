import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

const idSchema = z.string().uuid();

/**
 * Public playback payload for a player device.
 * Unpaired → pairing code. Paired → loop + ordered items + media URLs.
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
      },
      loop: null,
      items: [],
      updatedAt: player.updated_at,
    });
  }

  if (!player.loop_id) {
    return NextResponse.json({
      state: "paired_no_loop" as const,
      player: {
        id: player.id,
        pairingCode: null,
        rotation: player.rotation,
        name: player.name,
        loopId: null,
      },
      loop: null,
      items: [],
      updatedAt: player.updated_at,
    });
  }

  const { data: loop, error: loopError } = await supabase
    .from("loops")
    .select("*")
    .eq("id", player.loop_id)
    .maybeSingle();

  if (loopError) {
    return NextResponse.json({ error: loopError.message }, { status: 500 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("loop_items")
    .select("*")
    .eq("loop_id", player.loop_id)
    .order("position", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const libraryIds = Array.from(
    new Set((items ?? []).map((item) => item.library_item_id)),
  );

  const { data: libraryItems, error: libraryError } = libraryIds.length
    ? await supabase.from("library_items").select("*").in("id", libraryIds)
    : { data: [], error: null };

  if (libraryError) {
    return NextResponse.json({ error: libraryError.message }, { status: 500 });
  }

  const libraryById = new Map((libraryItems ?? []).map((row) => [row.id, row]));

  const playbackItems = (items ?? []).map((item) => {
    const media = libraryById.get(item.library_item_id);
    return {
      id: item.id,
      position: item.position,
      durationSeconds: Number(item.duration_seconds),
      libraryItemId: item.library_item_id,
      name: media?.name ?? "Media",
      fileType: media?.file_type ?? "image",
      mimeType: media?.mime_type ?? "application/octet-stream",
      url: media?.public_url ?? null,
    };
  });

  return NextResponse.json({
    state: "playing" as const,
    player: {
      id: player.id,
      pairingCode: null,
      rotation: player.rotation,
      name: player.name,
      loopId: player.loop_id,
    },
    loop: loop
      ? {
          id: loop.id,
          name: loop.name,
          orientation: loop.orientation,
          updatedAt: loop.updated_at,
        }
      : null,
    items: playbackItems,
    updatedAt: player.updated_at,
  });
}
