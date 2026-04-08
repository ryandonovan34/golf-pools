"use client";

import { useState } from "react";
import type { TierWithPlayers } from "@/lib/types";
import { Button } from "@/components/ui/Button";

import type { Pick as PickType } from "@/lib/types";

interface PicksFormProps {
  tiers: TierWithPlayers[];
  poolId: string;
  participantToken: string;
  existingPicks?: PickType[] | null;
  onSubmitted: () => void;
}

export function PicksForm({
  tiers,
  poolId,
  participantToken,
  existingPicks,
  onSubmitted,
}: PicksFormProps) {
  // Pre-fill selections from existing picks
  const initialSelections: Record<string, string> = {};
  if (existingPicks) {
    for (const pick of existingPicks) {
      initialSelections[pick.tier_id] = pick.espn_player_id;
    }
  }

  const [selections, setSelections] = useState<Record<string, string>>(initialSelections);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isEditing = existingPicks && existingPicks.length > 0;

  const allSelected = tiers.every((tier) => selections[tier.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allSelected) return;

    setSubmitting(true);
    setError("");

    const picks = tiers.map((tier) => {
      const player = tier.players.find(
        (p) => p.espn_player_id === selections[tier.id]
      )!;
      return {
        tierId: tier.id,
        espnPlayerId: player.espn_player_id,
        playerName: player.player_name,
      };
    });

    try {
      const res = await fetch(`/api/pools/${poolId}/picks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantToken, picks }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit picks");
      }

      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit picks");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {tiers
        .sort((a, b) => a.tier_number - b.tier_number)
        .map((tier) => (
          <div
            key={tier.id}
            className="border border-gray-200 rounded-xl p-4 bg-white"
          >
            <h3 className="font-bold text-lg text-masters-green-dark mb-3">
              <span className="bg-masters-green text-white text-sm rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">
                {tier.tier_number}
              </span>
              {tier.label || `Tier ${tier.tier_number}`}
            </h3>
            <div className="space-y-2">
              {tier.players.map((player) => (
                <label
                  key={player.espn_player_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selections[tier.id] === player.espn_player_id
                      ? "border-masters-green bg-masters-green/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={`tier-${tier.id}`}
                    value={player.espn_player_id}
                    checked={selections[tier.id] === player.espn_player_id}
                    onChange={() =>
                      setSelections((prev) => ({
                        ...prev,
                        [tier.id]: player.espn_player_id,
                      }))
                    }
                    className="h-4 w-4 text-masters-green focus:ring-masters-green"
                  />
                  <span className="text-sm font-medium">
                    {player.player_name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        loading={submitting}
        disabled={!allSelected}
        className="w-full"
        size="lg"
      >
        {isEditing ? "Update Picks" : "Submit Picks"}
      </Button>
    </form>
  );
}
