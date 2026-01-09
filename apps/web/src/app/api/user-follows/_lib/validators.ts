import { normalizeAddress } from "@/lib/address";

export function parseWalletAddressQuery(raw: unknown): string {
  const addr = normalizeAddress(String(raw || ""));
  if (!/^0x[a-f0-9]{40}$/.test(addr)) return "";
  return addr;
}

export function parsePageQuery(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(String(raw || ""));
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

export function parseLimitQuery(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(String(raw || ""));
  if (!Number.isFinite(n) || n <= 0) return 20;
  const v = Math.floor(n);
  return Math.min(Math.max(v, 1), 100);
}
