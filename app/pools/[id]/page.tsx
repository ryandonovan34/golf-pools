"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PicksForm } from "@/components/pools/PicksForm";
import { PoolLeaderboard } from "@/components/pools/PoolLeaderboard";
import { CountdownTimer } from "@/components/pools/CountdownTimer";
import { AdminCodeEntry } from "@/components/pools/AdminCodeEntry";
import { getPoolToken, getPoolAdminCode, storePoolInfo } from "@/lib/storage";
import type { Tournament, TierWithPlayers, Pick as PickType } from "@/lib/types";

interface PoolData {
  pool: {
    id: string;
    name: string;
    inviteCode: string;
    isLocked: boolean;
    creatorName: string;
  };
  tournament: Tournament;
  tiers: TierWithPlayers[];
  member: { id: string; displayName: string; participantToken: string } | null;
  picks: PickType[] | null;
}

export default function PoolDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const poolId = params.id as string;

  const [data, setData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [editing, setEditing] = useState(false);

  // Resolve token once from URL or localStorage
  const urlToken = searchParams.get("token");
  const storedToken = getPoolToken(poolId);
  const token = urlToken || storedToken;

  // Store URL token in localStorage on first visit
  useEffect(() => {
    setAdminCode(getPoolAdminCode(poolId));
    if (urlToken) {
      storePoolInfo({
        poolId,
        poolName: "",
        participantToken: urlToken,
      });
    }
  }, [poolId, urlToken]);

  const fetchPool = useCallback(async () => {
    try {
      const url = token
        ? `/api/pools/${poolId}?token=${token}`
        : `/api/pools/${poolId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Pool not found");
      const poolData: PoolData = await res.json();
      setData(poolData);

      // Update stored pool name
      if (poolData.pool.name) {
        storePoolInfo({
          poolId,
          poolName: poolData.pool.name,
        });
      }
    } catch {
      setError("Failed to load pool. It may not exist.");
    } finally {
      setLoading(false);
    }
  }, [poolId, token]);

  useEffect(() => {
    if (poolId) fetchPool();
  }, [poolId, fetchPool]);

  async function handleLock() {
    if (!adminCode) return;
    setLocking(true);
    try {
      const res = await fetch(`/api/pools/${poolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminCode, isLocked: true }),
      });
      if (res.ok) {
        fetchPool();
      }
    } catch {
      // ignore
    } finally {
      setLocking(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center">
        <Card>
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold mb-2">Pool Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { pool, tournament, tiers, member, picks } = data;
  const hasPicks = picks && picks.length > 0;

  return (
    <div className="space-y-6">
      {/* Member greeting */}
      {member && (
        <div className="text-sm text-gray-600">
          Welcome, <span className="font-semibold text-masters-green-dark">{member.displayName}</span> 👋
        </div>
      )}

      {/* Pool header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-masters-green-dark">
                {pool.name}
              </h1>
              <StatusBadge status={tournament.status} />
            </div>
            <p className="text-gray-600">
              {tournament.name} • {tournament.course}
            </p>
            <p className="text-sm text-gray-500">
              Created by {pool.creatorName}
            </p>
          </div>
          <div className="text-right space-y-2">
            <div className="bg-masters-green/5 rounded-lg px-4 py-2">
              <p className="text-xs text-gray-500">Invite Code</p>
              <p className="text-xl font-mono font-bold text-masters-green tracking-widest">
                {pool.inviteCode}
              </p>
            </div>
            {pool.isLocked && (
              <span className="inline-block text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-semibold">
                🔒 Locked
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Admin controls */}
      {adminCode && !pool.isLocked && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-800">Admin Controls</p>
              <p className="text-sm text-amber-700">
                Lock the pool to prevent new picks from being submitted.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              loading={locking}
              onClick={handleLock}
            >
              🔒 Lock Pool
            </Button>
          </div>
        </Card>
      )}

      {/* Admin code entry (if not already admin) */}
      {!adminCode && !pool.isLocked && (
        <AdminCodeEntry
          poolId={poolId}
          onSuccess={(code) => {
            setAdminCode(code);
            storePoolInfo({ poolId, poolName: pool.name, adminCode: code });
          }}
        />
      )}

      {/* Countdown to first tee time */}
      {!pool.isLocked && tournament.start_date && (
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">Picks lock at first tee time:</p>
            <CountdownTimer targetDate={tournament.start_date} />
          </div>
        </Card>
      )}

      {/* Not a member prompt */}
      {!token && (
        <Card className="text-center">
          <h2 className="text-xl font-bold mb-2">Join This Pool</h2>
          <p className="text-gray-600 mb-4">
            You need to join this pool to make your picks.
          </p>
          <Link href={`/pools/join`}>
            <Button>Join with Invite Code</Button>
          </Link>
        </Card>
      )}

      {/* Picks section */}
      {!pool.isLocked && token && member && (
        <>
          {/* Locked-in picks view (when picks exist and not editing) */}
          {hasPicks && !editing && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>✅ Your Picks</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    ✏️ Edit Picks
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  You can change your picks until the first tee time.
                </p>
              </CardHeader>
              <div className="space-y-3">
                {tiers
                  .sort((a, b) => a.tier_number - b.tier_number)
                  .map((tier) => {
                    const pick = picks?.find((p) => p.tier_id === tier.id);
                    return (
                      <div
                        key={tier.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-masters-green/20 bg-masters-green/5"
                      >
                        <span className="bg-masters-green text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                          {tier.tier_number}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">
                            {tier.label || `Tier ${tier.tier_number}`}
                          </p>
                          <p className="font-semibold text-masters-green-dark truncate">
                            {pick?.player_name ?? "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          )}

          {/* Picks form (when no picks yet, or editing) */}
          {(!hasPicks || editing) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {hasPicks ? "✏️ Edit Your Picks" : "Make Your Picks"}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {hasPicks
                    ? "Change your selections below."
                    : "Select one player from each tier."}
                </p>
              </CardHeader>
              <PicksForm
                key={JSON.stringify(picks)}
                tiers={tiers}
                poolId={poolId}
                participantToken={token}
                existingPicks={picks}
                onSubmitted={() => {
                  setEditing(false);
                  fetchPool();
                }}
              />
              {hasPicks && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-3 py-2"
                >
                  Cancel
                </button>
              )}
            </Card>
          )}
        </>
      )}

      {/* Locked picks summary */}
      {pool.isLocked && member && hasPicks && (
        <Card>
          <CardHeader>
            <CardTitle>🔒 Your Picks</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Picks are locked. Good luck!
            </p>
          </CardHeader>
          <div className="space-y-3">
            {tiers
              .sort((a, b) => a.tier_number - b.tier_number)
              .map((tier) => {
                const pick = picks?.find((p) => p.tier_id === tier.id);
                return (
                  <div
                    key={tier.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-masters-green/20 bg-masters-green/5"
                  >
                    <span className="bg-masters-green text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                      {tier.tier_number}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">
                        {tier.label || `Tier ${tier.tier_number}`}
                      </p>
                      <p className="font-semibold text-masters-green-dark truncate">
                        {pick?.player_name ?? "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Leaderboard */}
      {pool.isLocked && (
        <Card>
          <CardHeader>
            <CardTitle>🏆 Pool Leaderboard</CardTitle>
          </CardHeader>
          <PoolLeaderboard
            poolId={poolId}
            espnEventId={tournament.espn_event_id}
            currentMemberId={member?.id}
          />
        </Card>
      )}
    </div>
  );
}
