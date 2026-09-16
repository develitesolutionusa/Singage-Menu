import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { generatePairingCode } from "@/lib/utils";

/**
 * Public endpoint: device requests a pairing code.
 * Creates an unpaired player row (clerk_org_id null) with a unique 6-digit code.
 */
export async function POST() {
  const supabase = createServiceClient();

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generatePairingCode();
    const { data, error } = await supabase
      .from("players")
      .insert({
        clerk_org_id: null,
        pairing_code: code,
        status: "unpaired",
        name: "New Player",
      })
      .select("id, pairing_code")
      .single();

    if (!error && data) {
      return NextResponse.json({
        playerId: data.id,
        pairingCode: data.pairing_code,
      });
    }

    // Unique violation — retry with a new code
    if (error?.code !== "23505") {
      return NextResponse.json({ error: error?.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Could not allocate a pairing code" },
    { status: 500 },
  );
}
