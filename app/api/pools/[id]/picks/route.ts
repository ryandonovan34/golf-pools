import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const body = await request.json();
    const { participantToken, picks } = body;

    if (!participantToken || !picks?.length) {
      return NextResponse.json(
        { error: "Missing required fields: participantToken, picks" },
        { status: 400 }
      );
    }

    // Verify the participant token belongs to this pool
    const { data: member, error: memberError } = await supabaseAdmin
      .from("pool_members")
      .select("id")
      .eq("pool_id", poolId)
      .eq("participant_token", participantToken)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Invalid participant token for this pool" },
        { status: 403 }
      );
    }

    // Check if pool is locked (manually or by tournament start)
    const { data: pool } = await supabaseAdmin
      .from("pools")
      .select("is_locked, tournaments(start_date)")
      .eq("id", poolId)
      .single();

    const tournamentData = pool?.tournaments as unknown as { start_date: string } | null;
    const tournamentStarted = tournamentData?.start_date
      ? new Date(tournamentData.start_date).getTime() <= Date.now()
      : false;

    if (pool?.is_locked || tournamentStarted) {
      return NextResponse.json(
        { error: "This pool is locked. Picks can no longer be submitted." },
        { status: 403 }
      );
    }

    // Delete any existing picks for this member (allows editing)
    const { error: deleteError } = await supabaseAdmin
      .from("picks")
      .delete()
      .eq("pool_member_id", member.id);

    if (deleteError) {
      console.error("Pick delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to update picks" },
        { status: 500 }
      );
    }

    // Insert picks
    const pickRows = picks.map(
      (p: { tierId: string; espnPlayerId: string; playerName: string }) => ({
        pool_member_id: member.id,
        tier_id: p.tierId,
        espn_player_id: p.espnPlayerId,
        player_name: p.playerName,
      })
    );

    const { error: pickError } = await supabaseAdmin
      .from("picks")
      .insert(pickRows);

    if (pickError) {
      console.error("Pick insertion error:", JSON.stringify(pickError));
      return NextResponse.json(
        { error: "Failed to save picks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit picks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
