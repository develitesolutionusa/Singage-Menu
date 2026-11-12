import { MenuBoardPlayer } from "@/components/menu-board/menu-board-player";
import { PlayerRuntime } from "@/components/player/player-runtime";

type Props = {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ group?: string; index?: string }>;
};

/**
 * Player route.
 * - Default: loop playback runtime (pairing, heartbeat, realtime).
 * - With ?group=&index=: zone-template screen-group slice for video walls.
 *   Example: /player/screen-left?group=portrait-wall-3&index=0
 */
export default async function PlayerByIdPage({ params, searchParams }: Props) {
  const { playerId } = await params;
  const query = await searchParams;
  const groupId = query.group?.trim();

  if (groupId) {
    const raw = Number(query.index ?? 0);
    const index = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    return (
      <MenuBoardPlayer
        screenId={playerId}
        groupId={groupId}
        index={index}
      />
    );
  }

  return <PlayerRuntime playerId={playerId} />;
}
