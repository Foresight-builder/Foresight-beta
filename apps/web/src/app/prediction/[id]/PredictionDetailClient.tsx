"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Loader2,
  ArrowUp,
  MessageSquare,
  ArrowRightCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet,
  BarChart3,
  Sparkles,
  ArrowLeftRight,
  CheckCircle2,
  ListFilter,
  Type,
  CircleDollarSign,
  Hash,
  Layers,
  FileText,
  Scale,
  Link2,
  PieChart,
  Zap,
  Calendar,
  Info,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { getFollowStatus, toggleFollowPrediction } from "@/lib/follows";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

const KlineChart = dynamic(() => import("@/components/KlineChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  ),
});

const ChatPanel = dynamic(() => import("@/components/ChatPanel"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-white rounded-3xl animate-pulse"></div>
  ),
});

export interface PredictionDetail {
  id: number;
  title: string;
  description: string;
  category: string;
  deadline: string;
  minStake: number;
  criteria: string;
  referenceUrl: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  stats: {
    yesAmount: number;
    noAmount: number;
    totalAmount: number;
    participantCount: number;
    yesProbability: number;
    noProbability: number;
    betCount: number;
  };
  timeInfo: {
    createdAgo: string;
    deadlineIn: string;
    isExpired: boolean;
  };
  type?: string;
  outcome_count?: number;
  outcomes?: Array<any>;
}

