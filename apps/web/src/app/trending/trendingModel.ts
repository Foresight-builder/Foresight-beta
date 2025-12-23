import { type FilterSortState } from "@/components/FilterSort";
import { buildDiceBearUrl } from "@/lib/dicebear";
import { normalizeId, isValidId } from "@/lib/ids";

export type HeroEvent = {
  id: string;
  image: string;
  followers: number;
  category: string;
};

export type TrendingCategory = {
  name: string;
  icon: string;
  color: string;
  label?: string;
};

export type PredictionOutcome = {
  label?: string;
};

export type PredictionStats = {
  totalAmount?: number;
  participantCount?: number;
};

export type Prediction = {
  id: number;
  title: string;
  description: string;
  min_stake: number;
  category: string;
  image_url?: string;
  deadline?: string;
  status?: string;
  criteria?: string;
  followers_count?: number;
  type?: string;
  outcomes?: PredictionOutcome[];
  stats?: PredictionStats;
  created_at?: string;
};

export type TrendingEvent = {
  id: number;
  title: string;
  description: string;
  insured: string;
  minInvestment: string;
  tag: string;
  category: string;
  image: string;
  deadline?: string;
  status?: string;
  criteria?: string;
  followers_count: number;
  type: string;
  outcomes: PredictionOutcome[];
  stats?: PredictionStats;
  created_at?: string;
};

export const HERO_EVENTS: HeroEvent[] = [
  {
    id: "globalClimateSummit",
    image:
      "https://images.unsplash.com/photo-1569163139394-de44cb4e4c81?auto=format&fit=crop&w=1000&q=80",
    followers: 12842,
    category: "时政",
  },
  {
    id: "aiSafetySummit",
    image:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80",
    followers: 9340,
    category: "科技",
  },
  {
    id: "globalFinanceForum",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80",
    followers: 7561,
    category: "时政",
  },
  {
    id: "charitySportsMatch",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=80",
    followers: 5043,
    category: "娱乐",
  },
  {
    id: "extremeWeatherAlert",
    image:
      "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=1000&q=80",
    followers: 8921,
    category: "天气",
  },
  {
    id: "techProductLaunch",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1000&q=80",
    followers: 7654,
    category: "科技",
  },
  {
    id: "worldChampionshipFinal",
    image:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1000&q=80",
    followers: 6021,
    category: "体育",
  },
];

export const TRENDING_CATEGORIES: TrendingCategory[] = [
  { name: "科技", icon: "🚀", color: "from-blue-400 to-cyan-400" },
  { name: "娱乐", icon: "🎬", color: "from-pink-400 to-rose-400" },
  { name: "时政", icon: "🏛️", color: "from-purple-400 to-indigo-400" },
  { name: "天气", icon: "🌤️", color: "from-green-400 to-emerald-400" },
  { name: "体育", icon: "⚽", color: "from-orange-400 to-red-400" },
  { name: "商业", icon: "💼", color: "from-slate-400 to-gray-500" },
  { name: "加密货币", icon: "🪙", color: "from-yellow-400 to-amber-500" },
  { name: "更多", icon: "⋯", color: "from-gray-200 to-gray-300" },
];

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

export const normalizeCategory = (raw?: string): string => {
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
      "market",
      "stocks",
    ].includes(s)
  )
    return "时政";
  if (["weather", "气象", "天气", "climate", "气候"].includes(s)) return "天气";
  if (["sports", "体育", "football", "soccer", "basketball", "nba"].includes(s)) return "体育";
  if (["business", "商业", "finance", "biz"].includes(s)) return "商业";
  if (["crypto", "加密货币", "btc", "eth", "blockchain", "web3"].includes(s)) return "加密货币";
  if (["more", "更多", "other", "其他"].includes(s)) return "更多";
  return "科技";
};

export const getFallbackEventImage = (title: string) =>
  buildDiceBearUrl(title, "&size=400&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=20");

export const normalizeEventId = (value: unknown): number | null => normalizeId(value);

export const isValidEventId = (id: number | null): id is number => isValidId(id);

export const fetchPredictions = async () => {
  const res = await fetch("/api/predictions");
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Failed to fetch");
  return data.data as Prediction[];
};

