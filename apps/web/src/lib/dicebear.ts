const DICEBEAR_BASE = "https://api.dicebear.com/7.x/avataaars/svg";

export const buildDiceBearUrl = (seed: string, query: string = "") =>
  `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}${query}`;
