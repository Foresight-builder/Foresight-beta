"use client";

import { usePredictionDetail } from "./usePredictionDetail";
import Link from "next/link";
import { MarketHeader } from "@/components/market/MarketHeader";
import { MarketChart } from "@/components/market/MarketChart";
import { TradingPanel } from "@/components/market/TradingPanel";
import { MarketInfo } from "@/components/market/MarketInfo";
import { OutcomeList } from "@/components/market/OutcomeList";
import { Loader2 } from "lucide-react";
import { usePredictions } from "@/hooks/useQueries";
import { getFallbackEventImage } from "@/features/trending/trendingModel";
import ForumSection from "@/components/ForumSection";

type PredictionDetailClientProps = {
  relatedProposalId?: number | null;
};

function buildJsonLd(prediction: any) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";
  const url = `${baseUrl}/prediction/${prediction.id}`;
  const imageUrl = prediction.image_url || `${baseUrl}/og-image.png`;
  const description =
    prediction.description ||
    prediction.criteria ||
    "链上预测市场事件，参与交易观点，基于区块链的去中心化预测市场平台。";
  const createdTime = prediction.createdAt || prediction.created_at;
  const updatedTime = prediction.updatedAt || prediction.updated_at || createdTime;
  const deadline = prediction.deadline;

  const article: any = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: prediction.title || "Foresight 预测市场事件",
    description,
    image: [imageUrl],
    url,
    mainEntityOfPage: url,
    inLanguage: "zh-CN",
    publisher: {
      "@type": "Organization",
      name: "Foresight",
      url: baseUrl,
    },
  };

  if (prediction.category) {
    article.articleSection = prediction.category;
  }

  if (createdTime) {
    article.datePublished = createdTime;
  }

  if (updatedTime) {
    article.dateModified = updatedTime;
  }

  if (deadline) {
    article.expires = deadline;
  }

  return article;
}

