"use client";

import { useState, useEffect, useCallback } from "react";
import type { LeaderboardEntry } from "@/lib/types";
import { LeaderboardSkeleton } from "@/components/ui/LoadingSkeleton";

interface PoolLeaderboardProps {
  poolId: string;
  espnEventId?: string;
  refreshInterval?: number; // ms, default 60s
  currentMemberId?: string;
  tournamentStatus?: string;
}

export function PoolLeaderboard({
  poolId,
  espnEventId,
  refreshInterval = 60000,
  currentMemberId,
  tournamentStatus,
}: PoolLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshScores = useCallback(async () => {
    // Trigger ESPN score refresh in the background (fire-and-forget)
    if (espnEventId) {
      fetch(`/api/espn/leaderboard?eventId=${espnEventId}`).catch(() => {});
    }
  }, [espnEventId]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/pools/${poolId}/leaderboard`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const data: LeaderboardEntry[] = await res.json();
      setEntries(data);
      setError("");
    } catch {
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [poolId]);

  useEffect(() => {
    const isComplete = tournamentStatus === "complete";

    // On mount: refresh ESPN scores, then fetch pool leaderboard
    if (!isComplete) {
      refreshScores();
    }
    // Small delay so ESPN scores have time to write before we read
    const initialTimeout = setTimeout(fetchLeaderboard, isComplete ? 0 : 2000);

    // Poll: refresh ESPN scores then fetch leaderboard every interval
    // Skip polling if tournament is already complete
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!isComplete) {
      interval = setInterval(async () => {
        await refreshScores();
        // Brief delay for scores to persist before reading
        setTimeout(fetchLeaderboard, 2000);
      }, refreshInterval);
    }

    return () => {
      clearTimeout(initialTimeout);
      if (interval) clearInterval(interval);
    };
  }, [fetchLeaderboard, refreshScores, refreshInterval, tournamentStatus]);

  if (loading) return <LeaderboardSkeleton />;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No picks submitted yet. The leaderboard will appear once members submit their picks.</p>
      </div>
    );
  }

  // Gather all tier labels from the first entry
  const tierHeaders = entries[0]?.picks.map((p) => p.tierLabel || `Tier ${p.tierNumber}`) ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-masters-green text-white">
            <th className="px-3 py-2 text-left rounded-tl-lg">Rank</th>
            <th className="px-3 py-2 text-left">Member</th>
            {tierHeaders.map((label, i) => (
              <th key={i} className="px-3 py-2 text-left">
                {label}
              </th>
            ))}
            <th className="px-3 py-2 text-right rounded-tr-lg">Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const isPoolWinner = tournamentStatus === "complete" && entry.rank === 1;
            return (
            <tr
              key={entry.memberId}
              className={`leaderboard-row border-b border-gray-100 ${
                isPoolWinner
                  ? "bg-masters-gold/20 ring-2 ring-masters-gold ring-inset"
                  : entry.memberId === currentMemberId
                  ? "bg-masters-gold/10"
                  : idx % 2 === 0
                  ? "bg-white"
                  : "bg-gray-50"
              }`}
            >
              <td className="px-3 py-3 font-bold text-masters-green">
                {isPoolWinner ? "🏆" : entry.rank}
              </td>
              <td className="px-3 py-3 font-semibold">
                {entry.displayName}
                {isPoolWinner && (
                  <span className="ml-1 text-xs font-bold text-masters-gold">Winner!</span>
                )}
                {!isPoolWinner && entry.memberId === currentMemberId && (
                  <span className="ml-1 text-xs text-masters-gold">(you)</span>
                )}
              </td>
              {entry.picks.map((pick, i) => (
                <td key={i} className="px-3 py-3">
                  <div className="font-medium">
                    {pick.playerName}
                    {pick.isWinner && (
                      <span className="ml-1 text-masters-gold">🏆</span>
                    )}
                  </div>
                  {pick.score && (
                    <div className="text-xs text-gray-500">
                      {pick.score.position && (
                        <span className="mr-1">{pick.score.position}</span>
                      )}
                      <span className={pick.score.to_par !== null && pick.score.to_par < 0 ? "text-red-600 font-semibold" : pick.score.to_par !== null && pick.score.to_par > 0 ? "text-gray-600" : "font-semibold"}>
                        ({pick.score.to_par === 0
                          ? "E"
                          : pick.score.to_par !== null && pick.score.to_par > 0
                          ? `+${pick.score.to_par}`
                          : pick.score.to_par})
                      </span>
                      {!pick.score.made_cut && (
                        <span className="ml-1 text-red-500 font-semibold">
                          MC
                        </span>
                      )}
                    </div>
                  )}
                </td>
              ))}
              <td className="px-3 py-3 text-right font-bold text-lg">
                <div className={entry.totalToPar !== null && entry.totalToPar < 0 ? "text-red-600" : "text-masters-green-dark"}>
                  {entry.totalToPar !== null
                    ? entry.totalToPar === 0
                      ? "E"
                      : entry.totalToPar > 0
                      ? `+${entry.totalToPar}`
                      : entry.totalToPar
                    : "—"}
                </div>
                {entry.winnerBonus < 0 && (
                  <div className="text-xs font-normal text-masters-gold">
                    ({entry.winnerBonus} bonus)
                  </div>
                )}
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
