"use client";

import { useState } from "react";
import type { ESPNPlayer } from "@/lib/types";
import { PlayerSearch } from "@/components/espn/PlayerSearch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface TierData {
  tierNumber: number;
  label: string;
  players: ESPNPlayer[];
}

interface TierBuilderProps {
  eventId: string;
  tiers: TierData[];
  onChange: (tiers: TierData[]) => void;
}

export function TierBuilder({ eventId, tiers, onChange }: TierBuilderProps) {
  const allAssignedIds = tiers.flatMap((t) =>
    t.players.map((p) => p.espnPlayerId)
  );

  function addTier() {
    const nextNum = tiers.length + 1;
    onChange([
      ...tiers,
      { tierNumber: nextNum, label: `Tier ${nextNum}`, players: [] },
    ]);
  }

  function removeTier(index: number) {
    const updated = tiers.filter((_, i) => i !== index);
    // Re-number tiers
    const renumbered = updated.map((t, i) => ({
      ...t,
      tierNumber: i + 1,
      label: t.label || `Tier ${i + 1}`,
    }));
    onChange(renumbered);
  }

  function updateLabel(index: number, label: string) {
    const updated = [...tiers];
    updated[index] = { ...updated[index], label };
    onChange(updated);
  }

  function addPlayerToTier(index: number, player: ESPNPlayer) {
    const updated = [...tiers];
    updated[index] = {
      ...updated[index],
      players: [...updated[index].players, player],
    };
    onChange(updated);
  }

  function removePlayerFromTier(tierIndex: number, playerId: string) {
    const updated = [...tiers];
    updated[tierIndex] = {
      ...updated[tierIndex],
      players: updated[tierIndex].players.filter(
        (p) => p.espnPlayerId !== playerId
      ),
    };
    onChange(updated);
  }

  return (
    <div className="space-y-6">
      {tiers.map((tier, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-xl p-4 bg-white"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="bg-masters-green text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">
                {tier.tierNumber}
              </span>
              <Input
                value={tier.label}
                onChange={(e) => updateLabel(index, e.target.value)}
                className="!w-48 !py-1.5 text-sm"
                placeholder="Tier label"
              />
            </div>
            {tiers.length > 1 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeTier(index)}
              >
                Remove
              </Button>
            )}
          </div>

          {/* Assigned players */}
          {tier.players.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tier.players.map((player) => (
                <span
                  key={player.espnPlayerId}
                  className="inline-flex items-center gap-1 bg-masters-green/10 text-masters-green-dark rounded-full px-3 py-1 text-sm"
                >
                  {player.playerName}
                  <button
                    type="button"
                    onClick={() =>
                      removePlayerFromTier(index, player.espnPlayerId)
                    }
                    className="ml-1 text-red-500 hover:text-red-700 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Player search */}
          <PlayerSearch
            eventId={eventId}
            excludeIds={allAssignedIds}
            onSelect={(player) => addPlayerToTier(index, player)}
            placeholder={`Add players to ${tier.label || `Tier ${tier.tierNumber}`}...`}
          />

          {tier.players.length < 2 && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠ At least 2 players required per tier
            </p>
          )}
        </div>
      ))}

      <Button variant="outline" onClick={addTier} className="w-full">
        + Add Tier
      </Button>
    </div>
  );
}
