import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { calculateLeaderboard } from "@/lib/scoring/pool-score";
import type { TierWithPlayers, Pick as PickType, PlayerScore, CutScore } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;

    // Get pool with tournament info
    const { data: pool, error: poolError } = await supabaseAdmin
      .from("pools")
      .select("id, tournament_id, tournaments(id, espn_event_id)")
      .eq("id", poolId)
      .single();

    if (poolError || !pool) {
      return NextResponse.json(
        { error: "Pool not found" },
        { status: 404 }
      );
    }

    const tournamentId = pool.tournament_id;

    // Get tiers with players
    const { data: tiers } = await supabaseAdmin
      .from("tiers")
      .select("*, tier_players(*)")
      .eq("pool_id", poolId)
      .order("tier_number");

    const tiersWithPlayers: TierWithPlayers[] = (tiers ?? []).map((t) => ({
      id: t.id,
      pool_id: t.pool_id,
      tier_number: t.tier_number,
      label: t.label,
      players: t.tier_players ?? [],
    }));

    // Get all pool members with their picks
    const { data: members } = await supabaseAdmin
      .from("pool_members")
      .select("id, display_name, picks(*)")
      .eq("pool_id", poolId);

    const membersWithPicks = (members ?? []).map((m) => ({
      memberId: m.id,
      displayName: m.display_name,
      picks: (m.picks ?? []) as PickType[],
    }));

    // Get player scores for this tournament
    const { data: scores } = await supabaseAdmin
      .from("player_scores")
      .select("*")
      .eq("tournament_id", tournamentId);

    // Get cut score
    const { data: cutScore } = await supabaseAdmin
      .from("cut_score")
      .select("*")
      .eq("tournament_id", tournamentId)
      .single();

    // Calculate leaderboard
    const leaderboard = calculateLeaderboard(
      membersWithPicks,
      tiersWithPlayers,
      (scores ?? []) as PlayerScore[],
      (cutScore as CutScore) ?? null
    );

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to calculate leaderboard" },
      { status: 500 }
    );
  }
}
