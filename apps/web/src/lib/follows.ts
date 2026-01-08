import { normalizeAddress } from "@/lib/cn";
import type { ApiResponse } from "@/types/api";

export interface FollowStatus {
  following: boolean;
  followersCount: number;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  return qs.toString();
}

async function parseJson<T>(res: Response): Promise<T> {
  try {
    return await res.json();
  } catch {
    // 非 JSON 返回
    return {} as T;
  }
}

async function parseApiResponseData<T>(res: Response): Promise<T> {
  const json = await parseJson<unknown>(res);
  if (json && typeof json === "object" && "success" in json) {
    const payload = json as ApiResponse<T>;
    if (payload.success) return payload.data;
    const message =
      payload.error?.message ||
      (typeof (payload.error as any)?.detail === "string" ? (payload.error as any).detail : "") ||
      `Request failed: ${res.status}`;
    throw new Error(message);
  }
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "message" in json ? String((json as any).message) : "";
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return json as T;
}

export async function getFollowStatus(
  predictionId: number,
  walletAddress?: string
): Promise<FollowStatus> {
  const addr = walletAddress ? normalizeAddress(walletAddress) : undefined;
  const qs = buildQuery({ predictionId, walletAddress: addr });
  const res = await fetch(`/api/follows?${qs}`, { method: "GET", cache: "no-store" });
  const data = await parseApiResponseData<FollowStatus>(res);
  return { following: !!data.following, followersCount: Number(data.followersCount ?? 0) };
}

export async function followPrediction(predictionId: number, walletAddress: string): Promise<void> {
  const res = await fetch("/api/follows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      predictionId,
      walletAddress: normalizeAddress(walletAddress),
    }),
  });
  await parseApiResponseData(res);
}

export async function unfollowPrediction(
  predictionId: number,
  walletAddress: string
): Promise<void> {
  const res = await fetch("/api/follows", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      predictionId,
      walletAddress: normalizeAddress(walletAddress),
    }),
  });
  await parseApiResponseData(res);
}

export async function toggleFollowPrediction(
  following: boolean,
  predictionId: number,
  walletAddress: string
): Promise<boolean> {
  if (following) {
    await unfollowPrediction(predictionId, walletAddress);
    return false;
  }
  await followPrediction(predictionId, walletAddress);
  return true;
}

import { normalizeId } from "@/lib/ids";

export async function getFollowersCountsBatch(eventIds: number[]): Promise<Record<number, number>> {
  const res = await fetch("/api/follows/counts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventIds }),
  });
  const data = await parseApiResponseData<{ counts?: Record<string, number> }>(res);
  const counts: Record<number, number> = {};
  Object.entries(data.counts || {}).forEach(([k, v]) => {
    const id = normalizeId(k);
    if (id != null) counts[id] = Number(v || 0);
  });
  return counts;
}
