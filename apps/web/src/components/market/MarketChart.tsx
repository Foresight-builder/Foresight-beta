import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { PredictionDetail } from "@/app/prediction/[id]/_lib/types";
import { Maximize2, Minimize2 } from "lucide-react";
import { useTranslations } from "@/lib/i18n";
import { useOrderBookStats } from "@/hooks/useMarketWebSocket";
import { formatNumber } from "@/lib/format";

// 动态导入 KlineChart，禁用 SSR
const KlineChart = dynamic(() => import("@/components/KlineChart"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  ),
});

interface MarketChartProps {
  market: {
    market: string;
    chain_id: number;
  } | null;
  prediction: PredictionDetail;
  tradeOutcome: number;
  outcomes: MarketOutcome[];
  setTradeOutcome: (idx: number) => void;
  marketKey?: string;
}

type MarketOutcome = {
  label?: string;
  color?: string;
};

function priceToProbabilityPercent(price: number | string | null | undefined): number {
  if (price == null) return 0;
  const num = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(num)) return 0;
  const pct = num * 100;
  if (!Number.isFinite(pct)) return 0;
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}

export function MarketChart({
  market,
  prediction,
  tradeOutcome,
  outcomes,
  setTradeOutcome,
  marketKey,
}: MarketChartProps) {
  const [expanded, setExpanded] = useState(false);
  const [resolution, setResolution] = useState<"1m" | "5m" | "15m" | "1h" | "4h" | "1d">("15m");
  const [chartType, setChartType] = useState<"candlestick" | "line" | "area">("candlestick");
  const tMarket = useTranslations("market");
  const tCommon = useTranslations("common");
  const { stats } = useOrderBookStats(marketKey, tradeOutcome);
  const lastPrice = stats?.lastTradePrice || null;
  const volume24h = stats?.volume24h || "0";
  const lastProbability = lastPrice != null ? priceToProbabilityPercent(lastPrice) : null;
  const bestBid = stats?.bestBid || null;
  const bestAsk = stats?.bestAsk || null;
  const spread = stats?.spread || null;
  const high24h = stats?.high24h || null;
  const low24h = stats?.low24h || null;
  const avg24h = stats?.avg24h || null;
  const trades24h = stats?.trades24h || "0";

  // 如果没有市场合约信息，展示占位
  if (!market) {
    return (
      <div className="h-[400px] w-full bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-gray-400 gap-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-blue-50/50 opacity-50"></div>
        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center z-10">
          <Maximize2 className="w-5 h-5 opacity-50 text-purple-400" />
        </div>
        <span className="z-10 font-medium text-gray-500">{tMarket("chart.loading")}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden transition-all duration-300 ${
        expanded ? "fixed inset-4 z-50 bg-white border-gray-200 shadow-2xl" : "h-[450px]"
      }`}
    >
      {/* Chart Header Controls */}
      <div className="flex flex-col border-b border-gray-100 bg-gradient-to-r from-purple-50/30 via-white to-blue-50/30">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {outcomes.length > 0 ? (
              outcomes.map((outcome, idx) => (
                <button
                  key={idx}
                  onClick={() => setTradeOutcome(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                    tradeOutcome === idx
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-200 transform scale-105"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-purple-200 hover:text-purple-600 transform hover:scale-105"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${tradeOutcome === idx ? "bg-white shadow-sm" : ""}`}
                    style={{
                      backgroundColor:
                        tradeOutcome === idx
                          ? undefined
                          : outcome.color || (idx === 0 ? "#10b981" : "#ef4444"),
                    }}
                  />
                  {outcome.label ||
                    tMarket("chart.outcomeFallback").replace("{index}", String(idx + 1))}
                </button>
              ))
            ) : (
              // Binary Fallback
              <>
                <button
                  onClick={() => setTradeOutcome(0)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                    tradeOutcome === 0
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-200 transform scale-105"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-emerald-200 hover:text-emerald-600 transform hover:scale-105"
                  }`}
                >
                  {tCommon("yes")}
                </button>
                <button
                  onClick={() => setTradeOutcome(1)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                    tradeOutcome === 1
                      ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-200 transform scale-105"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-rose-200 hover:text-rose-600 transform hover:scale-105"
                  }`}
                >
                  {tCommon("no")}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Chart Type Switcher */}
            <div className="flex rounded-full border border-gray-200 bg-white p-0.5 text-[11px]">
              {[
                { type: "candlestick", label: tMarket("chart.candlestick") || "C" },
                { type: "line", label: tMarket("chart.line") || "L" },
                { type: "area", label: tMarket("chart.area") || "A" },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type as typeof chartType)}
                  className={`px-2 py-0.5 rounded-full font-semibold transition-colors duration-300 ${
                    chartType === type
                      ? "bg-purple-600 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Time Resolution */}
            <div className="flex rounded-full border border-gray-200 bg-white p-0.5 text-[11px]">
              {["1m", "5m", "15m", "1h", "4h", "1d"].map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r as typeof resolution)}
                  className={`px-2 py-0.5 rounded-full font-semibold transition-colors duration-300 ${
                    resolution === r
                      ? "bg-purple-600 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Expand Button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-300 transform hover:scale-110"
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 24h Market Stats */}
        <div className="px-4 py-2 border-t border-gray-100 bg-white/50 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
            {/* Last Price */}
            {lastPrice != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-semibold">
                  {tMarket("chart.lastPriceLabel")}:
                </span>
                <span className="text-gray-900 font-bold">{formatNumber(Number(lastPrice))}</span>
                {lastProbability != null && (
                  <span className="text-gray-600">({lastProbability.toFixed(1)}%)</span>
                )}
              </div>
            )}

            {/* 24h High/Low */}
            {high24h != null && low24h != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-semibold">
                  {tMarket("chart.highLow24hLabel")}:
                </span>
                <span className="text-emerald-600 font-bold">{formatNumber(Number(high24h))}</span>
                <span className="text-gray-400">/</span>
                <span className="text-rose-600 font-bold">{formatNumber(Number(low24h))}</span>
              </div>
            )}

            {/* 24h Average */}
            {avg24h != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-semibold">{tMarket("chart.avg24hLabel")}:</span>
                <span className="text-blue-600 font-bold">{formatNumber(Number(avg24h))}</span>
              </div>
            )}

            {/* 24h Volume */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-semibold">
                {tMarket("chart.volume24hLabel")}:
              </span>
              <span className="text-purple-600 font-bold">{formatNumber(Number(volume24h))}</span>
            </div>

            {/* 24h Trades Count */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-semibold">
                {tMarket("chart.trades24hLabel")}:
              </span>
              <span className="text-gray-900 font-bold">{formatNumber(Number(trades24h))}</span>
            </div>

            {/* Bid/Ask Spread */}
            {bestBid != null && bestAsk != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-semibold">{tMarket("chart.bidAskLabel")}:</span>
                <span className="text-emerald-600 font-bold">{formatNumber(Number(bestBid))}</span>
                <span className="text-gray-400">/</span>
                <span className="text-rose-600 font-bold">{formatNumber(Number(bestAsk))}</span>
                {spread != null && (
                  <span className="text-yellow-600">({formatNumber(Number(spread))} spread)</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Body */}
      <div className="flex-1 w-full h-full min-h-0 bg-white">
        <KlineChart
          market={market.market}
          chainId={market.chain_id}
          outcomeIndex={tradeOutcome}
          resolution={resolution}
          marketKey={marketKey}
          chartType={chartType}
        />
      </div>
    </div>
  );
}
