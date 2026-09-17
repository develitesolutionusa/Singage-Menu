import type { createServiceClient } from "@/lib/supabase";

type Supabase = ReturnType<typeof createServiceClient>;

/** Keep players.campaign_id and campaign_players in sync. */
export async function assignPlayerCampaign(
  supabase: Supabase,
  orgId: string,
  playerId: string,
  campaignId: string | null,
) {
  // Clear previous join rows for this player
  await supabase
    .from("campaign_players")
    .delete()
    .eq("clerk_org_id", orgId)
    .eq("player_id", playerId);

  const { data: player, error } = await supabase
    .from("players")
    .update({
      campaign_id: campaignId,
      loop_id: null,
    })
    .eq("clerk_org_id", orgId)
    .eq("id", playerId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!player) throw new Error("Player not found");

  if (campaignId) {
    const { error: joinError } = await supabase.from("campaign_players").insert({
      clerk_org_id: orgId,
      campaign_id: campaignId,
      player_id: playerId,
    });
    if (joinError) throw new Error(joinError.message);
  }

  return player;
}
