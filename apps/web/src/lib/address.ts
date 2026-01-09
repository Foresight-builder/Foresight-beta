export function normalizeAddress(addr: string): string {
  const a = String(addr || "");
  return a.startsWith("0x") ? a.toLowerCase() : a;
}

export function formatAddress(
  addr: string | null | undefined,
  prefixLen = 6,
  suffixLen = 4
): string {
  if (!addr) return "";
  const s = String(addr);
  if (s.length <= prefixLen + suffixLen + 3) return s;
  return `${s.slice(0, prefixLen)}...${s.slice(-suffixLen)}`;
}
