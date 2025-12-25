"use client";

import React from "react";
import { ArrowRight, Clock, TrendingUp, Wallet, Trophy, Activity } from "lucide-react";
import { useTranslations, formatTranslation } from "@/lib/i18n";
import type { PortfolioStats } from "../types";
import { ProfileCard } from "./ProfileUI";

export function OverviewTab({
  portfolioStats,
  positionsCount,
}: {
  portfolioStats: PortfolioStats | null;
  positionsCount: number;
}) {
  const totalInvested = portfolioStats?.total_invested ?? 0;
  const realizedPnl = portfolioStats?.realized_pnl ?? 0;
  const winRate = portfolioStats?.win_rate ?? "0%";
  const winRateValue =
    Number(String(winRate).replace("%", "")) >= 0
      ? Number(String(winRate).replace("%", "")) || 0
      : 0;
  const clampedWinRate = Math.max(0, Math.min(100, winRateValue));
  const activeCount = portfolioStats?.active_count ?? 0;
  const tProfile = useTranslations("profile");

  return (
    <div className="space-y-8">
      {/* Minimalist Financial Dashboard Row */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-8 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Total Invested */}
          <div className="flex-1 px-4 first:pl-0 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {tProfile("overview.cards.totalInvested")}
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                ${totalInvested.toFixed(2)}
              </div>
            </div>
          </div>

          {/* PnL */}
          <div className="flex-1 px-4 flex items-center gap-4 pt-6 md:pt-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                realizedPnl >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}
            >
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {tProfile("overview.cards.totalPnl")}
              </div>
              <div
                className={`text-3xl font-black tracking-tight ${
                  realizedPnl >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {realizedPnl >= 0 ? "+" : ""}
                {realizedPnl.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Win Rate */}
          <div className="flex-1 px-4 flex items-center gap-4 pt-6 md:pt-0">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {tProfile("overview.cards.winRate")}
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{winRate}</div>
            </div>
          </div>

          {/* Events Count */}
          <div className="flex-1 px-4 last:pr-0 flex items-center gap-4 pt-6 md:pt-0">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {tProfile("overview.cards.eventsCount")}
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {positionsCount || activeCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-500" />
          {tProfile("overview.activity.title")}
        </h3>
        <ProfileCard className="overflow-hidden">
          {[1, 2, 3].map((_, i) => (
            <div
              key={i}
              className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs">
                {i === 0
                  ? tProfile("overview.activity.type.buy")
                  : i === 1
                    ? tProfile("overview.activity.type.settle")
                    : tProfile("overview.activity.type.view")}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-900">
                  {i === 0
                    ? tProfile("overview.activity.item.buy")
                    : i === 1
                      ? tProfile("overview.activity.item.settle")
                      : tProfile("overview.activity.item.view")}
                </div>
                <div className="text-xs text-gray-400">
                  {tProfile("overview.activity.timeExample")}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </div>
          ))}
        </ProfileCard>
      </div>
    </div>
  );
}
