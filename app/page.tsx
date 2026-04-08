"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { CountdownTimer } from "@/components/pools/CountdownTimer";
import { getStoredPools } from "@/lib/storage";
import type { StoredPoolInfo, Tournament } from "@/lib/types";

export default function HomePage() {
  const [storedPools, setStoredPools] = useState<StoredPoolInfo[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStoredPools(getStoredPools());

    // Fetch the first tournament for the countdown
    fetch("/api/tournaments")
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setTournament(data[0]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-5xl font-extrabold text-masters-green-dark mb-4">
          ⛳ Golf Pools
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
          Create and join golf pools with friends. Pick your players, track live
          scores, and compete for bragging rights.
        </p>

        {/* Tournament countdown */}
        {tournament && tournament.status === "upcoming" && tournament.start_date && (
          <div className="mb-8">
            <p className="text-sm text-gray-500 mb-2">
              {tournament.name} starts in:
            </p>
            <CountdownTimer targetDate={tournament.start_date} />
          </div>
        )}

        {tournament && tournament.status === "in_progress" && (
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="font-semibold text-green-800">
                {tournament.name} is LIVE!
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/pools/new">
            <Button size="lg" className="w-full sm:w-auto">
              🏌️ Create a Pool
            </Button>
          </Link>
          <Link href="/pools/join">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              🎟️ Join a Pool
            </Button>
          </Link>
        </div>
      </section>

      {/* User's pools */}
      {mounted && storedPools.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-masters-green-dark mb-4">
            Your Pools
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {storedPools.map((pool) => (
              <Link key={pool.poolId} href={`/pools/${pool.poolId}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle>{pool.poolName}</CardTitle>
                  </CardHeader>
                  <div className="flex items-center gap-2">
                    {pool.adminCode && (
                      <span className="text-xs bg-masters-gold/20 text-masters-green-dark rounded-full px-2 py-0.5 font-semibold">
                        Admin
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      Click to view →
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section>
        <h2 className="text-2xl font-bold text-masters-green-dark mb-6 text-center">
          How It Works
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Create a Pool",
              desc: "Set up tiers of players and get an invite code to share with friends.",
            },
            {
              step: "2",
              title: "Make Your Picks",
              desc: "Choose one player per tier before the tournament starts.",
            },
            {
              step: "3",
              title: "Track Scores",
              desc: "Watch live leaderboard updates as the tournament unfolds.",
            },
          ].map(({ step, title, desc }) => (
            <Card key={step} className="text-center">
              <div className="bg-masters-green text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
                {step}
              </div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
