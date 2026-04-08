import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

function generateCode(length: number): string {
  return randomBytes(length)
    .toString("base64url")
    .slice(0, length)
    .toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorName, tournamentId, poolName, tiers } = body;

    // Validate
    if (!creatorName || !tournamentId || !poolName || !tiers?.length) {
      return NextResponse.json(
        { error: "Missing required fields: creatorName, tournamentId, poolName, tiers" },
        { status: 400 }
      );
    }

    // Validate tiers have at least 2 players each
    for (const tier of tiers) {
      if (!tier.players || tier.players.length < 2) {
        return NextResponse.json(
          { error: `Tier "${tier.label || tier.tierNumber}" must have at least 2 players` },
          { status: 400 }
        );
      }
    }

    // Generate codes
    const inviteCode = generateCode(6);
    const adminCode = generateCode(10);

    // Create pool
    const { data: pool, error: poolError } = await supabaseAdmin
      .from("pools")
      .insert({
        tournament_id: tournamentId,
        creator_name: creatorName,
        admin_code: adminCode,
        name: poolName,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (poolError || !pool) {
      console.error("Pool creation error:", poolError);
      return NextResponse.json(
        { error: "Failed to create pool" },
        { status: 500 }
      );
    }

    // Create tiers and tier_players
    for (const tierData of tiers) {
      const { data: tier, error: tierError } = await supabaseAdmin
        .from("tiers")
        .insert({
          pool_id: pool.id,
          tier_number: tierData.tierNumber,
          label: tierData.label || `Tier ${tierData.tierNumber}`,
        })
        .select()
        .single();

      if (tierError || !tier) {
        console.error("Tier creation error:", tierError);
        continue;
      }

      // Insert tier players
      const tierPlayerRows = tierData.players.map(
        (p: { espnPlayerId: string; playerName: string }) => ({
          tier_id: tier.id,
          espn_player_id: p.espnPlayerId,
          player_name: p.playerName,
        })
      );

      await supabaseAdmin.from("tier_players").insert(tierPlayerRows);
    }

    // Also add the creator as a pool member
    const participantToken = crypto.randomUUID();
    await supabaseAdmin.from("pool_members").insert({
      pool_id: pool.id,
      display_name: creatorName,
      participant_token: participantToken,
    });

    return NextResponse.json({
      poolId: pool.id,
      inviteCode,
      adminCode,
      participantToken,
    });
  } catch (error) {
    console.error("Create pool error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
