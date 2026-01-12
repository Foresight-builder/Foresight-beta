"use client";

import {
  ArrowRight,
  Clock,
  TrendingUp,
  Wallet,
  Trophy,
  Activity,
  CheckCircle2,
  Circle,
} from "lucide-react";
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

  const hasAnyPosition = (positionsCount || activeCount) > 0;
  const tasks = [
    {
      id: "firstPrediction",
      label: tProfile("predictions.empty.description"),
      done: hasAnyPosition,
    },
    {
      id: "exploreMore",
      label: tProfile("history.empty.description"),
      done: hasAnyPosition,
    },
    {
      id: "discoverFollows",
      label: tProfile("following.empty.description"),
      done: false,
    },
  ] as const;

  const completedCount = tasks.filter((task) => task.done).length;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-8 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
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
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-4 h-4 text-purple-500" />
            <span>
              {formatTranslation(tProfile("overview.cards.eventsSummary"), {
                count: positionsCount || activeCount,
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <span
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{
                  width: `${Math.min(100, (completedCount / tasks.length) * 100)}%`,
                }}
              />
            </span>
            <span>
              {completedCount}/{tasks.length}
            </span>
          </div>
        </div>
      </div>

      <div>
        <ProfileCard className="overflow-hidden">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors flex items-center gap-4"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  task.done ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-300"
                }`}
              >
                {task.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-400 mb-0.5">{index + 1}</div>
                <div className="text-sm font-medium text-gray-900">{task.label}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </div>
          ))}
        </ProfileCard>
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