export const mapPredictionToEvent = (prediction: Prediction): TrendingEvent => {
  const minStake = Number(prediction.min_stake || 0);
  const insured = `${minStake} USDC`;
  const image = prediction.image_url || getFallbackEventImage(prediction.title);

  return {
    id: Number(prediction.id),
    title: String(prediction.title || ""),
    description: String(prediction.description || ""),
    insured,
    minInvestment: insured,
    tag: String(prediction.category || ""),
    category: String(prediction.category || ""),
    image,
    deadline: prediction.deadline,
    status: prediction.status,
    criteria: prediction.criteria,
    followers_count: Number(prediction.followers_count || 0),
    type: prediction.type || "binary",
    outcomes: Array.isArray(prediction.outcomes) ? prediction.outcomes : [],
    stats: prediction.stats,
    created_at: prediction.created_at,
  };
};

export const filterEventsByCategory = (events: TrendingEvent[], categoryId: string | null) => {
  if (!categoryId || categoryId === "all") return events;
  const normalizedFilter = categoryId.toLowerCase();

  return events.filter((event) => {
    const eventCategory = String(event.category || event.tag || "").toLowerCase();
    if (eventCategory === normalizedFilter) return true;

    const categoryName = ID_TO_CATEGORY_NAME[normalizedFilter];
    if (categoryName && eventCategory.includes(categoryName.toLowerCase())) return true;

    return false;
  });
};

export const filterEventsByStatus = (events: TrendingEvent[], status: string | null) => {
  if (!status) return events;
  const normalizedStatus = status.toLowerCase();
  const now = Date.now();

  return events.filter((event) => {
    const rawStatus = String(event.status || "").toLowerCase();
    if (rawStatus) {
      return rawStatus === normalizedStatus;
    }
    const deadlineTime = new Date(String(event.deadline || "")).getTime();
    if (!Number.isFinite(deadlineTime)) {
      return true;
    }
    if (normalizedStatus === "ended") {
      return deadlineTime <= now;
    }
    if (normalizedStatus === "active") {
      return deadlineTime > now;
    }
    return true;
  });
};

export const sortEvents = (events: TrendingEvent[], sortBy: FilterSortState["sortBy"]) => {
  const now = Date.now();

  const compareTrending = (a: TrendingEvent, b: TrendingEvent) => {
    const fa = Number(a.followers_count || 0);
    const fb = Number(b.followers_count || 0);
    if (fb !== fa) return fb - fa;

    const taTotal = Number(a.stats?.totalAmount || 0);
    const tbTotal = Number(b.stats?.totalAmount || 0);
    if (tbTotal !== taTotal) return tbTotal - taTotal;

    const da = new Date(String(a.deadline || 0)).getTime() - now;
    const db = new Date(String(b.deadline || 0)).getTime() - now;
    const ta = da <= 0 ? Number.POSITIVE_INFINITY : da;
    const tb = db <= 0 ? Number.POSITIVE_INFINITY : db;
    if (Math.abs(ta - tb) > 1000) return ta - tb;

    return 0;
  };

  const compareNewest = (a: TrendingEvent, b: TrendingEvent) => {
    const ta = new Date(String(a.created_at || 0)).getTime();
    const tb = new Date(String(b.created_at || 0)).getTime();
    if (tb !== ta) return tb - ta;
    return 0;
  };

  const compareEnding = (a: TrendingEvent, b: TrendingEvent) => {
    const da = new Date(String(a.deadline || 0)).getTime();
    const db = new Date(String(b.deadline || 0)).getTime();
    if (da !== db) return da - db;
    return 0;
  };

  const comparePopular = (a: TrendingEvent, b: TrendingEvent) => {
    const fa = Number(a.followers_count || 0);
    const fb = Number(b.followers_count || 0);
    if (fb !== fa) return fb - fa;
    return 0;
  };

  const sorted = [...events];

  sorted.sort((a, b) => {
    if (sortBy === "trending") {
      const result = compareTrending(a, b);
      if (result !== 0) return result;
    } else if (sortBy === "newest") {
      const result = compareNewest(a, b);
      if (result !== 0) return result;
    } else if (sortBy === "ending") {
      const result = compareEnding(a, b);
      if (result !== 0) return result;
    } else if (sortBy === "popular") {
      const result = comparePopular(a, b);
      if (result !== 0) return result;
    }

    return Number(b.id) - Number(a.id);
  });

  return sorted;
};
