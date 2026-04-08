"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { storePoolInfo } from "@/lib/storage";

export default function JoinPoolPage() {
  return (
    <Suspense>
      <JoinPoolContent />
    </Suspense>
  );
}

function JoinPoolContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill invite code from URL query param
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setInviteCode(code.toUpperCase());
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }
    if (!displayName.trim()) {
      setError("Please enter your display name");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/pools/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          displayName: displayName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join pool");
      }

      // Store pool info in localStorage
      storePoolInfo({
        poolId: data.poolId,
        poolName: data.poolName,
        participantToken: data.participantToken,
      });

      // Redirect to pool detail page
      router.push(`/pools/${data.poolId}?token=${data.participantToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join pool");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-masters-green-dark mb-8 text-center">
        Join a Pool
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Enter Your Details</CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Invite Code"
            placeholder="Enter 6-character code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            maxLength={6}
            required
          />
          <Input
            label="Your Display Name"
            placeholder="Enter your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

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
            Join Pool
          </Button>
        </form>
      </Card>
    </div>
  );
}