function buildBreadcrumbJsonLd(prediction: any) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "首页",
      item: baseUrl + "/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "热门预测",
      item: baseUrl + "/trending",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: prediction.title || "预测详情",
      item: `${baseUrl}/prediction/${prediction.id}`,
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export default function PredictionDetailClient({ relatedProposalId }: PredictionDetailClientProps) {
  const {
    loading,
    error,
    prediction,
    market,
    account,
    followersCount,
    following,
    toggleFollow,
    followLoading,
    followError,
    tradeSide,
    setTradeSide,
    tradeOutcome,
    setTradeOutcome,
    priceInput,
    setPriceInput,
    amountInput,
    setAmountInput,
    orderMode,
    setOrderMode,
    isSubmitting,
    orderMsg,
    depthBuy,
    depthSell,
    bestBid,
    bestAsk,
    openOrders,
    trades,
    balance,
    mintInput,
    setMintInput,
    handleMint,
    handleRedeem,
    submitOrder,
    cancelOrder,
  } = usePredictionDetail();

  const relatedCategory = prediction?.category;
  const { data: relatedPredictions } = usePredictions(
    { category: relatedCategory, status: "active", limit: 6 },
    undefined
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        {error || "未找到预测事件"}
      </div>
    );
  }

  const outcomes = prediction.outcomes || [];
  const relatedList =
    (relatedPredictions || [])
      .filter((item: any) => item.id !== prediction.id)
      .sort((a: any, b: any) => {
        const aVol = Number(a?.stats?.totalAmount || 0);
        const bVol = Number(b?.stats?.totalAmount || 0);
        if (aVol !== bVol) return bVol - aVol;
        const aFollowers = Number(a?.followers_count || 0);
        const bFollowers = Number(b?.followers_count || 0);
        if (aFollowers !== bFollowers) return bFollowers - aFollowers;
        const aCreated = new Date(a?.created_at || 0).getTime();
        const bCreated = new Date(b?.created_at || 0).getTime();
        return bCreated - aCreated;
      }) || [];
  const hasRelated = relatedList.length > 0;

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans pb-20 relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(prediction)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbJsonLd(prediction)),
        }}
      />
      {/* Colorful Blobs Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-pink-200/40 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-4000"></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-emerald-100/40 rounded-full blur-[100px] mix-blend-multiply animate-blob animation-delay-6000"></div>
      </div>

      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none opacity-30 z-0"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10">
        <div className="mb-8">
          <MarketHeader
            prediction={prediction}
            followersCount={followersCount}
            following={following}
            onFollow={toggleFollow}
            followLoading={followLoading}
            followError={followError}
          />
        </div>

        <div className="mb-4 text-xs text-gray-500 flex flex-wrap items-center gap-1">
          <Link href="/" className="hover:text-purple-600 hover:underline">
            首页
          </Link>
          <span>/</span>
          <Link href="/trending" className="hover:text-purple-600 hover:underline">
            热门预测
          </Link>
          <span>/</span>
          <span className="text-gray-700 max-w-[260px] sm:max-w-[420px] truncate">
            {prediction.title}
          </span>
        </div>

        <div className="mb-4 bg-white/80 border border-purple-100 rounded-3xl p-5 shadow-sm max-w-3xl">
          <p className="text-sm text-gray-700 leading-relaxed mb-2">
            在这个预测市场中，你可以通过买入不同选项来交易自己对事件结果的看法，价格代表市场对事件发生概率的共识。
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mb-2">
            右侧交易面板用于下单和管理仓位，下面的图表和盘口数据可以帮助你观察市场情绪和价格变化。
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            想浏览更多事件？前往{" "}
            <Link
              href="/trending"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              热门预测
            </Link>{" "}
            页面，或在{" "}
            <Link href="/forum" className="text-purple-600 hover:text-purple-700 hover:underline">
              讨论区
            </Link>{" "}
            分享你的观点和交易策略。
          </p>
        </div>

        {relatedProposalId && (
          <div className="mb-8 max-w-3xl rounded-3xl border border-emerald-100 bg-emerald-50/80 px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-emerald-800">
              该预测市场源自社区在提案广场中的讨论，你可以回到原始提案继续交流设计思路和后续迭代建议。
            </p>
            <Link
              href={`/proposals/${relatedProposalId}`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors whitespace-nowrap"
            >
              查看对应提案
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 2. Main Content (Left, 8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Chart */}
            <MarketChart
              market={market}
              prediction={prediction}
              tradeOutcome={tradeOutcome}
              setTradeOutcome={setTradeOutcome}
              outcomes={outcomes}
            />

            {/* Outcomes List */}
            <OutcomeList
              prediction={prediction}
              selectedOutcome={tradeOutcome}
              onSelectOutcome={setTradeOutcome}
              onTrade={(side, idx) => {
                setTradeSide(side);
                setTradeOutcome(idx);
              }}
            />

            {/* Info Tabs & Content */}
            <MarketInfo prediction={prediction} />

            <div className="bg-white/80 border border-purple-100 rounded-3xl p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-3">社区讨论</h2>
              <p className="text-xs text-gray-500 mb-4">
                围绕这个预测市场的观点、研究和策略会集中出现在下面的讨论区中，你也可以发起新的话题或参与现有讨论。
              </p>
              <ForumSection eventId={prediction.id} />
            </div>
          </div>

          {/* 3. Trading Panel (Right, 4 cols) */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <TradingPanel
                data={{
                  market,
                  prediction,
                  bestBid,
                  bestAsk,
                  balance,
                  depthBuy,
                  depthSell,
                  userOrders: openOrders,
                  trades,
                  outcomes,
                }}
                state={{
                  tradeSide,
                  tradeOutcome,
                  priceInput,
                  amountInput,
                  orderMode,
                  isSubmitting,
                  orderMsg,
                }}
                handlers={{
                  setTradeSide,
                  setTradeOutcome,
                  setPriceInput,
                  setAmountInput,
                  setOrderMode,
                  submitOrder,
                  cancelOrder,
                  handleMint,
                  handleRedeem,
                  setMintInput,
                }}
              />
            </div>
          </div>
        </div>

        {hasRelated && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">你可能还感兴趣的预测</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedList.slice(0, 6).map((item: any) => {
                const image =
                  item.image_url || getFallbackEventImage(String(item.title || "预测事件"));
                const totalAmount = Number(item?.stats?.totalAmount || 0);
                const participantCount = Number(item?.stats?.participantCount || 0);
                return (
                  <Link
                    key={item.id}
                    href={`/prediction/${item.id}`}
                    className="group rounded-2xl bg-white/80 border border-purple-100 shadow-sm overflow-hidden hover:border-purple-300 hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="relative h-32 overflow-hidden bg-gray-100">
                      <img
                        src={image}
                        alt={String(item.title || "预测事件")}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="text-xs text-purple-600 font-medium mb-1 line-clamp-1">
                        {item.category || "其他"}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-700">
                        {item.title}
                      </div>
                      <div className="mt-auto flex items-center justify-between text-[11px] text-gray-500">
                        <span>交易额 {totalAmount.toFixed(2)} USDC</span>
                        <span>参与人数 {participantCount}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
