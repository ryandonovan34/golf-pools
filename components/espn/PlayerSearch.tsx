"use client";

import { useState, useEffect, useCallback } from "react";
import type { ESPNPlayer } from "@/lib/types";
import { Input } from "@/components/ui/Input";

interface PlayerSearchProps {
  eventId: string;
  onSelect: (player: ESPNPlayer) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export function PlayerSearch({
  eventId,
  onSelect,
  excludeIds = [],
  placeholder = "Search for a player...",
}: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [allPlayers, setAllPlayers] = useState<ESPNPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPlayers = useCallback(async () => {
    if (allPlayers.length > 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/espn/roster?eventId=${eventId}`);
      if (!res.ok) throw new Error("Failed to load players");
      const data: ESPNPlayer[] = await res.json();
      setAllPlayers(data);
    } catch {
      setError("Failed to load players from ESPN");
    } finally {
      setLoading(false);
    }
  }, [eventId, allPlayers.length]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const excludeSet = new Set(excludeIds);
  const filtered = allPlayers.filter(
    (p) =>
      !excludeSet.has(p.espnPlayerId) &&
      p.playerName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && (
        <p className="text-sm text-gray-500 mt-1">Loading players...</p>
      )}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      {query.length > 0 && filtered.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.slice(0, 20).map((player) => (
            <li key={player.espnPlayerId}>
              <button
                type="button"
                className="w-full text-left px-4 py-2 hover:bg-masters-green/10 transition-colors text-sm"
                onClick={() => {
                  onSelect(player);
                  setQuery("");
                }}
              >
                {player.playerName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.length > 0 && filtered.length === 0 && !loading && (
        <p className="text-sm text-gray-500 mt-1">No players found</p>
      )}
    </div>
  );
}
