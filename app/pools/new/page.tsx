"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { TierBuilder, TierData } from "@/components/pools/TierBuilder";
import { storePoolInfo } from "@/lib/storage";
import type { Tournament } from "@/lib/types";

export default function CreatePoolPage() {
  const router = useRouter();
  const [creatorName, setCreatorName] = useState("");
  const [poolName, setPoolName] = useState("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [tiers, setTiers] = useState<TierData[]>([
    { tierNumber: 1, label: "Tier 1", players: [] },
    { tierNumber: 2, label: "Tier 2", players: [] },
    { tierNumber: 3, label: "Tier 3", players: [] },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    poolId: string;
    inviteCode: string;
    adminCode: string;
  } | null>(null);

  // Load tournaments
  useEffect(() => {
    fetch("/api/tournaments")
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Invalid response");
        setTournaments(data as Tournament[]);
        if (data.length > 0) {
          setSelectedTournamentId(data[0].id);
        }
      })
      .catch(() => setError("Failed to load tournaments. Check Supabase connection."));
  }, []);

  const selectedTournament = tournaments.find(
    (t) => t.id === selectedTournamentId
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate
    if (!creatorName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!poolName.trim()) {
      setError("Please enter a pool name");
      return;
    }
    if (!selectedTournamentId) {
      setError("Please select a tournament");
      return;
    }
    const invalidTier = tiers.find((t) => t.players.length < 2);
    if (invalidTier) {
      setError(
        `"${invalidTier.label}" needs at least 2 players`
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/pools/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorName: creatorName.trim(),
          tournamentId: selectedTournamentId,
          poolName: poolName.trim(),
          tiers: tiers.map((t) => ({
            tierNumber: t.tierNumber,
            label: t.label,
            players: t.players,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create pool");
      }

      // Store pool info in localStorage
      storePoolInfo({
        poolId: data.poolId,
        poolName: poolName.trim(),
        participantToken: data.participantToken,
        adminCode: data.adminCode,
      });

      setResult({
        poolId: data.poolId,
        inviteCode: data.inviteCode,
        adminCode: data.adminCode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pool");
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (result) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <div className="text-center space-y-6">
            <div className="text-5xl">🎉</div>
            <h2 className="text-2xl font-bold text-masters-green-dark">
              Pool Created!
            </h2>
            <div className="space-y-4">
              <div className="bg-masters-green/5 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Invite Code</p>
                <p className="text-3xl font-mono font-bold text-masters-green tracking-widest">
                  {result.inviteCode}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Share this code with friends so they can join your pool
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Admin Code</p>
                <p className="text-lg font-mono font-bold text-amber-700">
                  {result.adminCode}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ Save this! You&apos;ll need it to lock/manage the pool.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => router.push(`/pools/${result.poolId}`)}>
                Go to Pool →
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(result.inviteCode);
                }}
              >
                Copy Invite Code
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-masters-green-dark mb-8">
        Create a Pool
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pool Details</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              label="Your Name"
              placeholder="Enter your display name"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              required
            />
            <Input
              label="Pool Name"
              placeholder='e.g. "Masters 2026 Office Pool"'
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tournament
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-masters-green focus:ring-2 focus:ring-masters-green/20 focus:outline-none"
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.course}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Player Tiers</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Organize players into tiers. Each pool member will pick one player
              from each tier.
            </p>
          </CardHeader>
          {selectedTournament && (
            <TierBuilder
              eventId={selectedTournament.espn_event_id}
              tiers={tiers}
              onChange={setTiers}
            />
          )}
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          loading={submitting}
          size="lg"
          className="w-full"
        >
          Create Pool
        </Button>
      </form>
    </div>
  );
}