export default function PredictionDetailClient({
  initialPrediction,
}: {
  initialPrediction?: PredictionDetail | null;
}) {
  const params = useParams();
  const router = useRouter();
  const [prediction, setPrediction] = useState<PredictionDetail | null>(
    initialPrediction || null
  );
  const [loading, setLoading] = useState(!initialPrediction);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [entered, setEntered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [staking, setStaking] = useState(false);
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [stakeSuccess, setStakeSuccess] = useState<string | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [guideVariant, setGuideVariant] = useState<"A" | "B">("A");
  const [market, setMarket] = useState<{
    market: string;
    chain_id: number;
    collateral_token?: string;
    tick_size?: number;
  } | null>(null);
  const [manualMarket, setManualMarket] = useState<string>("");
  const [manualChainId, setManualChainId] = useState<string>("");
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [tradeOutcome, setTradeOutcome] = useState<number>(0);
  const [priceInput, setPriceInput] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [expiryInput, setExpiryInput] = useState<string>("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  const [depthBuy, setDepthBuy] = useState<
    Array<{ price: string; qty: string }>
  >([]);
  const [depthSell, setDepthSell] = useState<
    Array<{ price: string; qty: string }>
  >([]);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [queueRows, setQueueRows] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]); // 声明 queue 状态变量
  const [orderMode, setOrderMode] = useState<"limit" | "best">("limit");
  const [bestBid, setBestBid] = useState<string>("");
  const [bestAsk, setBestAsk] = useState<string>("");
  const [midPrice, setMidPrice] = useState<string>("");
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [midByOutcome, setMidByOutcome] = useState<Record<number, bigint>>({});
  const [midDistByOutcome, setMidDistByOutcome] = useState<
    Record<number, number>
  >({});

  // 关注功能相关状态
  const { account, connectWallet, siweLogin } = useWallet();
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPredictionDetail = async () => {
      if (initialPrediction) {
        // 如果有初始数据，仅需异步加载 stats (如果需要最新)
        // 这里我们假设初始数据已经足够，或者可以后台静默更新
        // 为简单起见，若有 initialPrediction，我们跳过主请求，仅请求 stats
        try {
          const resp2 = await fetch(
            `/api/predictions/${params.id}?includeStats=1`
          );
          if (!resp2.ok) return;
          const res2 = await resp2.json();
          if (res2?.success && res2?.data?.stats) {
            setPrediction((prev) =>
              prev
                ? {
                    ...prev,
                    stats: res2.data.stats,
                    timeInfo: res2.data.timeInfo || prev.timeInfo,
                  }
                : prev
            );
          }
        } catch {}
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `/api/predictions/${params.id}?includeStats=0&includeOutcomes=1`
        );
        const contentType = response.headers.get("content-type") || "";
        let result: any = null;
        try {
          if (contentType.includes("application/json")) {
            result = await response.json();
          } else {
            throw new Error(`Unexpected content-type: ${contentType}`);
          }
        } catch (e) {
          console.error("解析响应失败:", e);
          setError("数据解析失败");
          return;
        }

        if (result.success) {
          setPrediction(result.data);
          (async () => {
            try {
              const resp2 = await fetch(
                `/api/predictions/${params.id}?includeStats=1`
              );
              if (!resp2.ok) return;
              const res2 = await resp2.json();
              if (res2?.success && res2?.data?.stats) {
                setPrediction((prev) =>
                  prev
                    ? {
                        ...prev,
                        stats: res2.data.stats,
                        timeInfo: res2.data.timeInfo || prev.timeInfo,
                      }
                    : prev
                );
              }
            } catch {}
          })();
        } else {
          setError(result.message || "获取预测事件详情失败");
        }
      } catch (err) {
        setError("网络请求失败");
        console.error("获取预测事件详情失败:", err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPredictionDetail();
    }
  }, [params.id]);

  useEffect(() => {
    const loadMarket = async () => {
      try {
        const resp = await fetch(`/api/markets/map?id=${params.id}`);
        if (!resp.ok) return;
        const j = await resp.json();
        if (j?.success && j?.data) setMarket(j.data);
      } catch {}
    };
    loadMarket();
  }, [params.id]);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const m =
          market ||
          (manualMarket && manualChainId
            ? ({ market: manualMarket, chain_id: Number(manualChainId) } as any)
            : null);
        if (!m) return;
        const base =
          process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:3005";
        if (!base) return;

        // Parallelize fetch requests
        const [r1, r2] = await Promise.all([
          fetch(
            `${base}/orderbook/depth?contract=${m.market}&chainId=${
              m.chain_id
            }&outcome=${tradeOutcome}&side=${true}&levels=10`
          ),
          fetch(
            `${base}/orderbook/depth?contract=${m.market}&chainId=${
              m.chain_id
            }&outcome=${tradeOutcome}&side=${false}&levels=10`
          ),
        ]);

        const [j1, j2] = await Promise.all([
          r1.json().catch(() => ({})),
          r2.json().catch(() => ({})),
        ]);

        if (j1?.data) setDepthBuy(j1.data);
        if (j2?.data) setDepthSell(j2.data);
        const bb = j1?.data && j1.data.length ? j1.data[0].price : "";
        const ba = j2?.data && j2.data.length ? j2.data[0].price : "";
        setBestBid(bb || "");
        setBestAsk(ba || "");
        if (bb && ba) {
          const mid = (BigInt(bb) + BigInt(ba)) / BigInt(2);
          setMidPrice(mid.toString());
        } else {
          setMidPrice("");
        }
      } catch {}
    }, 2000);
    return () => clearInterval(t);
  }, [
    market?.market,
    market?.chain_id,
    manualMarket,
    manualChainId,
    tradeOutcome,
  ]);

  // 多元选项的中间价分布（相对）
  useEffect(() => {
    let active = true;
    const refreshMultiMids = async () => {
      try {
        const m =
          market ||
          (manualMarket && manualChainId
            ? ({ market: manualMarket, chain_id: Number(manualChainId) } as any)
            : null);
        const outs: any[] = (prediction as any)?.outcomes || [];
        if (!m || !Array.isArray(outs) || outs.length === 0) return;
        const base =
          process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:3005";
        if (!base) return;

        const indices = outs.map((_, i) => i);
        const results = await Promise.all(
          indices.map(async (idx) => {
            try {
              const u1 = `${base}/orderbook/depth?contract=${
                m.market
              }&chainId=${m.chain_id}&outcome=${idx}&side=${true}&levels=1`;
              const u2 = `${base}/orderbook/depth?contract=${
                m.market
              }&chainId=${m.chain_id}&outcome=${idx}&side=${false}&levels=1`;
              const [r1, r2] = await Promise.all([fetch(u1), fetch(u2)]);
              const [j1, j2] = await Promise.all([
                r1.json().catch(() => ({})),
                r2.json().catch(() => ({})),
              ]);
              const bb = j1?.data && j1.data.length ? j1.data[0].price : "";
              const ba = j2?.data && j2.data.length ? j2.data[0].price : "";
              if (bb && ba) {
                const mid = (BigInt(bb) + BigInt(ba)) / BigInt(2);
                return { idx, mid };
              }
              return { idx, mid: BigInt(0) };
            } catch {
              return { idx, mid: BigInt(0) };
            }
          })
        );

        if (!active) return;

        const map: Record<number, bigint> = {};
        let sum: bigint = BigInt(0);
        for (const r of results) {
          map[r.idx] = r.mid;
          sum += r.mid;
        }
        setMidByOutcome(map);
        if (sum > BigInt(0)) {
          const dist: Record<number, number> = {};
          for (const r of results) {
            const pctTimes100 = Number((r.mid * BigInt(10000)) / sum); // 百分比*100
            dist[r.idx] = pctTimes100 / 100;
          }
          setMidDistByOutcome(dist);
        } else {
          setMidDistByOutcome({});
        }
      } catch {}
    };
    const t = setInterval(refreshMultiMids, 5000); // Increase interval to reduce load
    refreshMultiMids();
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [
    market?.market,
    market?.chain_id,
    manualMarket,
    manualChainId,
    prediction?.id,
  ]);

  // 渲染选项切换（根据详情接口 includeOutcomes 返回）
  useEffect(() => {
    // 初始 outcome 兜底：若存在 outcomes，则设为 0
    if (
      prediction &&
      (prediction as any)?.outcomes &&
      Array.isArray((prediction as any).outcomes)
    ) {
      setTradeOutcome(0);
    }
  }, [prediction?.id]);

  useEffect(() => {
    const loadQueue = async () => {
      try {
        const m =
          market ||
          (manualMarket && manualChainId
            ? ({ market: manualMarket, chain_id: Number(manualChainId) } as any)
            : null);
        if (!m || !selectedPrice) return;
        const base =
          process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:3005";
        if (!base) return;
        const u = `${base}/orderbook/queue?contract=${m.market}&chainId=${
          m.chain_id
        }&outcome=${tradeOutcome}&side=${
          tradeSide === "buy"
        }&price=${selectedPrice}&limit=50&offset=0`;
        const r = await fetch(u);
        const j = await r.json().catch(() => ({}));
        if (j?.data) setQueueRows(j.data);
      } catch {}
    };
    loadQueue();
  }, [
    market?.market,
    market?.chain_id,
    manualMarket,
    manualChainId,
    selectedPrice,
    tradeOutcome,
    tradeSide,
  ]);

  // 自动加载所有可成交队列（Counterparty Queue）
  // 当 tradeSide 改变时，我们去拉取对手盘的所有订单（不只是最优价，而是所有 open 的单子）
  // 实际上后端 getQueue 接口目前是按价格筛选的。
  // 为了实现“左侧列表直接显示所有对手单”，我们需要一个新的接口或者循环拉取。
  // 简化方案：我们拉取前50个最优单（不限价格，按价格排序）。
  // 这里我们暂时复用 getQueue 接口，但需要稍微改造后端或者前端逻辑。
  // 由于后端 getQueue 需要 price 参数，我们暂时先拉取 depth 然后对前几个价格拉取 queue。
  // 或者更简单：直接用 supabase 查询。
  useEffect(() => {
    const loadFullQueue = async () => {
      try {
        const m =
          market ||
          (manualMarket && manualChainId
            ? ({ market: manualMarket, chain_id: Number(manualChainId) } as any)
            : null);
        if (!m) return;
        const base =
          process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:3005";
        if (!base) return;

        // 我们直接查 Supabase 表（前端有匿名 key 权限）或者通过 Relayer 新接口。
        // 为了快速实现，我们在这里直接用 Supabase 客户端查询（复用 openOrders 的逻辑但查对手盘）
        // 对手盘条件：
        // 1. contract, chainId 匹配
        // 2. outcome_index 匹配
        // 3. is_buy = !tradeSide (买找卖，卖找买)
        // 4. status in open/filled_partial
        // 5. 排序：买单按价格倒序（高价优先），卖单按价格升序（低价优先）

        const isCounterpartyBuy = tradeSide === "sell"; // 我是卖方，找买单

        if (!supabase) return;
        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, maker_address, maker_salt, price, remaining, is_buy, created_at"
          )
          .eq("verifying_contract", String(m.market).toLowerCase())
          .eq("chain_id", Number(m.chain_id))
          .eq("outcome_index", tradeOutcome)
          .eq("is_buy", isCounterpartyBuy)
          .in("status", ["open", "filled_partial"])
          .order("price", { ascending: !isCounterpartyBuy }) // 买单价格降序，卖单价格升序
          .limit(50);

        if (!error && data) {
          setQueue(data);
        } else {
          setQueue([]);
        }
      } catch {
        setQueue([]);
      }
    };

    // 轮询队列
    loadFullQueue();
    const t = setInterval(loadFullQueue, 3000);
    return () => clearInterval(t);
  }, [
    market?.market,
    market?.chain_id,
    manualMarket,
    manualChainId,
    tradeOutcome,
    tradeSide,
  ]);

  useEffect(() => {
    const loadOpenOrders = async () => {
      try {
        const m =
          market ||
          (manualMarket && manualChainId
            ? ({ market: manualMarket, chain_id: Number(manualChainId) } as any)
            : null);
        if (!m || !account) return;
        if (!supabase) return;
        const { data, error } = await (supabase as any)
          .from("orders")
          .select(
            "id, maker_salt, price, remaining, outcome_index, is_buy, status, created_at"
          )
          .eq("verifying_contract", String(m.market).toLowerCase())
          .eq("chain_id", Number(m.chain_id))
          .eq("maker_address", String(account).toLowerCase())
          .in("status", ["open", "filled_partial"])
          .order("created_at", { ascending: false });
        console.log("[loadOpenOrders] fetching with:", {
          market: m.market,
          chain: m.chain_id,
          account,
        });
        if (error) {
          console.error("[loadOpenOrders] Supabase error:", error);
        } else {
          console.log("[loadOpenOrders] Data:", data);
        }
        if (!error && Array.isArray(data)) setOpenOrders(data);
      } catch (e) {
        console.error("[loadOpenOrders] Exception:", e);
      }
    };
    loadOpenOrders();
  }, [market?.market, market?.chain_id, manualMarket, manualChainId, account]);

  // 将当前查看的事件写入最近浏览（供热门页侧边栏展示）
  useEffect(() => {
    if (!prediction || !account) return;
    try {
      // 本地存储兼容
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("recent_events")
          : null;
      const arr = raw ? JSON.parse(raw) : [];
      const item = {
        id: prediction.id,
        title: prediction.title,
        category: prediction.category,
        seen_at: new Date().toISOString(),
      };
      const dedup = Array.isArray(arr)
        ? arr.filter((x: any) => Number(x?.id) !== Number(prediction.id))
        : [];
      const next = [item, ...dedup].slice(0, 10);
      window.localStorage.setItem("recent_events", JSON.stringify(next));

      // 发送至后端
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: prediction.id,
          walletAddress: account,
        }),
      }).catch((err) => console.error("Failed to sync history:", err));
    } catch {}
  }, [prediction?.id, account]);

  useEffect(() => {
    // 设置页面进入动画状态
    setEntered(true);

    const onScroll = () => {
      if (typeof window !== "undefined") {
        setShowScrollTop(window.scrollY > 200);
      }
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    router.prefetch("/trending");
  }, [router]);

  useEffect(() => {
    try {
      const key = "guide_variant";
      const cached =
        typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (cached === "A" || cached === "B") {
        setGuideVariant(cached as "A" | "B");
      } else {
        const v = Math.random() < 0.5 ? "A" : "B";
        setGuideVariant(v);
        if (typeof window !== "undefined") window.localStorage.setItem(key, v);
      }
    } catch {}
  }, []);

  const handleGuideClick = async () => {
    try {
      setGuideLoading(true);
      setGuideError(null);
      const eventId = Number(params.id);
      const url = `/forum?id=${eventId}`;
      try {
        const payload = JSON.stringify({
          eventId,
          variant: guideVariant,
          ts: Date.now(),
        });
        if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/analytics/guide-click", blob);
        } else {
          await fetch("/api/analytics/guide-click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });
        }
      } catch {}
      router.push(url);
    } catch (e: any) {
      setGuideError(String(e?.message || e || "跳转失败"));
    } finally {
      setGuideLoading(false);
    }
  };

  const outcomeLabel = (idx: number) => {
    const arr = (prediction as any)?.outcomes;
    if (Array.isArray(arr) && arr[idx]) {
      const o = arr[idx] as any;
      return String(o?.label || `选项${idx}`);
    }
    return idx === 1 ? "是" : "否";
  };

  // 获取关注状态和数量
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!params.id) return;

      try {
        setFollowError(null);
        // 添加错误处理和重试逻辑
        let retries = 3;
        let status;

        while (retries > 0) {
          try {
            status = await getFollowStatus(
              Number(params.id),
              account || undefined
            );
            break;
          } catch (err) {
            console.warn(
              `获取关注状态尝试失败，剩余重试次数: ${retries - 1}`,
              err
            );
            retries--;
            if (retries === 0) throw err;
            await new Promise((r) => setTimeout(r, 500)); // 重试前等待500ms
          }
        }

        if (status) {
          setFollowing(!!status.following);
          setFollowersCount(status.followersCount);
        }
      } catch (error) {
        console.error("获取关注状态失败:", error);
        setFollowError("获取关注状态失败");
        // 设置默认值，避免UI显示错误
        setFollowing(false);
        setFollowersCount(0);
      }
    };

    fetchFollowStatus();
  }, [params.id, account]);

  // Supabase Realtime 订阅：针对当前预测事件的关注插入/删除，实时更新 followersCount 与 following
  useEffect(() => {
    const eid = Number(params.id);
    if (!Number.isFinite(eid)) return;
    if (!supabase || typeof (supabase as any).channel !== "function") return;

    const filterEq = `event_id=eq.${eid}`;
    const channel = (supabase as any).channel(`event_follows_detail_${eid}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_follows",
          filter: filterEq,
        },
        (payload: any) => {
          const uid = String((payload?.new || {}).user_id || "");
          // 非当前用户的插入，计数 +1；当前用户则同步 following 状态（避免与本地乐观重复叠加）
          if (!account || uid !== account) {
            setFollowersCount((c) => c + 1);
          }
          if (account && uid === account) {
            setFollowing(true);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "event_follows",
          filter: filterEq,
        },
        (payload: any) => {
          const uid = String((payload?.old || {}).user_id || "");
          if (!account || uid !== account) {
            setFollowersCount((c) => Math.max(0, c - 1));
          }
          if (account && uid === account) {
            setFollowing(false);
          }
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [params.id, account]);

  // 处理关注/取消关注
  const handleToggleFollow = async () => {
    if (!account) {
      try {
        await connectWallet();
        await siweLogin();
      } catch (error) {
        setFollowError("钱包连接失败");
      }
      return;
    }

    setFollowLoading(true);
    setFollowError(null);

    try {
      const addr = account.toLowerCase();
      const newFollowing = await toggleFollowPrediction(
        following,
        Number(params.id),
        addr
      );
      setFollowing(newFollowing);

      // 重新获取关注数量
      const status = await getFollowStatus(Number(params.id), addr);
      setFollowersCount(status.followersCount);
    } catch (error) {
      console.error("关注操作失败:", error);
      const msg =
        error instanceof Error
          ? error.message || "操作失败，请重试"
          : "操作失败，请重试";
      setFollowError(msg);
    } finally {
      setFollowLoading(false);
    }
  };

  // ERC20/合约 ABI（最小化）
  const erc20Abi = [
    "function decimals() view returns (uint8)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 value) returns (bool)",
  ];
  const foresightAbi = [
    "function getPredictionCount() view returns (uint256)",
    "function stake(uint256 _predictionId, uint256 _option, uint256 amount)",
  ];

  // 地址解析（基于 chainId）
  function resolveAddresses(chainId: number): {
    foresight: string;
    usdc: string;
  } {
    const defaultForesight = (
      process.env.NEXT_PUBLIC_FORESIGHT_ADDRESS || ""
    ).trim();
    const defaultUsdc = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "").trim();

    const map: Record<number, { foresight?: string; usdc?: string }> = {
      137: {
        foresight: process.env.NEXT_PUBLIC_FORESIGHT_ADDRESS_POLYGON,
        usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS_POLYGON,
      },
      80002: {
        foresight:
          process.env.NEXT_PUBLIC_FORESIGHT_ADDRESS_AMOY ||
          "0xBec1Fd7e69346aCBa7C15d6E380FcCA993Ea6b02",
        usdc:
          process.env.NEXT_PUBLIC_USDC_ADDRESS_AMOY ||
          "0xdc85e8303CD81e8E78f432bC2c0D673Abccd7Daf",
      },
      11155111: {
        foresight: process.env.NEXT_PUBLIC_FORESIGHT_ADDRESS_SEPOLIA,
        usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA,
      },
      31337: {
        foresight: process.env.NEXT_PUBLIC_FORESIGHT_ADDRESS_LOCALHOST,
        usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS_LOCALHOST,
      },
      1337: {
        foresight: process.env.NEXT_PUBLIC_FORESIGHT_ADDRESS_LOCALHOST,
        usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS_LOCALHOST,
      },
    };

    const fromMap = map[chainId] || {};
    const foresight = (fromMap.foresight || defaultForesight || "").trim();
    const usdc = (fromMap.usdc || defaultUsdc || "").trim();

    // Debug log
    console.log(`[resolveAddresses] chainId: ${chainId}`);
    console.log(
      `[resolveAddresses] Env Check - Amoy USDC: ${process.env.NEXT_PUBLIC_USDC_ADDRESS_AMOY}`
    );
    console.log(
      `[resolveAddresses] Result - usdc: ${usdc}, foresight: ${foresight}`
    );

    return { foresight, usdc };
  }

  // 将任意小数按指定 decimals 转为最小单位 BigInt
  function parseUnitsByDecimals(
    value: number | string,
    decimals: number
  ): bigint {
    const str = typeof value === "number" ? String(value) : value;
    try {
      return ethers.parseUnits(str, decimals);
    } catch {
      // 兜底处理，避免浮点误差
      const parts = str.split(".");
      if (parts.length === 1) {
        return BigInt(parts[0]) * BigInt(10) ** BigInt(decimals);
      }
      const [intPart, fracRaw] = parts;
      const frac = (fracRaw || "").slice(0, decimals).padEnd(decimals, "0");
      return (
        BigInt(intPart || "0") * BigInt(10) ** BigInt(decimals) +
        BigInt(frac || "0")
      );
    }
  }

  async function submitOrder() {
    try {
      setOrderMsg(null);
      setOrderSubmitting(true);
      const m =
        market ||
        (manualMarket && manualChainId
          ? ({ market: manualMarket, chain_id: Number(manualChainId) } as any)
          : null);
      if (!m) throw new Error("未配置市场");
      if (!prediction) throw new Error("预测事件未加载");
      if (typeof window === "undefined" || !(window as any).ethereum)
        throw new Error("请先连接钱包");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const accountAddr = await signer.getAddress();
      const net = await provider.getNetwork();
      let chainIdNum = Number(net.chainId);
      // 如果钱包在 Chain 1，但市场需要 80002，我们可能希望提示切换，但 resolveAddresses(1) 会返回空
      // 这里如果当前网络不在配置中，尝试使用 m.chain_id 来获取地址配置（跨链读取或提示）
      const { usdc } = resolveAddresses(chainIdNum);
      
      // 如果当前网络未配置USDC，但我们有目标市场的 Chain ID，
      // 检查是否就是网络不匹配导致的
      // 注意：即便 usdc 存在，如果当前 chainIdNum 不等于 m.chain_id，也应该切换
      if ((!usdc || (m.chain_id && m.chain_id !== chainIdNum)) && m.chain_id) {
         try {
           await (window as any).ethereum.request({
             method: 'wallet_switchEthereumChain',
             params: [{ chainId: '0x' + m.chain_id.toString(16) }],
           });
           // 切换后重新获取网络状态
           // 注意：这里需要重新创建 provider，因为之前的 provider 可能还绑定在旧网络
           const newProvider = new ethers.BrowserProvider((window as any).ethereum);
           const newNet = await newProvider.getNetwork();
           chainIdNum = Number(newNet.chainId);
           
           // 如果切换后的网络仍然不匹配目标网络，可能是用户拒绝了或有其他问题
           if (chainIdNum !== m.chain_id) {
              throw new Error(`网络切换失败，当前仍在 Chain ID: ${chainIdNum}，目标: ${m.chain_id}`);
           }

           // 重新解析地址
           const { usdc: newUsdc } = resolveAddresses(chainIdNum);
           if (!newUsdc) throw new Error(`未配置USDC地址 (Chain ID: ${chainIdNum})`);
           // 继续执行...
         } catch (switchError: any) {
           console.error("Switch chain error:", switchError);
           // This error code indicates that the chain has not been added to MetaMask.
           if (switchError.code === 4902) {
             throw new Error("请在钱包中添加并切换到目标网络");
           }
           // 如果是用户拒绝（4001），抛出具体信息
           if (switchError.code === 4001) {
             throw new Error("您取消了网络切换");
           }
           throw new Error(`请切换网络到 Chain ID: ${m.chain_id} (当前: ${chainIdNum})`);
         }
      } else if (!usdc) {
        console.error(
          `[submitOrder] Missing USDC address for chainId: ${chainIdNum}`
        );
        throw new Error(
          `未配置USDC地址 (Chain ID: ${chainIdNum})。请切换到 Amoy 测试网 (80002)`
        );
      }
      
      const outcomeIndex = tradeOutcome;
      const isBuy = tradeSide === "buy";
      let priceDec = Number(priceInput || "0");
      if (orderMode === "best") {
        const target = tradeSide === "buy" ? bestAsk : bestBid;
        if (!target) throw new Error("缺少盘口数据");
        priceDec = Number(ethers.formatUnits(BigInt(target), 6));
      }
      const amountDec = Number(amountInput || "0");
      if (!Number.isFinite(priceDec) || priceDec <= 0)
        throw new Error("价格不合法");
      if (!Number.isFinite(amountDec) || amountDec <= 0)
        throw new Error("数量不合法");

      // 重新获取正确的 USDC 地址（可能已经切换网络）
      const { usdc: finalUsdc } = resolveAddresses(chainIdNum);
      if (!finalUsdc) throw new Error("无法获取当前网络的 USDC 地址");

      const token = new ethers.Contract(finalUsdc, erc20Abi, signer);
      let decimals = 6;
      try {
        decimals = await token.decimals();
      } catch {}
      const price = parseUnitsByDecimals(priceDec, Number(decimals));
      const amount = BigInt(Math.floor(amountDec));

      // 前端检查授权
      if (isBuy) {
        // 买方：支付 USDC，检查 USDC 授权给 Market
        const needed = amount * price;
        const allowance: bigint = await token.allowance(accountAddr, m.market);
        if (allowance < needed) {
          setOrderMsg("正在请求 USDC 授权...");
          const tx = await token.approve(m.market, needed);
          await tx.wait();
          setOrderMsg("授权成功，正在下单...");
        }
      } else {
        // 卖方：支付 Outcome Token，检查 Outcome Token 授权给 Market
        const marketContract = new ethers.Contract(
          m.market,
          ["function outcomeToken() view returns (address)"],
          signer
        );
        const outcomeAddr = await marketContract.outcomeToken();
        const outcome = new ethers.Contract(
          outcomeAddr,
          [
            "function isApprovedForAll(address account, address operator) view returns (bool)",
            "function setApprovalForAll(address operator, bool approved) external",
          ],
          signer
        );
        const isApproved: boolean = await outcome.isApprovedForAll(
          accountAddr,
          m.market
        );
        if (!isApproved) {
          setOrderMsg("正在请求 Outcome Token 授权...");
          const tx = await outcome.setApprovalForAll(m.market, true);
          await tx.wait();
          setOrderMsg("授权成功，正在下单...");
        }
      }

      const inputVal = Number(expiryInput || "0");
      const duration = inputVal > 0 ? inputVal : 31536000;
      const expirySec = BigInt(Math.floor(Date.now() / 1000) + duration);
      const salt = BigInt(String(Date.now()));
      const domain = {
        name: "CLOBMarket",
        version: "1",
        chainId: chainIdNum,
        verifyingContract: m.market,
      };
      const types = {
        OrderRequest: [
          { name: "maker", type: "address" },
          { name: "outcomeIndex", type: "uint256" },
          { name: "isBuy", type: "bool" },
          { name: "price", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "salt", type: "uint256" },
        ],
      } as const;
      const message = {
        maker: accountAddr,
        outcomeIndex,
        isBuy,
        price,
        amount,
        expiry: expirySec,
        salt,
      };
      const signature = await signer.signTypedData(
        domain as any,
        types as any,
        message as any
      );
      const base =
        process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:3005";
      if (!base) throw new Error("未配置撮合服务");
      const body = {
        chainId: chainIdNum,
        verifyingContract: m.market,
        order: {
          maker: accountAddr,
          outcomeIndex,
          isBuy,
          price: price.toString(),
          amount: amount.toString(),
          expiry: expirySec.toString(),
          salt: salt.toString(),
        },
        signature,
      };
      const resp = await fetch(`${base}/orderbook/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.detail || j?.message || "下单失败");
      setOrderMsg("下单成功");
    } catch (e: any) {
      setOrderMsg(e?.message || "下单失败");
    } finally {
      setOrderSubmitting(false);
    }
  }

  async function fillOrder(row: any) {
    try {
      setOrderMsg(null);
      const m =
        market ||
        (manualMarket && manualChainId
          ? ({ market: manualMarket, chain_id: Number(manualChainId) } as any)
          : null);
      if (!m) throw new Error("未配置市场");
      if (typeof window === "undefined" || !(window as any).ethereum)
        throw new Error("请先连接钱包");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const base =
        process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:3005";
      const d = await fetch(`/api/orderbook/order?id=${row.id}`);
      const j = await d.json();
      const ord = j?.data;
      if (!ord) throw new Error("订单不存在");
      const types = {
        OrderRequest: [
          { name: "maker", type: "address" },
          { name: "outcomeIndex", type: "uint256" },
          { name: "isBuy", type: "bool" },
          { name: "price", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "salt", type: "uint256" },
        ],
      } as const;
      const marketContract = new ethers.Contract(
        m.market,
        [
          "function fillOrderSigned((address,uint256,bool,uint256,uint256,uint256,uint256),bytes,uint256)",
        ],
        signer
      );
      const req = [
        ord.maker_address,
        Number(ord.outcome_index),
        Boolean(ord.is_buy),
        BigInt(ord.price),
        BigInt(ord.amount),
        ord.expiry
          ? BigInt(Math.floor(new Date(String(ord.expiry)).getTime() / 1000))
          : BigInt(0),
        BigInt(ord.maker_salt),
      ];
      const desired = amountInput
        ? BigInt(Math.floor(Number(amountInput)))
        : BigInt(0);
      const remaining = BigInt(ord.remaining);
      const fillAmount =
        desired > BigInt(0)
          ? desired > remaining
            ? remaining
            : desired
          : remaining;

      // 前端检查授权
      if (!Boolean(ord.is_buy)) {
        // Taker 买入 (Maker 卖出) -> Taker 支付 USDC
        const { usdc } = resolveAddresses(Number(ord.chain_id));
        if (!usdc)
          throw new Error(`未配置USDC地址 (Chain ID: ${ord.chain_id})`);
        const token = new ethers.Contract(usdc, erc20Abi, signer);
        const accountAddr = await signer.getAddress();
        const price = BigInt(ord.price);
        const need = fillAmount * price;
        const allowance: bigint = await token.allowance(accountAddr, m.market);
        if (allowance < need) {
          setOrderMsg("正在请求 USDC 授权...");
          const tx = await token.approve(m.market, need);
          await tx.wait();
        }
      } else {
        // Taker 卖出 (Maker 买入) -> Taker 支付 Outcome Token
        const mkt = new ethers.Contract(
          m.market,
          ["function outcomeToken() view returns (address)"],
          signer
        );
        const outcomeAddr = await mkt.outcomeToken();
        const outcome = new ethers.Contract(
          outcomeAddr,
          [
            "function isApprovedForAll(address account, address operator) view returns (bool)",
            "function setApprovalForAll(address operator, bool approved) external",
          ],
          signer
        );
        const accountAddr = await signer.getAddress();
        const isAppr = await outcome.isApprovedForAll(accountAddr, m.market);
        if (!isAppr) {
          setOrderMsg("正在请求 Outcome Token 授权...");
          const tx = await outcome.setApprovalForAll(m.market, true);
          await tx.wait();
        }
      }

      setOrderMsg("正在成交...");
      const tx = await marketContract.fillOrderSigned(
        req as any,
        ord.signature,
        fillAmount
      );
      const receipt = await tx.wait();
      // 上报交易以更新 K 线
      try {
        const chain = await provider.getNetwork();
        await fetch(`${base}/orderbook/report-trade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chainId: Number(chain.chainId),
            txHash: receipt.hash,
          }),
        });
      } catch {}
      setOrderMsg("成交成功");
    } catch (e: any) {
      setOrderMsg(e?.message || "成交失败");
    }
  }

  async function cancelOrderSalt(row: any) {
    try {
      setOrderMsg(null);
      const m =
        market ||
        (manualMarket && manualChainId
          ? ({ market: manualMarket, chain_id: Number(manualChainId) } as any)
          : null);
      if (!m) throw new Error("未配置市场");
      if (typeof window === "undefined" || !(window as any).ethereum)
        throw new Error("请先连接钱包");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const chain = await provider.getNetwork();
      const chainIdNum = Number(chain.chainId);
      const base =
        process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:3005";
      const typesResp = await fetch(`${base}/orderbook/types`);
      const typesJson = await typesResp.json().catch(() => ({}));
      const types = typesJson?.types || {
        CancelSaltRequest: [
          { name: "maker", type: "address" },
          { name: "salt", type: "uint256" },
        ],
      };
      const domain = {
        name: "CLOBMarket",
        version: "1",
        chainId: chainIdNum,
        verifyingContract: m.market,
      };
      const message = { maker: addr, salt: BigInt(row.maker_salt) };
      const signature = await signer.signTypedData(
        domain as any,
        { CancelSaltRequest: types.CancelSaltRequest } as any,
        message as any
      );
      const payload = {
        chainId: chainIdNum,
        verifyingContract: m.market,
        maker: addr,
        salt: BigInt(row.maker_salt).toString(),
        signature,
      };
      const resp = await fetch(`${base}/orderbook/cancel-salt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.detail || j?.message || "取消失败");
      setOrderMsg("取消成功");
      const fresh = openOrders.filter(
        (x) => String(x.maker_salt) !== String(row.maker_salt)
      );
      setOpenOrders(fresh);
    } catch (e: any) {
      setOrderMsg(e?.message || "取消失败");
    }
  }

  const handleStake = async (
    option: number | string,
    customAmount?: string
  ) => {
    try {
      setStakeError(null);
      setStakeSuccess(null);
      setStaking(true);

      if (!prediction) throw new Error("预测事件未加载");
      if (typeof window === "undefined" || !(window as any).ethereum) {
        throw new Error("请先连接钱包");
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const chainIdNum = Number(network.chainId);
      const { foresight, usdc } = resolveAddresses(chainIdNum);
      if (!foresight || !usdc) {
        throw new Error(
          `未配置当前网络 (Chain ID: ${chainIdNum}) 的合约或USDC地址。请切换到 Amoy 测试网 (80002) 或 Polygon (137)`
        );
      }

      const account = await signer.getAddress();
      const token = new ethers.Contract(usdc, erc20Abi, signer);
      let decimals = 6;
      try {
        decimals = await token.decimals();
      } catch {}

      const amountStr = customAmount || String(prediction.minStake || "10");
      const amount = parseUnitsByDecimals(amountStr, Number(decimals));

      // 先检查并授权
      const allowance: bigint = await token.allowance(account, foresight);
      if (allowance < amount) {
        const txApprove = await token.approve(foresight, amount);
        await txApprove.wait();
      }

      // 确认链上预测是否存在（默认使用 off-chain 的 id 作为链上 id）
      const foresightContract = new ethers.Contract(
        foresight,
        foresightAbi,
        signer
      );
      const count: bigint = await foresightContract.getPredictionCount();
      if (BigInt(prediction.id) >= count) {
        throw new Error("该事件尚未在链上创建，暂不可押注");
      }

      // 选项映射：yes -> 1, no -> 0
      let optionIndex = 0;
      if (typeof option === "string") {
        optionIndex = option === "yes" ? 1 : 0;
      } else {
        optionIndex = Number(option);
      }

      const txStake = await foresightContract.stake(
        prediction.id,
        optionIndex,
        amount
      );
      const receipt = await txStake.wait();

      setStakeSuccess(`押注成功，交易哈希：${receipt?.hash || ""}`);
    } catch (e: any) {
      setStakeError(e?.message || "押注失败");
    } finally {
      setStaking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载预测事件详情中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">加载失败</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            预测事件不存在
          </h2>
          <p className="text-gray-600">请检查事件ID是否正确</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        <div
          className={`max-w-6xl mx-auto transition-all duration-200 ease-out ${
            entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          }`}
        >
          {/* 返回按钮 */}
          <button
            type="button"
            aria-label="返回上一页"
            title="返回上一页"
            onClick={() => {
              startTransition(() => {
                // Always go back to trending for predictable navigation flow
                // Using router.back() can be unreliable with history state
                router.push("/trending");
              });
            }}
            disabled={isPending}
            className="mb-6 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/60 backdrop-blur-md border border-gray-200 text-gray-700 hover:text-gray-800 hover:bg-white/75 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-sm font-medium">
              {isPending ? "返回中…" : "返回"}
            </span>
          </button>

          {/* 预测事件卡片 - 与creating预览保持一致 */}
          <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] shadow-lg shadow-purple-500/5 border border-white/60 overflow-hidden">
            {/* 卡片头部 - 渐变背景 */}
            <div className="p-6 bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">
                      {prediction.category === "科技"
                        ? "🚀"
                        : prediction.category === "娱乐"
                        ? "🎬"
                        : prediction.category === "时政"
                        ? "🏛️"
                        : prediction.category === "天气"
                        ? "🌤️"
                        : "📊"}
                    </span>
                    <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded-full">
                      {prediction.category}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      prediction.status === "active"
                        ? "bg-green-100/20 text-green-50"
                        : prediction.status === "completed"
                        ? "bg-blue-100/20 text-blue-50"
                        : "bg-gray-100/20 text-gray-50"
                    }`}
                  >
                    {prediction.status === "active"
                      ? "进行中"
                      : prediction.status === "completed"
                      ? "已结束"
                      : "已取消"}
                  </span>
                </div>
                <h1 className="text-2xl font-bold leading-tight">
                  {prediction.title}
                </h1>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-sm text-white/90">
                    关注数 {followersCount}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className="px-2.5 py-1 rounded-full text-sm font-medium bg-white/20 hover:bg-white/30 text-white disabled:opacity-60"
                  >
                    {followLoading ? "处理中…" : following ? "已关注" : "关注"}
                  </button>
                  {followError && (
                    <span className="text-xs text-yellow-200">
                      {followError}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 卡片内容 */}
            <div className="p-6">
              {/* 时间信息 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center text-sm text-gray-600 bg-orange-50 px-3 py-2 rounded-xl border border-orange-100">
                  <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                  <span>创建于 {prediction.timeInfo.createdAgo}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 bg-yellow-50 px-3 py-2 rounded-xl border border-yellow-100">
                  <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                  <span
                    className={
                      prediction.timeInfo.isExpired
                        ? "text-red-600 font-medium"
                        : "text-yellow-700 font-medium"
                    }
                  >
                    {prediction.timeInfo.deadlineIn}
                  </span>
                </div>
              </div>

              {/* 描述 */}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  事件描述
                </h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line pl-1">
                  {prediction.description}
                </p>
              </div>

              {/* 判断标准 */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 mb-6">
                <div className="flex items-center mb-2">
                  <div className="p-1.5 bg-green-100 rounded-lg text-green-600 mr-2">
                    <Scale className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-green-800">
                    判断标准
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed pl-1">
                  {prediction.criteria}
                </p>
              </div>

              {/* 参考链接 */}
              {prediction.referenceUrl && (
                <div className="mb-6">
                  <a
                    href={prediction.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 hover:shadow-sm transition-all border border-purple-100"
                  >
                    <Link2 className="w-4 h-4" />
                    参考链接
                  </a>
                </div>
              )}

              {/* 押注统计 */}
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <div className="p-1.5 bg-pink-100 rounded-lg text-pink-600">
                    <PieChart className="w-5 h-5" />
                  </div>
                  押注统计
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <div className="text-2xl font-bold text-indigo-600">
                      {prediction.stats.participantCount}
                    </div>
                    <div className="text-xs text-indigo-400 font-medium mt-1">
                      参与人数
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-50/50 rounded-xl border border-green-100">
                    <div className="text-2xl font-bold text-green-600">
                      {prediction.stats.betCount}
                    </div>
                    <div className="text-xs text-green-500 font-medium mt-1">
                      押注次数
                    </div>
                  </div>
                  <div className="text-center p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                    <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                      {prediction.stats.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-xs text-purple-400 font-medium mt-1">
                      总金额 (USDC)
                    </div>
                  </div>
                  <div className="text-center p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                    <div className="text-2xl font-bold text-orange-600">
                      {prediction.minStake}
                    </div>
                    <div className="text-xs text-orange-400 font-medium mt-1">
                      最小押注 (USDC)
                    </div>
                  </div>
                </div>

                {Array.isArray((prediction as any)?.outcomes) &&
                (prediction as any).outcomes.length > 0 ? (
                  <div className="space-y-3">
                    {(prediction as any).outcomes.map((o: any, idx: number) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{String(o?.label || `选项${idx}`)}</span>
                          <span>
                            {typeof midDistByOutcome[idx] === "number"
                              ? `${midDistByOutcome[idx].toFixed(1)}%`
                              : "—"}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-indigo-400 to-purple-600 h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                typeof midDistByOutcome[idx] === "number"
                                  ? midDistByOutcome[idx]
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-gray-600">
                      基于各选项盘口中间价的相对分布，仅作参考。
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>
                          是 ({prediction.stats.yesProbability * 100}%)
                        </span>
                        <span>
                          否 ({prediction.stats.noProbability * 100}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                          style={{
                            width: `${prediction.stats.yesProbability * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>
                          是: {prediction.stats.yesAmount.toFixed(2)} USDC
                        </span>
                        <span>
                          否: {prediction.stats.noAmount.toFixed(2)} USDC
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-indigo-400 to-purple-600 h-3 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              prediction.stats.totalAmount > 0
                                ? (prediction.stats.yesAmount /
                                    prediction.stats.totalAmount) *
                                  100
                                : 50
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 参与押注 (简单模式/非CLOB) */}
          {prediction.status === "active" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-8 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-indigo-500/10 border border-white/60 p-8 relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

              <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-3 relative z-10">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/30">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span>参与押注</span>
                  <span className="text-xs font-normal text-gray-500 mt-0.5">
                    预测未来，赢取奖励
                  </span>
                </div>
              </h3>
              {Array.isArray((prediction as any)?.outcomes) &&
              (prediction as any).outcomes.length > 0 ? (
                <div className="relative z-10">
                  <div className="text-sm text-gray-600 mb-4 font-medium">
                    选择一个选项:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {(prediction as any).outcomes.map((o: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setTradeOutcome(idx)}
                        className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-300 ${
                          tradeOutcome === idx
                            ? "bg-white border-indigo-500 shadow-lg shadow-indigo-200 scale-[1.02]"
                            : "bg-white/50 border-transparent hover:bg-white hover:border-indigo-200 hover:shadow-md"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 mb-2 flex items-center justify-center ${
                            tradeOutcome === idx
                              ? "border-indigo-500"
                              : "border-gray-300"
                          }`}
                        >
                          {tradeOutcome === idx && (
                            <div className="w-3 h-3 rounded-full bg-indigo-500" />
                          )}
                        </div>
                        <span
                          className={`font-bold block ${
                            tradeOutcome === idx
                              ? "text-indigo-700"
                              : "text-gray-600"
                          }`}
                        >
                          {String(o?.label || `选项${idx}`)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm space-y-4">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <CircleDollarSign className="w-4 h-4 text-indigo-500" />
                      押注金额
                    </label>
                    <div className="flex gap-4 flex-col sm:flex-row">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          placeholder="0.00"
                          id="multi-stake-amount"
                          className="w-full pl-4 pr-16 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-mono font-medium"
                          onChange={(e) => {
                            // Optional: handle input change if needed
                          }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                          USDC
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const val = (
                            document.getElementById(
                              "multi-stake-amount"
                            ) as HTMLInputElement
                          )?.value;
                          if (!val) return;
                          handleStake(tradeOutcome, val);
                        }}
                        disabled={staking}
                        className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                      >
                        {staking ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <span>确认押注</span>
                            <ArrowRightCircle className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {(stakeError || stakeSuccess) && (
                    <div
                      className={`mt-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
                        stakeError
                          ? "bg-red-50 text-red-600"
                          : "bg-green-50 text-green-600"
                      }`}
                    >
                      {stakeError ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {stakeError || stakeSuccess}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => handleStake("yes")}
                      disabled={staking}
                      className="group relative flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-green-50/50 to-white border-2 border-green-100 hover:border-green-500 transition-all duration-300 shadow-sm hover:shadow-green-500/20 hover:-translate-y-1 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-green-500 group-hover:text-white transition-all duration-300 shadow-sm">
                        <ThumbsUp className="w-7 h-7" />
                      </div>
                      <span className="font-bold text-gray-800 text-lg group-hover:text-green-700">
                        支持
                      </span>
                      <span className="text-xs text-green-600 font-medium mt-1 bg-green-100 px-2 py-0.5 rounded-full">
                        预测达成
                      </span>
                    </button>

                    <button
                      onClick={() => handleStake("no")}
                      disabled={staking}
                      className="group relative flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-red-50/50 to-white border-2 border-red-100 hover:border-red-500 transition-all duration-300 shadow-sm hover:shadow-red-500/20 hover:-translate-y-1 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-red-500 group-hover:text-white transition-all duration-300 shadow-sm">
                        <ThumbsDown className="w-7 h-7" />
                      </div>
                      <span className="font-bold text-gray-800 text-lg group-hover:text-red-700">
                        反对
                      </span>
                      <span className="text-xs text-red-600 font-medium mt-1 bg-red-100 px-2 py-0.5 rounded-full">
                        预测不达成
                      </span>
                    </button>
                  </div>

                  {staking && (
                    <div className="text-center py-2 text-indigo-600 font-medium flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在处理您的押注...
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-indigo-100/50">
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-indigo-400" />
                      最小押注:{" "}
                      <span className="font-mono font-bold text-gray-700">
                        {prediction.minStake} USDC
                      </span>
                    </p>
                    {(stakeError || stakeSuccess) && (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-lg ${
                          stakeError
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-600"
                        }`}
                      >
                        {stakeError || stakeSuccess}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Transaction Module */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-indigo-500/5 border border-white/60 overflow-hidden relative"
          >
            {/* Decorative top line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90"></div>

            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 rounded-2xl shadow-sm ring-1 ring-indigo-100/50">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      交易市场
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold tracking-wider uppercase border border-indigo-100">
                        CLOB
                      </span>
                      <p className="text-xs text-gray-500 font-medium">
                        Order Book & Match Engine
                      </p>
                    </div>
                  </div>
                </div>
                {market && (
                  <div
                    className="flex items-center gap-3 pl-4 pr-2 py-2 bg-gray-50/50 border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-copy group relative"
                    onClick={() => {
                      navigator.clipboard.writeText(market.market);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-gray-600 group-hover:text-indigo-600 transition-colors">
                        {market.market.slice(0, 6)}...{market.market.slice(-4)}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-gray-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <Link2 className="w-3.5 h-3.5" />
                    </div>

                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 w-max px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl font-medium z-20">
                      点击复制合约地址
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8">
              {!market && (
                <div className="mb-8 bg-orange-50/50 border border-orange-100 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-xl shadow-sm">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-orange-900 mb-2">
                        未检测到自动配置的市场
                      </h4>
                      <p className="text-sm text-orange-800/80 mb-4 leading-relaxed">
                        当前预测事件尚未关联自动做市商合约。如果您已知晓合约地址，可以手动输入以连接交易。
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                          <input
                            value={manualMarket}
                            onChange={(e) => setManualMarket(e.target.value)}
                            placeholder="市场合约地址 (0x...) "
                            className="w-full px-4 py-3 rounded-xl border border-orange-200/60 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all placeholder:text-orange-300"
                          />
                        </div>
                        <div className="relative">
                          <input
                            value={manualChainId}
                            onChange={(e) => setManualChainId(e.target.value)}
                            placeholder="链ID (例如 137)"
                            className="w-full px-4 py-3 rounded-xl border border-orange-200/60 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all placeholder:text-orange-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* K线图 */}
              {market && (
                <div className="mb-10 bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden">
                  <div className="bg-white/40 px-6 py-4 border-b border-gray-100/50 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      价格走势 (15m)
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        实时数据
                      </span>
                    </div>
                  </div>
                  <div className="p-1">
                    <KlineChart
                      market={market.market}
                      chainId={Number(market.chain_id)}
                      outcomeIndex={tradeOutcome}
                      resolution="15m"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* 左侧：下单表单 */}
                <div className="lg:col-span-7 space-y-8">
                  {/* 1. 交易方向 */}
                  <div className="bg-gray-100/80 rounded-2xl p-1.5 flex shadow-inner">
                    <button
                      onClick={() => setTradeSide("buy")}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                        tradeSide === "buy"
                          ? "bg-white text-green-600 shadow-md ring-1 ring-green-100"
                          : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      买入 (Buy)
                    </button>
                    <button
                      onClick={() => setTradeSide("sell")}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                        tradeSide === "sell"
                          ? "bg-white text-red-600 shadow-md ring-1 ring-red-100"
                          : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" />
                      卖出 (Sell)
                    </button>
                  </div>

                  {/* 2. 选择选项 */}
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                      选择预测结果
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray((prediction as any)?.outcomes) &&
                      (prediction as any).outcomes.length > 0 ? (
                        (prediction as any).outcomes.map(
                          (o: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => setTradeOutcome(idx)}
                              className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-200 ${
                                tradeOutcome === idx
                                  ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm"
                                  : "bg-white border-gray-100 text-gray-600 hover:border-indigo-200 hover:text-indigo-600"
                              }`}
                            >
                              {String(o?.label || `选项${idx}`)}
                            </button>
                          )
                        )
                      ) : (
                        <div className="flex w-full gap-4">
                          <button
                            onClick={() => setTradeOutcome(1)}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                              tradeOutcome === 1
                                ? "bg-green-50 border-green-500 text-green-700 shadow-sm"
                                : "bg-white border-gray-100 text-gray-600 hover:border-green-200 hover:text-green-600"
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />是 (Yes)
                          </button>
                          <button
                            onClick={() => setTradeOutcome(0)}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                              tradeOutcome === 0
                                ? "bg-red-50 border-red-500 text-red-700 shadow-sm"
                                : "bg-white border-gray-100 text-gray-600 hover:border-red-200 hover:text-red-600"
                            }`}
                          >
                            <ThumbsDown className="w-4 h-4" />否 (No)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. 可成交队列 */}
                  <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-indigo-100/60 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <ListFilter className="w-4 h-4 text-indigo-500" />
                        最佳成交机会 (Counterparty)
                      </h4>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {queue.length > 0 ? (
                        queue.map((q: any) => {
                          return (
                            <div
                              key={q.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-white border border-indigo-50 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                              onClick={() => fillOrder(q)}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <div className="flex items-center gap-4 pl-2">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    !q.is_buy
                                      ? "bg-red-100 text-red-600"
                                      : "bg-green-100 text-green-600"
                                  }`}
                                >
                                  {!q.is_buy ? (
                                    <TrendingDown className="w-4 h-4" />
                                  ) : (
                                    <TrendingUp className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-gray-800">
                                    {Number(q.remaining)} 份
                                  </div>
                                  <div className="text-xs text-gray-400 font-mono">
                                    Maker: {q.maker_address.slice(0, 4)}...
                                    {q.maker_address.slice(-4)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-xs text-gray-400">
                                    价格
                                  </div>
                                  <div className="font-mono font-bold text-indigo-600">
                                    {Number(
                                      ethers.formatUnits(BigInt(q.price), 6)
                                    ).toFixed(4)}
                                  </div>
                                </div>
                                <button className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 shadow-lg shadow-indigo-200">
                                  成交
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-10 text-center bg-white/50 rounded-xl border border-dashed border-indigo-100">
                          <div className="inline-flex p-3 bg-white rounded-full mb-3 shadow-sm">
                            <ListFilter className="w-6 h-6 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-400 font-medium">
                            暂无匹配队列
                          </p>
                          <p className="text-xs text-gray-300 mt-1">
                            您可以创建新订单等待成交
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. 订单详情 */}
                  <div className="space-y-6">
                    {/* 订单类型 */}
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <Type className="w-4 h-4 text-indigo-500" />
                        订单类型
                      </label>
                      <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                          onClick={() => setOrderMode("limit")}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                            orderMode === "limit"
                              ? "bg-white text-indigo-600 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          限价单 (Limit)
                        </button>
                        <button
                          onClick={() => setOrderMode("best")}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                            orderMode === "best"
                              ? "bg-white text-indigo-600 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          市价单 (Market)
                        </button>
                      </div>
                    </div>

                    {/* 价格与数量 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 ml-1 flex items-center gap-1">
                          <CircleDollarSign className="w-3 h-3" />
                          价格 (USDC)
                        </label>
                        <div className="relative group">
                          <input
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-4 pr-14 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-mono font-medium group-hover:border-indigo-300"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                            USDC
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 ml-1 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          数量 (份)
                        </label>
                        <div className="relative group">
                          <input
                            value={amountInput}
                            onChange={(e) => setAmountInput(e.target.value)}
                            placeholder="0"
                            className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-mono font-medium group-hover:border-indigo-300"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                            QTY
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-xs font-bold text-gray-500 ml-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          订单有效期 (秒)
                        </label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <Clock className="w-4 h-4 text-gray-400" />
                          </div>
                          <input
                            value={expiryInput}
                            onChange={(e) => setExpiryInput(e.target.value)}
                            placeholder="默认不过期 (可选)"
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all group-hover:border-indigo-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 快捷数量 */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {["1", "5", "10", "50", "100", "500"].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setAmountInput(amt)}
                          className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm whitespace-nowrap"
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 交易概览 */}
                  <div className="bg-gradient-to-br from-white/80 to-indigo-50/50 rounded-2xl p-5 border border-indigo-100/80 space-y-4 text-sm shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        交易预览
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">
                          当前最佳买价
                        </span>
                        <span className="font-mono text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">
                          {bestBid
                            ? Number(
                                ethers.formatUnits(BigInt(bestBid), 6)
                              ).toFixed(4)
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">
                          当前最佳卖价
                        </span>
                        <span className="font-mono text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                          {bestAsk
                            ? Number(
                                ethers.formatUnits(BigInt(bestAsk), 6)
                              ).toFixed(4)
                            : "-"}
                        </span>
                      </div>
                      <div className="h-px bg-indigo-50 my-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">
                          预估总额
                        </span>
                        <span className="font-bold text-indigo-600 text-lg">
                          {priceInput && amountInput
                            ? (
                                Number(priceInput) * Number(amountInput)
                              ).toFixed(4)
                            : "0.00"}{" "}
                          <span className="text-xs text-gray-400 font-normal">
                            USDC
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">
                          隐含胜率
                        </span>
                        <span className="font-bold text-purple-600">
                          {priceInput
                            ? (Number(priceInput) * 100).toFixed(2)
                            : midPrice
                            ? (
                                Number(
                                  ethers.formatUnits(BigInt(midPrice), 6)
                                ) * 100
                              ).toFixed(2)
                            : "-"}
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 提交按钮 */}
                  <button
                    onClick={submitOrder}
                    disabled={orderSubmitting}
                    className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-purple-200 hover:shadow-purple-300 transform active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 ${
                      orderSubmitting
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    }`}
                  >
                    {orderSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>处理中...</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5" />
                        <span>提交订单</span>
                      </>
                    )}
                  </button>

                  {orderMsg && (
                    <div
                      className={`mt-3 p-3 rounded-xl text-sm ${
                        orderMsg.includes("成功") ||
                        orderMsg.includes("Success")
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : "bg-red-50 text-red-700 border border-red-100"
                      }`}
                    >
                      {orderMsg}
                    </div>
                  )}
                </div>

                {/* 右侧：盘口与订单 */}
                <div className="lg:col-span-5 space-y-6">
                  {/* 深度图 */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white/60 backdrop-blur-md rounded-[1.5rem] p-5 border border-white/50 shadow-sm hover:shadow-md transition-shadow duration-300"
                  >
                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                        盘口深度 ({outcomeLabel(tradeOutcome)})
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg uppercase tracking-wide">
                        Click to fill
                      </span>
                    </h4>

                    <div className="space-y-1">
                      {/* 卖单 (Sell Orders) - 红色 - 倒序显示 */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-[10px] text-gray-400 px-2 mb-1 font-medium uppercase tracking-wider">
                          <span>Price</span>
                          <span>Size</span>
                        </div>
                        {depthSell.length === 0 && (
                          <div className="text-center py-6 text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                            暂无卖单
                          </div>
                        )}
                        {depthSell
                          .slice()
                          .reverse()
                          .map((d, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedPrice(d.price);
                                setPriceInput(
                                  Number(
                                    ethers.formatUnits(BigInt(d.price), 6)
                                  ).toFixed(6)
                                );
                              }}
                              className="w-full flex justify-between items-center text-xs p-2 rounded-lg hover:bg-red-50 transition-all duration-200 group relative overflow-hidden"
                            >
                              {/* 深度条背景 */}
                              <div
                                className="absolute right-0 top-0 bottom-0 bg-red-100/40 transition-all duration-300"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (Number(d.qty) / 10) * 100
                                  )}%`,
                                }}
                              ></div>

                              <span className="text-red-600 font-mono font-bold relative z-10 group-hover:scale-105 transition-transform">
                                {Number(
                                  ethers.formatUnits(BigInt(d.price), 6)
                                ).toFixed(4)}
                              </span>
                              <div className="flex items-center gap-2 relative z-10">
                                <span className="text-gray-500 font-mono font-medium group-hover:text-gray-700">
                                  {d.qty}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>

                      <div className="flex items-center gap-4 my-3">
                        <div className="h-px bg-gray-100 flex-1"></div>
                        <div className="text-[10px] font-bold text-gray-300">
                          SPREAD
                        </div>
                        <div className="h-px bg-gray-100 flex-1"></div>
                      </div>

                      {/* 买单 (Buy Orders) - 绿色 */}
                      <div className="space-y-1">
                        {depthBuy.length === 0 && (
                          <div className="text-center py-6 text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                            暂无买单
                          </div>
                        )}
                        {depthBuy.map((d, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedPrice(d.price);
                              setPriceInput(
                                Number(
                                  ethers.formatUnits(BigInt(d.price), 6)
                                ).toFixed(6)
                              );
                            }}
                            className="w-full flex justify-between items-center text-xs p-2 rounded-lg hover:bg-green-50 transition-all duration-200 group relative overflow-hidden"
                          >
                            {/* 深度条背景 */}
                            <div
                              className="absolute right-0 top-0 bottom-0 bg-green-100/40 transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (Number(d.qty) / 10) * 100
                                )}%`,
                              }}
                            ></div>

                            <span className="text-green-600 font-mono font-bold relative z-10 group-hover:scale-105 transition-transform">
                              {Number(
                                ethers.formatUnits(BigInt(d.price), 6)
                              ).toFixed(4)}
                            </span>
                            <div className="flex items-center gap-2 relative z-10">
                              <span className="text-gray-500 font-mono font-medium group-hover:text-gray-700">
                                {d.qty}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* 我的挂单 */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="bg-white/60 backdrop-blur-md rounded-[1.5rem] border border-white/50 shadow-sm p-5 hover:shadow-md transition-shadow duration-300"
                  >
                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-indigo-500" />
                      我的当前挂单
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {openOrders.length === 0 ? (
                        <div className="text-center py-8 text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-gray-300" />
                          </div>
                          暂无挂单
                        </div>
                      ) : (
                        openOrders.map((r) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={r.id}
                            className="flex items-center justify-between text-xs p-3 rounded-xl bg-white/80 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            <div className="text-gray-900">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm uppercase tracking-wider ${
                                    r.is_buy
                                      ? "bg-green-100 text-green-700 border border-green-200"
                                      : "bg-red-100 text-red-700 border border-red-200"
                                  }`}
                                >
                                  {r.is_buy ? "BUY" : "SELL"}
                                </span>
                                <span className="font-bold text-gray-700">
                                  {outcomeLabel(Number(r.outcome_index))}
                                </span>
                              </div>
                              <div className="font-mono text-gray-500 flex items-center gap-2">
                                <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-gray-600 font-bold">
                                  {Number(
                                    ethers.formatUnits(BigInt(r.price), 6)
                                  ).toFixed(4)}
                                </span>
                                <span className="text-gray-300">/</span>
                                <span className="font-medium">
                                  剩余: {String(r.remaining)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => cancelOrderSalt(r)}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent transition-all duration-200 text-xs font-bold"
                            >
                              撤单
                            </button>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="mt-8">
            <ChatPanel eventId={Number(params.id)} />
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={handleGuideClick}
                className={`inline-flex items-center gap-2 h-11 px-5 rounded-2xl font-medium text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-300 ${
                  guideVariant === "A"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                    : "bg-gradient-to-r from-sky-500 to-emerald-500 text-white hover:from-sky-600 hover:to-emerald-600"
                } ${guideLoading ? "opacity-80 cursor-wait" : ""}`}
                aria-label="前往论坛聊天室"
                title="前往论坛聊天室"
                style={{ minWidth: 176 }}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[14px]">前往论坛聊天室</span>
                <ArrowRightCircle className="w-5 h-5" />
              </button>
            </div>
            {guideError && (
              <div className="mt-2 text-center text-xs text-red-600">
                {guideError}
              </div>
            )}
          </div>
        </div>
        {/* 悬浮回到顶部按钮 */}
        <button
          type="button"
          aria-label="回到顶部"
          title="回到顶部"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className={`${
            showScrollTop
              ? "opacity-100 scale-100"
              : "opacity-0 scale-0 pointer-events-none"
          } fixed bottom-8 right-8 z-50 w-10 h-10 bg-gradient-to-br from-white/90 to-pink-100/90 rounded-full shadow-lg border border-pink-200/50 backdrop-blur-sm overflow-hidden group hover:scale-110 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-300`}
        >
          {/* 背景质感效果 */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-pink-100/40 group-hover:from-white/60 group-hover:to-pink-100/60 transition-all duration-300"></div>

          {/* 箭头图标 */}
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <div className="animate-bounce">
              <ArrowUp className="w-5 h-5 text-gray-700" />
            </div>
          </div>

          {/* 悬浮提示 */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            返回顶部
          </div>
        </button>
      </div>
    </div>
  );
}
