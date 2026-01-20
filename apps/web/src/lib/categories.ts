export const CATEGORY_MAPPING: Record<string, string> = {
  科技: "tech",
  娱乐: "entertainment",
  时政: "politics",
  天气: "weather",
  体育: "sports",
  商业: "business",
  加密货币: "crypto",
  更多: "more",
};

export const ID_TO_CATEGORY_NAME: Record<string, string> = {
  tech: "科技",
  entertainment: "娱乐",
  politics: "时政",
  weather: "天气",
  sports: "体育",
  crypto: "加密货币",
  business: "商业",
  more: "更多",
};

const CATEGORY_IDS = Object.values(CATEGORY_MAPPING);

export function normalizeCategory(raw?: string): string {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s) return "科技";
  if (["tech", "technology", "ai", "人工智能", "机器人", "科技"].includes(s)) return "科技";
  if (["entertainment", "media", "娱乐", "综艺", "影视"].includes(s)) return "娱乐";
  if (
    [
      "politics",
      "时政",
      "政治",
      "news",
      "国际",
      "finance",
      "经济",
      "宏观",
      "macro",
      "market",
      "stocks",
      "governance",
    ].includes(s)
  )
    return "时政";
  if (["weather", "气象", "天气", "climate", "气候"].includes(s)) return "天气";
  if (["sports", "体育", "football", "soccer", "basketball", "nba"].includes(s)) return "体育";
  if (["business", "商业", "finance", "biz"].includes(s)) return "商业";
  if (["crypto", "加密货币", "btc", "eth", "blockchain", "web3", "defi"].includes(s))
    return "加密货币";
  if (["more", "更多", "other", "其他"].includes(s)) return "更多";
  return "科技";
}

export function normalizeCategoryId(raw?: string): string {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s) return "tech";
  if (CATEGORY_IDS.includes(s)) return s;
  const name = normalizeCategory(s);
  const id = CATEGORY_MAPPING[name];
  if (id) return id;
  if (ID_TO_CATEGORY_NAME[s]) return s;
  return "tech";
}
