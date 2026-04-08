import type { StoredPoolInfo } from "@/lib/types";

const STORAGE_KEY = "golf_pools";

export function getStoredPools(): StoredPoolInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function storePoolInfo(info: StoredPoolInfo) {
  const pools = getStoredPools();
  const existingIndex = pools.findIndex((p) => p.poolId === info.poolId);
  if (existingIndex >= 0) {
    // Merge — keep existing fields, override with new ones
    pools[existingIndex] = { ...pools[existingIndex], ...info };
  } else {
    pools.push(info);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pools));
}

export function getPoolToken(poolId: string): string | null {
  const pools = getStoredPools();
  return pools.find((p) => p.poolId === poolId)?.participantToken ?? null;
}

export function getPoolAdminCode(poolId: string): string | null {
  const pools = getStoredPools();
  return pools.find((p) => p.poolId === poolId)?.adminCode ?? null;
}

export function removeStoredPool(poolId: string) {
  const pools = getStoredPools().filter((p) => p.poolId !== poolId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pools));
}
