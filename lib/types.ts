// Database row types matching the Supabase schema

export interface Tournament {
  id: string;
  espn_event_id: string;
  name: string;
  course: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "upcoming" | "in_progress" | "complete";
  created_at: string;
}

export interface Pool {
  id: string;
  tournament_id: string;
  creator_name: string;
  admin_code: string;
  name: string;
  invite_code: string;
  is_locked: boolean;
  created_at: string;
}

export interface Tier {
  id: string;
  pool_id: string;
  tier_number: number;
  label: string | null;
}

export interface TierPlayer {
  id: string;
  tier_id: string;
  espn_player_id: string;
  player_name: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  display_name: string;
  participant_token: string;
  joined_at: string;
}

export interface Pick {
  id: string;
  pool_member_id: string;
  tier_id: string;
  espn_player_id: string;
  player_name: string;
}

export interface PlayerScore {
  id: string;
  tournament_id: string;
  espn_player_id: string;
  player_name: string;
  total_strokes: number | null;
  to_par: number | null;
  rounds: number[] | null;
  made_cut: boolean;
  position: string | null;
  last_updated: string;
}

export interface CutScore {
  id: string;
  tournament_id: string;
  sat_field_avg: number | null;
  sun_field_avg: number | null;
}

// API / UI types

export interface ESPNPlayer {
  espnPlayerId: string;
  playerName: string;
}

export interface TierWithPlayers extends Tier {
  players: TierPlayer[];
}

export interface PoolWithDetails extends Pool {
  tournament: Tournament;
  tiers: TierWithPlayers[];
}

export interface LeaderboardEntry {
  rank: number;
  memberId: string;
  displayName: string;
  picks: {
    tierNumber: number;
    tierLabel: string | null;
    playerName: string;
    espnPlayerId: string;
    score: PlayerScore | null;
    strokes: number; // actual or penalty strokes
    toPar: number | null;
    isWinner: boolean;
  }[];
  totalStrokes: number;
  totalToPar: number | null;
  winnerBonus: number;
}

// localStorage shape
export interface StoredPoolInfo {
  poolId: string;
  poolName: string;
  participantToken?: string;
  adminCode?: string;
}
