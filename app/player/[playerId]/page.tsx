import { PlayerRuntime } from "@/components/player/player-runtime";

type Props = { params: Promise<{ playerId: string }> };

export default async function PlayerByIdPage({ params }: Props) {
  const { playerId } = await params;
  return <PlayerRuntime playerId={playerId} />;
}
