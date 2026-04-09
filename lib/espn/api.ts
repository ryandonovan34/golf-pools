import type { ESPNPlayer } from "@/lib/types";

const ESPN_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard";

export interface ESPNCompetitor {
  espnPlayerId: string;
  playerName: string;
  position: string;
  totalStrokes: number;
  toPar: number;
  rounds: (number | null)[];
  madeCut: boolean;
  status: string;
}

interface ESPNLineScore {
  value?: number;
  period?: number;
}

interface ESPNAthleteStatus {
  type?: { name?: string; state?: string };
  position?: { displayName?: string };
}

interface ESPNStatistic {
  name: string;
  value?: number;
  displayValue?: string;
}

interface ESPNScore {
  value?: number;
  displayValue?: string;
}

interface ESPNCompetitorRaw {
  id?: string;
  athlete?: { id?: string; displayName?: string };
  status?: ESPNAthleteStatus;
  score?: ESPNScore | string | number;
  linescores?: ESPNLineScore[];
  sortOrder?: number;
  statistics?: ESPNStatistic[];
}

/**
 * Fetch the full leaderboard for a given ESPN event.
 */
export async function fetchLeaderboard(
  eventId: string
): Promise<ESPNCompetitor[]> {
  const url = `${ESPN_BASE}?league=pga&event=${eventId}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const competitors: ESPNCompetitorRaw[] =
    data?.events?.[0]?.competitions?.[0]?.competitors ?? [];

  return competitors.map(parseCompetitor);
}

/**
 * Fetch the roster (list of players) entered in an ESPN event.
 */
export async function fetchRoster(eventId: string): Promise<ESPNPlayer[]> {
  const url = `${ESPN_BASE}?league=pga&event=${eventId}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const competitors: ESPNCompetitorRaw[] =
    data?.events?.[0]?.competitions?.[0]?.competitors ?? [];

  return competitors
    .map((c) => ({
      espnPlayerId: c.athlete?.id ?? c.id ?? "",
      playerName: c.athlete?.displayName ?? "Unknown",
    }))
    .filter((p) => p.espnPlayerId !== "")
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

function parseCompetitor(raw: ESPNCompetitorRaw): ESPNCompetitor {
  const playerId = raw.athlete?.id ?? raw.id ?? "";
  const playerName = raw.athlete?.displayName ?? "Unknown";
  const statusName = raw.status?.type?.name ?? "";
  const madeCut = statusName !== "cut";

  // Parse round scores from linescores
  const rounds: (number | null)[] = (raw.linescores ?? []).map((ls) => {
    if (ls.value && ls.value > 0) return ls.value;
    return null;
  });

  // Total strokes from score object or sum of rounds
  let totalStrokes = 0;
  if (raw.score && typeof raw.score === "object" && "value" in raw.score && typeof raw.score.value === "number") {
    totalStrokes = raw.score.value;
  } else {
    totalStrokes = rounds.reduce<number>((sum, r) => sum + (r ?? 0), 0);
  }

  // Parse to-par from statistics (most accurate source)
  let toPar = 0;
  const scoreToParStat = (raw.statistics ?? []).find((s) => s.name === "scoreToPar");
  if (scoreToParStat && typeof scoreToParStat.value === "number") {
    toPar = scoreToParStat.value;
  } else if (raw.score && typeof raw.score === "object" && "displayValue" in raw.score) {
    // Fallback: parse from score.displayValue
    const dv = raw.score.displayValue ?? "";
    if (dv === "E") {
      toPar = 0;
    } else {
      const parsed = parseInt(dv, 10);
      if (!isNaN(parsed)) toPar = parsed;
    }
  } else if (typeof raw.score === "string") {
    if (raw.score === "E") {
      toPar = 0;
    } else {
      const parsed = parseInt(raw.score, 10);
      if (!isNaN(parsed)) toPar = parsed;
    }
  }

  // Position from status.position.displayName (e.g. "T9", "1")
  let position = "";
  if (raw.status?.position?.displayName) {
    position = raw.status.position.displayName;
  } else if (raw.sortOrder) {
    position = String(raw.sortOrder);
  }
  if (!madeCut) {
    position = "MC";
  }

  return {
    espnPlayerId: playerId,
    playerName,
    position,
    totalStrokes,
    toPar,
    rounds,
    madeCut,
    status: statusName,
  };
}
