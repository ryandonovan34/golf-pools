"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AdminCodeEntryProps {
  poolId: string;
  onSuccess: (code: string) => void;
}

export function AdminCodeEntry({ poolId, onSuccess }: AdminCodeEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        Are you the pool admin? →
      </button>
    );
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setVerifying(true);
    setError("");

    try {
      // Try a no-op PATCH with the admin code to verify it
      const res = await fetch(`/api/pools/${poolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminCode: code.trim(), isLocked: false }),
      });

      if (!res.ok) {
        throw new Error("Invalid admin code");
      }

      onSuccess(code.trim());
    } catch {
      setError("Invalid admin code. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <form onSubmit={handleVerify} className="flex items-end gap-2">
      <Input
        label="Admin Code"
        placeholder="Enter your admin code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="!text-sm"
      />
      <Button type="submit" size="sm" loading={verifying}>
        Verify
      </Button>
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="text-xs text-gray-400 hover:text-gray-600 pb-3"
      >
        Cancel
      </button>
      {error && <p className="text-xs text-red-600 pb-3">{error}</p>}
    </form>
  );
}
