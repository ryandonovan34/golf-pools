import type { Pick, PlayerScore, CutScore, LeaderboardEntry, TierWithPlayers } from "@/lib/types";

interface MemberWithPicks {
  memberId: string;
  displayName: string;
  picks: Pick[];
}

/**
 * Calculate the pool leaderboard.
 *
 * For each member, sum up the total strokes of their picked players.
 * If a player missed the cut, substitute their R3/R4 scores with field averages.
 */
export function calculateLeaderboard(
  members: MemberWithPicks[],
  tiers: TierWithPlayers[],
  scores: PlayerScore[],
  cutScore: CutScore | null
): LeaderboardEntry[] {
  const scoreMap = new Map<string, PlayerScore>();
  for (const s of scores) {
    scoreMap.set(s.espn_player_id, s);
  }

  const tierMap = new Map<string, TierWithPlayers>();
  for (const t of tiers) {
    tierMap.set(t.id, t);
  }

  const entries: LeaderboardEntry[] = members.map((member) => {
    const pickDetails = member.picks.map((pick) => {
      const tier = tierMap.get(pick.tier_id);
      const score = scoreMap.get(pick.espn_player_id) ?? null;

      let strokes = 0;
      if (score) {
        if (score.made_cut) {
          // Use actual total strokes
          strokes = score.total_strokes ?? 0;
        } else {
          // Missed cut: R1+R2 actual, R3+R4 = field averages
          const rounds = (score.rounds as number[] | null) ?? [];
          const r1 = rounds[0] ?? 0;
          const r2 = rounds[1] ?? 0;
          const r3Penalty = cutScore?.sat_field_avg ?? 0;
          const r4Penalty = cutScore?.sun_field_avg ?? 0;
          strokes = r1 + r2 + Number(r3Penalty) + Number(r4Penalty);
        }
      }

      return {
        tierNumber: tier?.tier_number ?? 0,
        tierLabel: tier?.label ?? null,
        playerName: pick.player_name,
        espnPlayerId: pick.espn_player_id,
        score,
        strokes,
        toPar: score?.to_par ?? null,
        isWinner: score?.position === "1" || score?.position === "T1",
        isDropped: false,
      };
    });

    // Drop worst score: find the pick with the highest (worst) toPar/strokes
    if (pickDetails.length > 1) {
      const hasToPar = pickDetails.some((p) => p.toPar !== null);
      let worstIdx = 0;
      let worstScore = hasToPar
        ? (pickDetails[0].toPar ?? pickDetails[0].strokes)
        : pickDetails[0].strokes;
      for (let i = 1; i < pickDetails.length; i++) {
        const score = hasToPar
          ? (pickDetails[i].toPar ?? pickDetails[i].strokes)
          : pickDetails[i].strokes;
        if (score > worstScore) {
          worstScore = score;
          worstIdx = i;
        }
      }
      pickDetails[worstIdx].isDropped = true;
    }

    const activePicks = pickDetails.filter((p) => !p.isDropped);

    // 3-stroke bonus for each picked player who wins the tournament (only active picks)
    const winnerBonus = activePicks.filter((p) => p.isWinner).length * -3;
    const totalStrokes = activePicks.reduce((sum, p) => sum + p.strokes, 0) + winnerBonus;
    const hasToPar = activePicks.some((p) => p.toPar !== null);
    const totalToPar = hasToPar
      ? activePicks.reduce((sum, p) => sum + (p.toPar ?? 0), 0) + winnerBonus
      : null;

    return {
      rank: 0,
      memberId: member.memberId,
      displayName: member.displayName,
      picks: pickDetails.sort((a, b) => a.tierNumber - b.tierNumber),
      totalStrokes,
      totalToPar,
      winnerBonus,
    };
  });

  // Sort by totalToPar ascending (lower/more negative is better)
  // Fall back to totalStrokes if toPar is not available
  entries.sort((a, b) => {
    const aScore = a.totalToPar ?? a.totalStrokes;
    const bScore = b.totalToPar ?? b.totalStrokes;
    return aScore - bScore;
  });

  // Assign ranks (handle ties)
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) {
      const prev = entries[i - 1];
      const curr = entries[i];
      const prevScore = prev.totalToPar ?? prev.totalStrokes;
      const currScore = curr.totalToPar ?? curr.totalStrokes;
      if (currScore > prevScore) {
        currentRank = i + 1;
      }
    }
    entries[i].rank = currentRank;
  }

  return entries;
}
