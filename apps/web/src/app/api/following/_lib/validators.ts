import { normalizeAddress } from "@/lib/address";

export function parseWalletAddressQuery(raw: unknown): string {
  const addr = normalizeAddress(String(raw || ""));
  if (!/^0x[a-f0-9]{40}$/.test(addr)) return "";
  return addr;
}
