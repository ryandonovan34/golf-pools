import { NextRequest, NextResponse } from "next/server";
import { fetchLeaderboard } from "@/lib/espn/api";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch leaderboard from ESPN
    const competitors = await fetchLeaderboard(eventId);

    // Look up tournament by ESPN event ID
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id")
      .eq("espn_event_id", eventId)
      .single();

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found for this event ID" },
        { status: 404 }
      );
    }

    // Upsert player scores
    const scoreRows = competitors.map((c) => ({
      tournament_id: tournament.id,
      espn_player_id: c.espnPlayerId,
      player_name: c.playerName,
      total_strokes: c.totalStrokes,
      to_par: c.toPar,
      rounds: c.rounds,
      made_cut: c.madeCut,
      position: c.position,
      last_updated: new Date().toISOString(),
    }));

    for (const row of scoreRows) {
      await supabaseAdmin
        .from("player_scores")
        .upsert(row, { onConflict: "tournament_id,espn_player_id" });
    }

    // Calculate cut score (field average for R3 and R4 among players who made the cut)
    const madeTheCut = competitors.filter((c) => c.madeCut);
    
    const r3Scores = madeTheCut
      .map((c) => c.rounds[2])
      .filter((r): r is number => r !== null && r > 0);
    
    const r4Scores = madeTheCut
      .map((c) => c.rounds[3])
      .filter((r): r is number => r !== null && r > 0);

    if (r3Scores.length > 0 || r4Scores.length > 0) {
      const satFieldAvg =
        r3Scores.length > 0
          ? r3Scores.reduce((a, b) => a + b, 0) / r3Scores.length
          : null;
      const sunFieldAvg =
        r4Scores.length > 0
          ? r4Scores.reduce((a, b) => a + b, 0) / r4Scores.length
          : null;

      await supabaseAdmin
        .from("cut_score")
        .upsert(
          {
            tournament_id: tournament.id,
            sat_field_avg: satFieldAvg ? parseFloat(satFieldAvg.toFixed(2)) : null,
            sun_field_avg: sunFieldAvg ? parseFloat(sunFieldAvg.toFixed(2)) : null,
          },
          { onConflict: "tournament_id" }
        );
    }

    // Update tournament status based on competitor data
    const hasActiveScores = competitors.some(
      (c) => c.totalStrokes > 0
    );
    const allRoundsComplete = competitors.some(
      (c) => c.rounds[3] !== null && c.rounds[3] > 0
    );

    let newStatus = "upcoming";
    if (allRoundsComplete) {
      newStatus = "complete";
    } else if (hasActiveScores) {
      newStatus = "in_progress";
    }

    await supabaseAdmin
      .from("tournaments")
      .update({ status: newStatus })
      .eq("id", tournament.id);

    return NextResponse.json({
      success: true,
      playersUpdated: scoreRows.length,
      competitors,
    });
  } catch (error) {
    console.error("ESPN leaderboard fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ESPN leaderboard" },
      { status: 500 }
    );
  }
}
